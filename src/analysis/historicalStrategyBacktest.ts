import { NormalizedQuoteRow } from '../importers/realQuotesImporter';
import { createSeededRng } from '../utils/randomUtils';
import { mean, stdDev } from '../utils/mathUtils';
import { calculateEffectiveTradingReturnPct } from './historicalPortfolioSimulator';

export type StrategyId =
  | 'RANDOM'
  | 'LOW_COST'
  | 'TOP_PLAYER'
  | 'BALANCED'
  | 'VALUE'
  | 'ROLE_WEIGHTED'
  | 'HISTORICAL_MOMENTUM';

export const STRATEGIES: StrategyId[] = [
  'RANDOM',
  'LOW_COST',
  'TOP_PLAYER',
  'BALANCED',
  'VALUE',
  'ROLE_WEIGHTED',
  'HISTORICAL_MOMENTUM',
];

export const COMPLETED_STRATEGY_SEASONS = [
  '2019/20',
  '2020/21',
  '2021/22',
  '2022/23',
  '2023/24',
  '2024/25',
];

export const STRATEGY_ROSTER = { P: 3, D: 8, C: 8, A: 6 } as const;

const BUY_RATE = 0.02;
const SELL_RATE = 0.0125;

export interface StrategyBacktestConfig {
  numSimulations: number;
  randomSeed: number;
}

export const DEFAULT_STRATEGY_BACKTEST_CONFIG: StrategyBacktestConfig = {
  numSimulations: 500,
  randomSeed: 73021,
};

export interface StrategyPortfolioResult {
  strategy: StrategyId;
  season: string;
  playerIds: number[];
  buyCost: number;
  finalValue: number;
  roiPct: number;
}

export interface StrategySeasonStats {
  season: string;
  strategy: StrategyId;
  numSimulations: number;
  avgROI: number;
  medianROI: number;
  pctAbove0: number;
  pctAbove5: number;
  bestROI: number;
  worstROI: number;
  volatility: number;
  avgInvestedCapital: number;
  avgFinalValue: number;
  randomDeltaROI: number;
  randomDeltaPctAbove5: number;
}

export interface StrategyAggregateStats {
  strategy: StrategyId;
  numSeasons: number;
  avgROI: number;
  medianROI: number;
  pctAbove0: number;
  pctAbove5: number;
  bestROI: number;
  worstROI: number;
  volatility: number;
  avgInvestedCapital: number;
  avgFinalValue: number;
  randomDeltaROI: number;
  randomDeltaPctAbove5: number;
}

export interface RoleStrategyStats {
  role: string;
  countPerRoster: number;
  avgInitialQuote: number;
  avgFinalValueBeforeSellCommission: number;
  avgTradingReturnEffectivePct: number;
  avgTradingROIAfterCommissions: number;
}

export interface HistoricalStrategyBacktestReport {
  generatedAt: string;
  config: StrategyBacktestConfig;
  seasons: string[];
  strategies: StrategyId[];
  seasonStats: StrategySeasonStats[];
  aggregateStats: StrategyAggregateStats[];
  roleStats: RoleStrategyStats[];
}

interface ScoredRow {
  row: NormalizedQuoteRow;
  score: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pct(values: number[], pred: (v: number) => boolean): number {
  return values.length === 0 ? 0 : values.filter(pred).length / values.length * 100;
}

function quoteBucket(initialQuote: number): string {
  if (initialQuote <= 5) return 'LOW';
  if (initialQuote <= 12) return 'MID_LOW';
  if (initialQuote <= 25) return 'MID_HIGH';
  return 'HIGH';
}

function groupByRole(rows: NormalizedQuoteRow[]): Record<string, NormalizedQuoteRow[]> {
  const out: Record<string, NormalizedQuoteRow[]> = {};
  for (const row of rows) {
    if (row.initialQuote <= 0) continue;
    if (!out[row.role]) out[row.role] = [];
    out[row.role].push(row);
  }
  return out;
}

function takeRandom<T>(items: T[], count: number, rng: () => number): T[] {
  if (items.length < count) throw new Error(`Elementi insufficienti: richiesti ${count}, disponibili ${items.length}`);
  const pool = [...items];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function weightedSampleWithoutReplacement(scored: ScoredRow[], count: number, rng: () => number): NormalizedQuoteRow[] {
  if (scored.length < count) throw new Error(`Giocatori insufficienti: richiesti ${count}, disponibili ${scored.length}`);
  const pool = scored.map(item => ({ ...item, score: Math.max(0.0001, item.score) }));
  const selected: NormalizedQuoteRow[] = [];

  for (let i = 0; i < count; i++) {
    const total = pool.reduce((sum, item) => sum + item.score, 0);
    let target = rng() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      target -= pool[idx].score;
      if (target <= 0) break;
    }
    const [picked] = pool.splice(Math.min(idx, pool.length - 1), 1);
    selected.push(picked.row);
  }

  return selected;
}

function byPriceBand(rows: NormalizedQuoteRow[], start: number, end: number): NormalizedQuoteRow[] {
  const sorted = [...rows].sort((a, b) => a.initialQuote - b.initialQuote);
  const from = Math.floor(sorted.length * start);
  const to = Math.max(from + 1, Math.ceil(sorted.length * end));
  return sorted.slice(from, to);
}

function selectBalancedForRole(rows: NormalizedQuoteRow[], count: number, rng: () => number): NormalizedQuoteRow[] {
  const lowCount = Math.floor(count / 3);
  const highCount = Math.floor(count / 3);
  const midCount = count - lowCount - highCount;
  const selected: NormalizedQuoteRow[] = [];
  const used = new Set<number>();

  const bands: Array<[number, number, number]> = [
    [0, 0.34, lowCount],
    [0.34, 0.67, midCount],
    [0.67, 1, highCount],
  ];

  for (const [start, end, n] of bands) {
    const candidates = byPriceBand(rows, start, end).filter(p => !used.has(p.playerId));
    const picked = takeRandom(candidates.length >= n ? candidates : rows.filter(p => !used.has(p.playerId)), n, rng);
    picked.forEach(p => used.add(p.playerId));
    selected.push(...picked);
  }

  return selected;
}

export function buildHistoricalProfileScores(
  allRows: NormalizedQuoteRow[],
  targetSeason: string,
): Map<string, number> {
  const previousRows = allRows.filter(r =>
    r.seasonStatus === 'completed' &&
    COMPLETED_STRATEGY_SEASONS.includes(r.season) &&
    r.season < targetSeason
  );
  const byPlayer = new Map<string, number[]>();
  const byProfile = new Map<string, number[]>();

  for (const row of previousRows) {
    const effective = calculateEffectiveTradingReturnPct(row.currentOrFinalQuote, row.initialQuote).effective;
    const playerKey = row.playerName.trim().toLowerCase();
    if (!byPlayer.has(playerKey)) byPlayer.set(playerKey, []);
    byPlayer.get(playerKey)!.push(effective);

    const profileKey = `${row.role}:${quoteBucket(row.initialQuote)}`;
    if (!byProfile.has(profileKey)) byProfile.set(profileKey, []);
    byProfile.get(profileKey)!.push(effective);
  }

  const scores = new Map<string, number>();
  for (const [key, values] of byPlayer) scores.set(`player:${key}`, mean(values));
  for (const [key, values] of byProfile) scores.set(`profile:${key}`, mean(values));
  return scores;
}

export function getHistoricalMomentumScore(
  row: NormalizedQuoteRow,
  scores: Map<string, number>,
): number {
  const playerScore = scores.get(`player:${row.playerName.trim().toLowerCase()}`);
  if (playerScore !== undefined) return playerScore;
  return scores.get(`profile:${row.role}:${quoteBucket(row.initialQuote)}`) ?? 0;
}

export function buildStrategyPortfolio(
  seasonRows: NormalizedQuoteRow[],
  strategy: StrategyId,
  rng: () => number,
  allRows: NormalizedQuoteRow[] = seasonRows,
): NormalizedQuoteRow[] {
  const playersByRole = groupByRole(seasonRows);
  const selected: NormalizedQuoteRow[] = [];
  const season = seasonRows[0]?.season ?? 'unknown';
  const momentumScores = strategy === 'HISTORICAL_MOMENTUM'
    ? buildHistoricalProfileScores(allRows, season)
    : new Map<string, number>();
  const roleScores = buildRoleProfitabilityScores(allRows, season);

  for (const [role, count] of Object.entries(STRATEGY_ROSTER)) {
    const rows = playersByRole[role] ?? [];
    if (rows.length < count) throw new Error(`Stagione ${season}: ruolo ${role} insufficiente`);

    if (strategy === 'RANDOM') {
      selected.push(...takeRandom(rows, count, rng));
    } else if (strategy === 'LOW_COST') {
      const maxQ = Math.max(...rows.map(r => r.initialQuote));
      selected.push(...weightedSampleWithoutReplacement(
        rows.map(row => ({ row, score: maxQ - row.initialQuote + 1 })),
        count,
        rng,
      ));
    } else if (strategy === 'TOP_PLAYER') {
      selected.push(...weightedSampleWithoutReplacement(
        rows.map(row => ({ row, score: row.initialQuote })),
        count,
        rng,
      ));
    } else if (strategy === 'BALANCED') {
      selected.push(...selectBalancedForRole(rows, count, rng));
    } else if (strategy === 'VALUE') {
      const valueBand = byPriceBand(rows, 0.15, 0.65);
      const candidates = valueBand.length >= count ? valueBand : rows;
      const maxQ = Math.max(...candidates.map(r => r.initialQuote));
      selected.push(...weightedSampleWithoutReplacement(
        candidates.map(row => ({ row, score: maxQ - row.initialQuote + 1 })),
        count,
        rng,
      ));
    } else if (strategy === 'ROLE_WEIGHTED') {
      const roleScore = roleScores.get(role) ?? 0;
      const candidates = roleScore >= 0 ? byPriceBand(rows, 0.15, 0.8) : byPriceBand(rows, 0.45, 1);
      selected.push(...weightedSampleWithoutReplacement(
        (candidates.length >= count ? candidates : rows).map(row => ({
          row,
          score: roleScore >= 0
            ? Math.max(1, 30 - row.initialQuote)
            : Math.max(1, row.initialQuote),
        })),
        count,
        rng,
      ));
    } else if (strategy === 'HISTORICAL_MOMENTUM') {
      if (momentumScores.size === 0) {
        selected.push(...selectBalancedForRole(rows, count, rng));
      } else {
        selected.push(...weightedSampleWithoutReplacement(
          rows.map(row => ({ row, score: getHistoricalMomentumScore(row, momentumScores) + 101 })),
          count,
          rng,
        ));
      }
    }
  }

  return selected;
}

function buildRoleProfitabilityScores(allRows: NormalizedQuoteRow[], targetSeason: string): Map<string, number> {
  const previousRows = allRows.filter(r =>
    r.seasonStatus === 'completed' &&
    COMPLETED_STRATEGY_SEASONS.includes(r.season) &&
    r.season < targetSeason
  );
  const out = new Map<string, number>();
  for (const role of Object.keys(STRATEGY_ROSTER)) {
    const roleReturns = previousRows
      .filter(r => r.role === role)
      .map(r => calculateEffectiveTradingReturnPct(r.currentOrFinalQuote, r.initialQuote).effective);
    out.set(role, mean(roleReturns));
  }
  return out;
}

export function evaluatePortfolio(
  portfolio: NormalizedQuoteRow[],
  strategy: StrategyId = 'RANDOM',
  season: string = portfolio[0]?.season ?? 'unknown',
): StrategyPortfolioResult {
  let buyCost = 0;
  let finalValue = 0;

  for (const player of portfolio) {
    const effectiveReturn = calculateEffectiveTradingReturnPct(
      player.currentOrFinalQuote,
      player.initialQuote,
    ).effective;
    const sellValue = Math.max(0, player.initialQuote * (1 + effectiveReturn / 100));
    buyCost += player.initialQuote * (1 + BUY_RATE);
    finalValue += sellValue * (1 - SELL_RATE);
  }

  return {
    strategy,
    season,
    playerIds: portfolio.map(p => p.playerId),
    buyCost,
    finalValue,
    roiPct: buyCost > 0 ? ((finalValue - buyCost) / buyCost) * 100 : 0,
  };
}

function validateSeasonRows(seasonRows: NormalizedQuoteRow[], season: string): void {
  const byRole = groupByRole(seasonRows);
  for (const [role, count] of Object.entries(STRATEGY_ROSTER)) {
    const available = byRole[role]?.length ?? 0;
    if (available < count) {
      throw new Error(`Stagione ${season}: ruolo ${role} insufficiente (${available}/${count})`);
    }
  }
}

function summarizeSeason(
  season: string,
  strategy: StrategyId,
  results: StrategyPortfolioResult[],
): StrategySeasonStats {
  const rois = results.map(r => r.roiPct);
  return {
    season,
    strategy,
    numSimulations: results.length,
    avgROI: mean(rois),
    medianROI: median(rois),
    pctAbove0: pct(rois, r => r > 0),
    pctAbove5: pct(rois, r => r > 5),
    bestROI: rois.length ? Math.max(...rois) : 0,
    worstROI: rois.length ? Math.min(...rois) : 0,
    volatility: stdDev(rois),
    avgInvestedCapital: mean(results.map(r => r.buyCost)),
    avgFinalValue: mean(results.map(r => r.finalValue)),
    randomDeltaROI: 0,
    randomDeltaPctAbove5: 0,
  };
}

function summarizeAggregate(strategy: StrategyId, seasonStats: StrategySeasonStats[]): StrategyAggregateStats {
  return {
    strategy,
    numSeasons: seasonStats.length,
    avgROI: mean(seasonStats.map(s => s.avgROI)),
    medianROI: mean(seasonStats.map(s => s.medianROI)),
    pctAbove0: mean(seasonStats.map(s => s.pctAbove0)),
    pctAbove5: mean(seasonStats.map(s => s.pctAbove5)),
    bestROI: seasonStats.length ? Math.max(...seasonStats.map(s => s.bestROI)) : 0,
    worstROI: seasonStats.length ? Math.min(...seasonStats.map(s => s.worstROI)) : 0,
    volatility: mean(seasonStats.map(s => s.volatility)),
    avgInvestedCapital: mean(seasonStats.map(s => s.avgInvestedCapital)),
    avgFinalValue: mean(seasonStats.map(s => s.avgFinalValue)),
    randomDeltaROI: mean(seasonStats.map(s => s.randomDeltaROI)),
    randomDeltaPctAbove5: mean(seasonStats.map(s => s.randomDeltaPctAbove5)),
  };
}

export function computeRoleStrategyStats(rows: NormalizedQuoteRow[]): RoleStrategyStats[] {
  return Object.entries(STRATEGY_ROSTER).map(([role, count]) => {
    const roleRows = rows.filter(r => r.role === role && r.initialQuote > 0);
    const effectiveReturns = roleRows.map(r => calculateEffectiveTradingReturnPct(r.currentOrFinalQuote, r.initialQuote).effective);
    const finalValues = roleRows.map((r, i) => r.initialQuote * (1 + effectiveReturns[i] / 100));
    const rois = roleRows.map((r, i) => {
      const buyCost = r.initialQuote * (1 + BUY_RATE);
      const finalValue = Math.max(0, finalValues[i]) * (1 - SELL_RATE);
      return buyCost > 0 ? ((finalValue - buyCost) / buyCost) * 100 : 0;
    });
    return {
      role,
      countPerRoster: count,
      avgInitialQuote: mean(roleRows.map(r => r.initialQuote)),
      avgFinalValueBeforeSellCommission: mean(finalValues.map(v => Math.max(0, v))),
      avgTradingReturnEffectivePct: mean(effectiveReturns),
      avgTradingROIAfterCommissions: mean(rois),
    };
  });
}

export function runHistoricalStrategyBacktest(
  allRows: NormalizedQuoteRow[],
  config: StrategyBacktestConfig = DEFAULT_STRATEGY_BACKTEST_CONFIG,
): HistoricalStrategyBacktestReport {
  const completedRows = allRows.filter(r =>
    r.seasonStatus === 'completed' &&
    COMPLETED_STRATEGY_SEASONS.includes(r.season)
  );
  const seasons = COMPLETED_STRATEGY_SEASONS.filter(season => completedRows.some(r => r.season === season));
  const seasonStats: StrategySeasonStats[] = [];

  for (const season of seasons) {
    const seasonRows = completedRows.filter(r => r.season === season);
    validateSeasonRows(seasonRows, season);

    const byStrategy = new Map<StrategyId, StrategySeasonStats>();
    for (const strategy of STRATEGIES) {
      const results: StrategyPortfolioResult[] = [];
      const rng = createSeededRng(config.randomSeed + seasons.indexOf(season) * 10000 + STRATEGIES.indexOf(strategy) * 1000);
      for (let sim = 0; sim < config.numSimulations; sim++) {
        const portfolio = buildStrategyPortfolio(seasonRows, strategy, rng, completedRows);
        results.push(evaluatePortfolio(portfolio, strategy, season));
      }
      byStrategy.set(strategy, summarizeSeason(season, strategy, results));
    }

    const random = byStrategy.get('RANDOM')!;
    for (const stat of byStrategy.values()) {
      stat.randomDeltaROI = stat.avgROI - random.avgROI;
      stat.randomDeltaPctAbove5 = stat.pctAbove5 - random.pctAbove5;
      seasonStats.push(stat);
    }
  }

  const aggregateStats = STRATEGIES.map(strategy => {
    const stats = seasonStats.filter(s => s.strategy === strategy);
    return summarizeAggregate(strategy, stats);
  });
  const randomAgg = aggregateStats.find(s => s.strategy === 'RANDOM');
  if (randomAgg) {
    for (const stat of aggregateStats) {
      stat.randomDeltaROI = stat.avgROI - randomAgg.avgROI;
      stat.randomDeltaPctAbove5 = stat.pctAbove5 - randomAgg.pctAbove5;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    config,
    seasons,
    strategies: STRATEGIES,
    seasonStats,
    aggregateStats,
    roleStats: computeRoleStrategyStats(completedRows),
  };
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export function buildHistoricalStrategyMarkdown(report: HistoricalStrategyBacktestReport): string {
  const lines: string[] = [];
  const byAvgROI = [...report.aggregateStats].sort((a, b) => b.avgROI - a.avgROI);
  const byAbove5 = [...report.aggregateStats].sort((a, b) => b.pctAbove5 - a.pctAbove5);
  const strongest = byAvgROI[0];

  lines.push('# FantaTrading - Backtest Storico Strategie');
  lines.push('');
  lines.push(`**Generato il:** ${new Date(report.generatedAt).toLocaleString('it-IT')}`);
  lines.push(`**Stagioni definitive:** ${report.seasons.join(', ')}`);
  lines.push(`**Simulazioni per strategia/stagione:** ${report.config.numSimulations}`);
  lines.push('');
  lines.push('Il backtest usa solo `data/real/processed/fantacalcio_quotes_history.json` e include solo stagioni completed. La stagione 2025/26 e esclusa dai risultati finali.');
  lines.push('');

  lines.push('## Classifica strategie per ROI medio');
  lines.push('');
  lines.push('| # | Strategia | ROI medio | ROI mediano | % > 0 | % > 5 | Volatilita | Delta ROI vs RANDOM | Capitale medio | Valore finale medio |');
  lines.push('|---|-----------|-----------|-------------|-------|-------|------------|---------------------|---------------|---------------------|');
  byAvgROI.forEach((s, i) => {
    lines.push(`| ${i + 1} | ${s.strategy} | ${fmt(s.avgROI)}% | ${fmt(s.medianROI)}% | ${fmt(s.pctAbove0)}% | ${fmt(s.pctAbove5)}% | ${fmt(s.volatility)} | ${fmt(s.randomDeltaROI)}pp | ${fmt(s.avgInvestedCapital, 0)} | ${fmt(s.avgFinalValue, 0)} |`);
  });
  lines.push('');

  lines.push('## Classifica strategie per percentuale sopra 5%');
  lines.push('');
  lines.push('| # | Strategia | % > 5 | ROI medio | Miglior ROI | Peggior ROI | Delta % >5 vs RANDOM |');
  lines.push('|---|-----------|-------|-----------|-------------|-------------|----------------------|');
  byAbove5.forEach((s, i) => {
    lines.push(`| ${i + 1} | ${s.strategy} | ${fmt(s.pctAbove5)}% | ${fmt(s.avgROI)}% | ${fmt(s.bestROI)}% | ${fmt(s.worstROI)}% | ${fmt(s.randomDeltaPctAbove5)}pp |`);
  });
  lines.push('');

  lines.push('## Analisi per stagione');
  lines.push('');
  for (const season of report.seasons) {
    lines.push(`### ${season}`);
    lines.push('');
    lines.push('| Strategia | ROI medio | ROI mediano | % > 0 | % > 5 | Miglior ROI | Peggior ROI | Volatilita | Delta ROI vs RANDOM |');
    lines.push('|-----------|-----------|-------------|-------|-------|-------------|-------------|------------|---------------------|');
    report.seasonStats
      .filter(s => s.season === season)
      .sort((a, b) => b.avgROI - a.avgROI)
      .forEach(s => {
        lines.push(`| ${s.strategy} | ${fmt(s.avgROI)}% | ${fmt(s.medianROI)}% | ${fmt(s.pctAbove0)}% | ${fmt(s.pctAbove5)}% | ${fmt(s.bestROI)}% | ${fmt(s.worstROI)}% | ${fmt(s.volatility)} | ${fmt(s.randomDeltaROI)}pp |`);
      });
    lines.push('');
  }

  lines.push('## Analisi per ruolo');
  lines.push('');
  lines.push('| Ruolo | Slot rosa | Qt.I media | Valore finale medio lordo | Rendimento FT effettivo | ROI medio post commissioni |');
  lines.push('|-------|-----------|------------|---------------------------|-------------------------|----------------------------|');
  for (const r of report.roleStats) {
    lines.push(`| ${r.role} | ${r.countPerRoster} | ${fmt(r.avgInitialQuote, 1)} | ${fmt(r.avgFinalValueBeforeSellCommission, 1)} | ${fmt(r.avgTradingReturnEffectivePct)}% | ${fmt(r.avgTradingROIAfterCommissions)}% |`);
  }
  lines.push('');

  lines.push('## Conclusione strategica');
  lines.push('');
  lines.push(`La strategia piu forte per ROI medio e **${strongest.strategy}** (${fmt(strongest.avgROI)}%), con delta di ${fmt(strongest.randomDeltaROI)} punti percentuali rispetto a RANDOM. Se la stessa strategia guida anche la classifica sopra 5%, il segnale e piu robusto; altrimenti il vantaggio e piu legato a profilo rischio/rendimento.`);
  lines.push('');

  lines.push('## Sostenibilita regolamento originale + M2');
  lines.push('');
  lines.push('Il regolamento originale puro resta debole per la piattaforma perche ha margine 0%. Il modello M2 con 10% di margine sulle commissioni e piu sostenibile: il ricavo cresce con il volume di trading, mentre queste strategie incidono soprattutto sulla distribuzione dei risultati tra utenti. Con i soli dati buy-and-hold non emerge una prova definitiva che il gioco sia banalmente battibile, ma strategie superiori a RANDOM riducono il margine competitivo dei giocatori casuali.');
  lines.push('');

  lines.push('## Limiti dell analisi');
  lines.push('');
  lines.push('- Usa solo Qt.I e Qt.A: non vede timing intra-stagione, picchi intermedi o stop loss.');
  lines.push('- Le strategie costruiscono la rosa iniziale, ma non fanno trading giornata per giornata.');
  lines.push('- HISTORICAL_MOMENTUM usa solo stagioni precedenti, ma approssima i profili simili con ruolo e fascia prezzo.');
  lines.push('- Non misura liquidita, vincoli di mercato, infortuni noti durante la stagione o comportamento reale degli utenti.');
  lines.push('- Le rose sono generate da euristiche: non rappresentano un optimizer perfetto con informazione completa.');
  lines.push('');

  return lines.join('\n');
}

export function buildHistoricalStrategyCsv(report: HistoricalStrategyBacktestReport): { headers: string[]; rows: (string | number)[][] } {
  const headers = [
    'season',
    'strategy',
    'numSimulations',
    'avgROI',
    'medianROI',
    'pctAbove0',
    'pctAbove5',
    'bestROI',
    'worstROI',
    'volatility',
    'avgInvestedCapital',
    'avgFinalValue',
    'randomDeltaROI',
    'randomDeltaPctAbove5',
  ];
  const rows = report.seasonStats.map(s => [
    s.season,
    s.strategy,
    s.numSimulations,
    +s.avgROI.toFixed(4),
    +s.medianROI.toFixed(4),
    +s.pctAbove0.toFixed(4),
    +s.pctAbove5.toFixed(4),
    +s.bestROI.toFixed(4),
    +s.worstROI.toFixed(4),
    +s.volatility.toFixed(4),
    +s.avgInvestedCapital.toFixed(4),
    +s.avgFinalValue.toFixed(4),
    +s.randomDeltaROI.toFixed(4),
    +s.randomDeltaPctAbove5.toFixed(4),
  ]);
  return { headers, rows };
}
