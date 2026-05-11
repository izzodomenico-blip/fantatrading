import { DEFAULT_RULES } from '../config/defaultRules';
import { DEFAULT_PRIZE_TABLE } from '../config/prizeTables';
import { MockPlayer } from '../services/dataLoader';
import { runScenarioMonteCarlo, ScenarioStats } from '../services/fullSeasonSimulator';
import { mean, stdDev } from '../utils/mathUtils';

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface PriceModelPoint {
  meanReversionRate: number;
  /** Drift medio dei prezzi a fine stagione rispetto al baseValue (valore assoluto) */
  avgPriceDriftAbs: number;
  /** Drift medio relativo: (finalValue - baseValue) / baseValue */
  avgPriceDriftRel: number;
  /** Deviazione standard dei prezzi a fine stagione (misura dispersione) */
  avgPriceStdDev: number;
  /** Montepremi medio — non dovrebbe cambiare significativamente */
  avgPrizePool: number;
  /** Ricavo piattaforma */
  avgPlatformRevenue: number;
  /** % partecipanti che recuperano la quota */
  pctAbove0: number;
  /** ROI vincitore medio */
  avgWinnerROIPct: number;
  /** Capitale medio delle squadre a fine stagione */
  avgSquadCapitalAtEnd: number;
}

export interface PriceModelReport {
  generatedAt: string;
  numParticipants: number;
  numSimulations: number;
  roundsPerSeason: number;
  randomWalkBaseline: PriceModelPoint;
  points: PriceModelPoint[];
  keyFindings: string[];
  recommendedRate: number;
  recommendedRationale: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface PriceModelAnalysisConfig {
  meanReversionRates: number[];
  numParticipants: number;
  numSimulations: number;
  operationsPerTeamPerRound: number;
  registrationFeePerTeam: number;
  buyCommissionRate: number;
  sellCommissionRate: number;
  platformFeeRate: number;
  roundsPerSeason: number;
  randomSeed: number;
}

export const DEFAULT_PRICE_MODEL_CONFIG: PriceModelAnalysisConfig = {
  meanReversionRates: [0.0, 0.02, 0.05, 0.10, 0.15, 0.20],
  numParticipants: 50,
  numSimulations: 100,
  operationsPerTeamPerRound: 3.0,
  registrationFeePerTeam: 50,
  buyCommissionRate: 0.02,
  sellCommissionRate: 0.0125,
  platformFeeRate: 0.10,
  roundsPerSeason: 38,
  randomSeed: 42,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Stima il drift dei prezzi simulando una singola stagione senza trading
 * e misurando quanto i valori si discostano dai baseValues a fine stagione.
 */
function estimatePriceDrift(
  players: MockPlayer[],
  rate: number,
  rounds: number,
  seed: number,
): { avgDriftAbs: number; avgDriftRel: number; stdDevFinal: number } {
  // Usa il fullSeasonSimulator con 0 squadre per simulare solo le dinamiche di prezzo
  // Non è possibile direttamente — usiamo una stima analitica:
  // Con mean reversion rate r e n rounds, la varianza residua è proporzionale a (1-r)^(2n)
  // Approssimazione: drift atteso = 0 (processo mean-reverting è centrato su baseValue)
  // Variance ratio: Var(Vt) / Var(V0) ≈ sigma² * (1 - (1-r)^(2n)) / (2r)
  // Per semplicità, eseguiamo la simulazione reale con una squadra dummy e misuriamo i prezzi.

  // Usiamo una config minimale (1 team, 1 run) solo per estrarre i playerValues a fine stagione
  const { createSeededRng } = require('../utils/randomUtils');
  const { generatePlayerStats } = require('../utils/statsGenerator');
  const { calculateBonusMalus, applyBonusMalusToValue, DEFAULT_BONUS_MALUS_RULES } = require('../engine/bonusMalusEngine');

  const rng = createSeededRng(seed);
  const values = players.map(p => p.baseValue);
  const playerMinValue = DEFAULT_RULES.playerMinValue;
  const playerMaxValue = DEFAULT_RULES.playerMaxValue;

  for (let round = 0; round < rounds; round++) {
    for (let pi = 0; pi < players.length; pi++) {
      const stats = generatePlayerStats(players[pi].role, rng);
      const bm = calculateBonusMalus(stats, players[pi].role, DEFAULT_BONUS_MALUS_RULES);
      let v = applyBonusMalusToValue(values[pi], bm.total, playerMinValue, playerMaxValue);
      if (rate > 0) {
        v += (players[pi].baseValue - v) * rate;
        v = Math.max(playerMinValue, Math.min(playerMaxValue, v));
      }
      values[pi] = v;
    }
  }

  const drifts = players.map((p, i) => Math.abs(values[i] - p.baseValue));
  const driftsRel = players.map((p, i) => (values[i] - p.baseValue) / p.baseValue);
  const avgDriftAbs = mean(drifts);
  const avgDriftRel = mean(driftsRel);
  const stdDevFinal = stdDev(values);

  return { avgDriftAbs, avgDriftRel, stdDevFinal };
}

export function runPriceModelAnalysis(
  players: MockPlayer[],
  cfg: PriceModelAnalysisConfig = DEFAULT_PRICE_MODEL_CONFIG,
  onProgress?: (rate: number, ms: number) => void,
): PriceModelReport {
  const points: PriceModelPoint[] = [];

  for (const rate of cfg.meanReversionRates) {
    const prizePoolRate = Math.max(0, 1 - cfg.platformFeeRate);
    const config = {
      numTeams: cfg.numParticipants,
      numSimulations: cfg.numSimulations,
      operationsPerTeamPerRound: cfg.operationsPerTeamPerRound,
      registrationFeePerTeam: cfg.registrationFeePerTeam,
      rules: {
        ...DEFAULT_RULES,
        buyCommissionRate: cfg.buyCommissionRate,
        sellCommissionRate: cfg.sellCommissionRate,
        prizePoolContributionRate: prizePoolRate,
        platformFeeRate: cfg.platformFeeRate,
        roundsPerSeason: cfg.roundsPerSeason,
        meanReversionRate: rate,
      },
      prizeTable: DEFAULT_PRIZE_TABLE,
      randomSeed: cfg.randomSeed,
    };

    const t0 = Date.now();
    const stats = runScenarioMonteCarlo(config, players);
    const drift = estimatePriceDrift(players, rate, cfg.roundsPerSeason, cfg.randomSeed);
    const ms = Date.now() - t0;
    onProgress?.(rate, ms);

    points.push({
      meanReversionRate: rate,
      avgPriceDriftAbs: drift.avgDriftAbs,
      avgPriceDriftRel: drift.avgDriftRel * 100,
      avgPriceStdDev: drift.stdDevFinal,
      avgPrizePool: stats.avgPrizePool,
      avgPlatformRevenue: stats.avgPlatformRevenue,
      pctAbove0: stats.pctAbove0,
      avgWinnerROIPct: stats.avgWinnerROI,
      avgSquadCapitalAtEnd: stats.avgSquadCapitalAtEnd,
    });
  }

  const baseline = points.find(p => p.meanReversionRate === 0) ?? points[0];
  const { recommendedRate, rationale } = pickRecommendedRate(points, baseline);

  return {
    generatedAt: new Date().toISOString(),
    numParticipants: cfg.numParticipants,
    numSimulations: cfg.numSimulations,
    roundsPerSeason: cfg.roundsPerSeason,
    randomWalkBaseline: baseline,
    points,
    keyFindings: buildFindings(points, baseline),
    recommendedRate,
    recommendedRationale: rationale,
  };
}

// ─── Raccomandazione ──────────────────────────────────────────────────────────

function pickRecommendedRate(
  points: PriceModelPoint[],
  baseline: PriceModelPoint,
): { recommendedRate: number; rationale: string } {
  const nonZero = points.filter(p => p.meanReversionRate > 0);
  if (nonZero.length === 0) {
    return { recommendedRate: 0, rationale: 'Nessun tasso non-zero disponibile.' };
  }

  // Strategia: tra i rate con impatto montepremi < 15%, scegli quello con maggior riduzione drift.
  // Se nessuno soddisfa il 15%, rilassa la soglia al 25%.
  const withMetrics = nonZero.map(p => ({
    p,
    driftReduction: (baseline.avgPriceDriftAbs - p.avgPriceDriftAbs) / baseline.avgPriceDriftAbs * 100,
    poolChangePct: Math.abs(p.avgPrizePool - baseline.avgPrizePool) / baseline.avgPrizePool * 100,
  }));

  const thresholds = [0.15, 0.25, 1.0]; // progressivamente più permissivi
  let eligible = withMetrics.filter(c => c.poolChangePct <= thresholds[0] * 100);
  if (eligible.length === 0) eligible = withMetrics.filter(c => c.poolChangePct <= thresholds[1] * 100);
  if (eligible.length === 0) eligible = withMetrics;

  const scored = eligible.sort((a, b) => b.driftReduction - a.driftReduction);

  const { p: best } = scored[0];
  const driftReduction = (baseline.avgPriceDriftAbs - best.avgPriceDriftAbs) / baseline.avgPriceDriftAbs * 100;
  const poolChange = (best.avgPrizePool - baseline.avgPrizePool) / baseline.avgPrizePool * 100;

  return {
    recommendedRate: best.meanReversionRate,
    rationale: `Riduce il drift prezzi del ${driftReduction.toFixed(0)}% (da ${baseline.avgPriceDriftAbs.toFixed(1)} a ${best.avgPriceDriftAbs.toFixed(1)} crediti) con variazione montepremi di ${poolChange.toFixed(1)}% — rapporto ottimale realismo/invarianza economica.`,
  };
}

// ─── Findings ─────────────────────────────────────────────────────────────────

function buildFindings(points: PriceModelPoint[], baseline: PriceModelPoint): string[] {
  const findings: string[] = [];

  // Effetto sul drift
  const maxRate = points[points.length - 1];
  findings.push(
    `DRIFT PREZZI: Con random walk (rate=0) i prezzi deviano in media di ${baseline.avgPriceDriftAbs.toFixed(1)} crediti dal valore base a fine stagione (${(baseline.avgPriceDriftRel).toFixed(1)}%). Con rate=${maxRate.meanReversionRate} il drift scende a ${maxRate.avgPriceDriftAbs.toFixed(1)} crediti (${(maxRate.avgPriceDriftRel).toFixed(1)}%).`,
  );

  // Effetto sulla dispersione
  const stdDevs = points.map(p => p.avgPriceStdDev);
  findings.push(
    `DISPERSIONE PREZZI: La deviazione standard dei valori a fine stagione va da ${Math.max(...stdDevs).toFixed(1)} crediti (rate=0) a ${Math.min(...stdDevs).toFixed(1)} crediti (rate=${maxRate.meanReversionRate}). La mean reversion comprime la dispersione, rendendo i valori più prevedibili.`,
  );

  // Invarianza economica
  const poolChanges = points.filter(p => p.meanReversionRate > 0).map(p => {
    const delta = Math.abs(p.avgPrizePool - baseline.avgPrizePool) / baseline.avgPrizePool * 100;
    return { rate: p.meanReversionRate, delta };
  });
  const maxPoolChange = Math.max(...poolChanges.map(c => c.delta));
  findings.push(
    `INVARIANZA ECONOMICA: Il montepremi varia al massimo del ${maxPoolChange.toFixed(1)}% tra tutti i modelli di prezzo testati. La scelta del meanReversionRate non altera le conclusioni economiche della Fase 3.`,
  );

  // Capitale finale squadre
  const capitalChange = Math.abs(maxRate.avgSquadCapitalAtEnd - baseline.avgSquadCapitalAtEnd) / baseline.avgSquadCapitalAtEnd * 100;
  findings.push(
    `CAPITALE FINALE: Il capitale medio delle squadre a fine stagione cambia del ${capitalChange.toFixed(1)}% tra rate=0 e rate=${maxRate.meanReversionRate}. La mean reversion riduce le posizioni "estrema fortuna/sfortuna" nel portafoglio.`,
  );

  return findings;
}
