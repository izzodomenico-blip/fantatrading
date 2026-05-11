import { NormalizedQuoteRow } from '../importers/realQuotesImporter';
import { calculatePrizeDistribution } from '../engine/prizePoolEngine';
import { DEFAULT_PRIZE_TABLE } from '../config/prizeTables';
import { createSeededRng } from '../utils/randomUtils';

// ─── Modelli regolamento ──────────────────────────────────────────────────────

export interface BacktestModel {
  id: string;
  name: string;
  description: string;
  buyCommissionRate: number;
  sellCommissionRate: number;
  prizePoolContributionRate: number;
  platformFeeRate: number;
  registrationFeePerTeam: number;
  /** Quota della registration fee che va alla piattaforma */
  registrationFeePlatformRate: number;
}

export const BACKTEST_MODELS: BacktestModel[] = [
  {
    id: 'M1', name: 'Originale Puro',
    description: '2%/1.25%, tutto al montepremi, quota 50 crediti',
    buyCommissionRate: 0.02, sellCommissionRate: 0.0125,
    prizePoolContributionRate: 1.0, platformFeeRate: 0.0,
    registrationFeePerTeam: 50, registrationFeePlatformRate: 0.0,
  },
  {
    id: 'M2', name: 'Originale + 10% Margine',
    description: '2%/1.25%, 10% commissioni alla piattaforma, quota 50 crediti',
    buyCommissionRate: 0.02, sellCommissionRate: 0.0125,
    prizePoolContributionRate: 0.9, platformFeeRate: 0.1,
    registrationFeePerTeam: 50, registrationFeePlatformRate: 0.1,
  },
  {
    id: 'M3', name: 'Originale + 20% Margine',
    description: '2%/1.25%, 20% commissioni alla piattaforma, quota 50 crediti',
    buyCommissionRate: 0.02, sellCommissionRate: 0.0125,
    prizePoolContributionRate: 0.8, platformFeeRate: 0.2,
    registrationFeePerTeam: 50, registrationFeePlatformRate: 0.2,
  },
  {
    id: 'M4', name: 'Quota 10 + Commissioni',
    description: '2%/1.25%, tutto al montepremi, quota 10 crediti (100% alla piattaforma)',
    buyCommissionRate: 0.02, sellCommissionRate: 0.0125,
    prizePoolContributionRate: 1.0, platformFeeRate: 0.0,
    registrationFeePerTeam: 10, registrationFeePlatformRate: 1.0,
  },
  {
    id: 'M5', name: 'Quota 10 + 10% Margine',
    description: '2%/1.25%, 10% commissioni alla piattaforma, quota 10 crediti (100% alla piattaforma)',
    buyCommissionRate: 0.02, sellCommissionRate: 0.0125,
    prizePoolContributionRate: 0.9, platformFeeRate: 0.1,
    registrationFeePerTeam: 10, registrationFeePlatformRate: 1.0,
  },
];

// ─── Configurazione ───────────────────────────────────────────────────────────

export interface BacktestConfig {
  numParticipants: number;
  numSimulations: number;
  randomSeed: number;
  /** Composizione rosa: ruolo → numero massimo calciatori distinti */
  rosterComposition: Record<string, number>;
}

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  numParticipants: 20,
  numSimulations: 200,
  randomSeed: 42,
  rosterComposition: { P: 3, D: 8, C: 8, A: 6 },
};

// ─── Tipi risultato ───────────────────────────────────────────────────────────

export interface PortfolioResult {
  playerIds: number[];
  buyCost: number;        // prezzo acquisto + commissione acquisto
  sellProceeds: number;   // valore finale − commissione vendita
  buyCommissions: number;
  sellCommissions: number;
  tradingPnL: number;     // sellProceeds − buyCost
  tradingROI: number;     // tradingPnL / buyCost × 100
}

export interface SeasonModelStats {
  season: string;
  seasonStatus: string;
  modelId: string;
  modelName: string;
  numParticipants: number;
  numSimulations: number;
  // ── Trading (uguale per tutti i modelli, commissioni 2%/1.25% fisse) ────────
  avgBuyCost: number;
  avgSellProceeds: number;
  avgTradingROI: number;
  medianTradingROI: number;
  pctPositiveTradingROI: number;
  pctAbove5TradingROI: number;
  // ── Lega (varia per modello) ──────────────────────────────────────────────
  avgPrizePool: number;
  avgPlatformRevenue: number;
  avgTopPrize: number;
  avgWinnerTotalROI: number;
  avgTotalROI: number;
  pctAbove0TotalROI: number;
  pctAbove5TotalROI: number;
}

export interface AggregateModelStats {
  modelId: string;
  modelName: string;
  numSeasons: number;
  avgTradingROI: number;
  avgWinnerTotalROI: number;
  avgTotalROI: number;
  pctAbove0TotalROI: number;
  avgPrizePool: number;
  avgPlatformRevenue: number;
  seasonAvgTradingROIs: Record<string, number>;
}

export interface BacktestReport {
  generatedAt: string;
  config: BacktestConfig;
  completedSeasons: SeasonModelStats[];
  inProgressStats: SeasonModelStats[] | null;
  aggregateByModel: AggregateModelStats[];
}

// ─── Utility statistiche ──────────────────────────────────────────────────────

function avg(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pct(values: number[], pred: (v: number) => boolean): number {
  return values.length === 0 ? 0 : (values.filter(pred).length / values.length) * 100;
}

export function calculateEffectiveTradingReturnPct(
  currentOrFinalQuote: number,
  initialQuote: number,
): { raw: number; effective: number } {
  const raw = (currentOrFinalQuote - initialQuote) * 5;
  return { raw, effective: Math.max(-100, raw) };
}

// ─── Costruzione portfolio ────────────────────────────────────────────────────

/**
 * Costruisce un portfolio buy-and-hold selezionando calciatori casualmente
 * rispettando la composizione per ruolo.
 * Commissioni fisse: acquisto 2%, vendita 1.25%.
 */
export function buildPortfolio(
  playersByRole: Record<string, NormalizedQuoteRow[]>,
  composition: Record<string, number>,
  rng: () => number,
): PortfolioResult {
  const BUY_RATE = 0.02;
  const SELL_RATE = 0.0125;

  const selected: NormalizedQuoteRow[] = [];

  for (const [role, count] of Object.entries(composition)) {
    const available = playersByRole[role] ?? [];
    if (available.length < count) {
      throw new Error(
        `Giocatori insufficienti per ruolo ${role}: richiesti ${count}, disponibili ${available.length}`
      );
    }
    // Fisher-Yates parziale — selezione senza rimpiazzo
    const pool = [...available];
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(rng() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    selected.push(...pool.slice(0, count));
  }

  let buyCost = 0, buyComms = 0, sellProceeds = 0, sellComms = 0;
  for (const p of selected) {
    // Regola FantaTrading: ogni punto quotazione = 5% del valore dell'azione
    // Il rendimento applicato non puo scendere sotto -100%, quindi sellValue >= 0.
    const { effective: quoteTradingReturnPctEffective } = calculateEffectiveTradingReturnPct(
      p.currentOrFinalQuote,
      p.initialQuote,
    );
    const sellValue = Math.max(0, p.initialQuote * (1 + quoteTradingReturnPctEffective / 100));
    const bc = p.initialQuote * BUY_RATE;
    const sc = sellValue * SELL_RATE;
    buyCost += p.initialQuote + bc;
    buyComms += bc;
    sellProceeds += sellValue - sc;
    sellComms += sc;
  }

  const tradingPnL = sellProceeds - buyCost;
  return {
    playerIds: selected.map(p => p.playerId),
    buyCost, sellProceeds,
    buyCommissions: buyComms, sellCommissions: sellComms,
    tradingPnL,
    tradingROI: buyCost > 0 ? (tradingPnL / buyCost) * 100 : 0,
  };
}

// ─── Simulazione lega (per un singolo modello) ────────────────────────────────

interface LeagueModelResult {
  prizePool: number;
  platformRevenue: number;
  topPrize: number;
  totalROIs: number[];
  winnerTotalROI: number;
}

function runLeagueWithModel(
  portfolios: PortfolioResult[],
  model: BacktestModel,
): LeagueModelResult {
  const N = portfolios.length;
  const totalComms = portfolios.reduce((s, p) => s + p.buyCommissions + p.sellCommissions, 0);
  const totalRegFees = N * model.registrationFeePerTeam;

  const prizePool =
    totalComms * model.prizePoolContributionRate +
    totalRegFees * (1 - model.registrationFeePlatformRate);
  const platformRevenue =
    totalComms * model.platformFeeRate +
    totalRegFees * model.registrationFeePlatformRate;

  // Ranking: chi ha il tradingPnL più alto vince
  const ranked = portfolios
    .map((p, i) => ({ idx: i, pnl: p.tradingPnL }))
    .sort((a, b) => b.pnl - a.pnl);

  const prizes = new Array<number>(N).fill(0);
  const prizeDistrib = calculatePrizeDistribution(prizePool, DEFAULT_PRIZE_TABLE);
  ranked.forEach((entry, rankIdx) => {
    prizes[entry.idx] = prizeDistrib.find(p => p.rank === rankIdx + 1)?.amount ?? 0;
  });

  const totalROIs = portfolios.map((p, i) => {
    const invested = p.buyCost + model.registrationFeePerTeam;
    const net = p.tradingPnL + prizes[i] - model.registrationFeePerTeam;
    return invested > 0 ? (net / invested) * 100 : 0;
  });

  return {
    prizePool, platformRevenue,
    topPrize: prizes[ranked[0].idx],
    totalROIs,
    winnerTotalROI: totalROIs[ranked[0].idx],
  };
}

// ─── Backtest per stagione ────────────────────────────────────────────────────

export function runSeasonBacktest(
  seasonRows: NormalizedQuoteRow[],
  models: BacktestModel[],
  config: BacktestConfig,
): SeasonModelStats[] {
  const season = seasonRows[0]?.season ?? 'unknown';
  const seasonStatus = seasonRows[0]?.seasonStatus ?? 'completed';

  // Raggruppa per ruolo, escludendo quotazioni iniziali zero (dati non validi)
  const playersByRole: Record<string, NormalizedQuoteRow[]> = {};
  for (const row of seasonRows) {
    if (row.initialQuote <= 0) continue;
    if (!playersByRole[row.role]) playersByRole[row.role] = [];
    playersByRole[row.role].push(row);
  }

  // Valida disponibilità minima
  for (const [role, count] of Object.entries(config.rosterComposition)) {
    const available = playersByRole[role]?.length ?? 0;
    if (available < count) {
      throw new Error(
        `Stagione ${season}: ruolo ${role} insufficiente (richiesti ${count}, disponibili ${available})`
      );
    }
  }

  // Costruisce tutti i portfolio una sola volta (commissioni identiche per tutti i modelli)
  const rng = createSeededRng(config.randomSeed);
  const allSimPortfolios: PortfolioResult[][] = [];

  for (let sim = 0; sim < config.numSimulations; sim++) {
    const simPortfolios: PortfolioResult[] = [];
    for (let p = 0; p < config.numParticipants; p++) {
      simPortfolios.push(buildPortfolio(playersByRole, config.rosterComposition, rng));
    }
    allSimPortfolios.push(simPortfolios);
  }

  // Statistiche trading indipendenti dal modello
  const allTradingROIs = allSimPortfolios.flatMap(s => s.map(p => p.tradingROI));
  const allBuyCosts = allSimPortfolios.flatMap(s => s.map(p => p.buyCost));
  const allSellProceeds = allSimPortfolios.flatMap(s => s.map(p => p.sellProceeds));

  const tradingStats = {
    avgBuyCost: avg(allBuyCosts),
    avgSellProceeds: avg(allSellProceeds),
    avgTradingROI: avg(allTradingROIs),
    medianTradingROI: median(allTradingROIs),
    pctPositiveTradingROI: pct(allTradingROIs, v => v > 0),
    pctAbove5TradingROI: pct(allTradingROIs, v => v > 5),
  };

  // Applica ogni modello agli stessi portfolio
  return models.map(model => {
    const prizePools: number[] = [];
    const platformRevs: number[] = [];
    const topPrizes: number[] = [];
    const winnerROIs: number[] = [];
    const allTotalROIs: number[] = [];

    for (const simPortfolios of allSimPortfolios) {
      const lr = runLeagueWithModel(simPortfolios, model);
      prizePools.push(lr.prizePool);
      platformRevs.push(lr.platformRevenue);
      topPrizes.push(lr.topPrize);
      winnerROIs.push(lr.winnerTotalROI);
      allTotalROIs.push(...lr.totalROIs);
    }

    return {
      season, seasonStatus,
      modelId: model.id, modelName: model.name,
      numParticipants: config.numParticipants,
      numSimulations: config.numSimulations,
      ...tradingStats,
      avgPrizePool: avg(prizePools),
      avgPlatformRevenue: avg(platformRevs),
      avgTopPrize: avg(topPrizes),
      avgWinnerTotalROI: avg(winnerROIs),
      avgTotalROI: avg(allTotalROIs),
      pctAbove0TotalROI: pct(allTotalROIs, v => v > 0),
      pctAbove5TotalROI: pct(allTotalROIs, v => v > 5),
    };
  });
}

// ─── Backtest completo ────────────────────────────────────────────────────────

export function runHistoricalBacktest(
  allRows: NormalizedQuoteRow[],
  config: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
  models: BacktestModel[] = BACKTEST_MODELS,
  onProgress?: (season: string, ms: number) => void,
): BacktestReport {
  const completedRows = allRows.filter(r => r.seasonStatus === 'completed');
  const inProgressRows = allRows.filter(r => r.seasonStatus === 'in_progress');

  const completedSeasonNames = [...new Set(completedRows.map(r => r.season))].sort();
  const allCompletedStats: SeasonModelStats[] = [];

  for (let si = 0; si < completedSeasonNames.length; si++) {
    const season = completedSeasonNames[si];
    const t0 = Date.now();
    const seasonRows = completedRows.filter(r => r.season === season);
    // Seed diverso per ogni stagione per evitare correlazioni
    const seasonStats = runSeasonBacktest(
      seasonRows, models,
      { ...config, randomSeed: config.randomSeed + si * 1000 },
    );
    allCompletedStats.push(...seasonStats);
    onProgress?.(season, Date.now() - t0);
  }

  // Stagione in corso
  let inProgressStats: SeasonModelStats[] | null = null;
  const inProgressSeasonNames = [...new Set(inProgressRows.map(r => r.season))];
  if (inProgressRows.length > 0) {
    const allInProgress: SeasonModelStats[] = [];
    for (let si = 0; si < inProgressSeasonNames.length; si++) {
      const season = inProgressSeasonNames[si];
      const seasonRows = inProgressRows.filter(r => r.season === season);
      const stats = runSeasonBacktest(
        seasonRows, models,
        { ...config, randomSeed: config.randomSeed + 9000 + si * 1000 },
      );
      allInProgress.push(...stats);
    }
    inProgressStats = allInProgress;
  }

  // Aggregate per modello (solo stagioni completate)
  const aggregateByModel: AggregateModelStats[] = models.map(model => {
    const ms = allCompletedStats.filter(s => s.modelId === model.id);
    const seasonAvgTradingROIs: Record<string, number> = {};
    ms.forEach(s => { seasonAvgTradingROIs[s.season] = s.avgTradingROI; });

    return {
      modelId: model.id, modelName: model.name,
      numSeasons: ms.length,
      avgTradingROI: avg(ms.map(s => s.avgTradingROI)),
      avgWinnerTotalROI: avg(ms.map(s => s.avgWinnerTotalROI)),
      avgTotalROI: avg(ms.map(s => s.avgTotalROI)),
      pctAbove0TotalROI: avg(ms.map(s => s.pctAbove0TotalROI)),
      avgPrizePool: avg(ms.map(s => s.avgPrizePool)),
      avgPlatformRevenue: avg(ms.map(s => s.avgPlatformRevenue)),
      seasonAvgTradingROIs,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    config, completedSeasons: allCompletedStats,
    inProgressStats, aggregateByModel,
  };
}
