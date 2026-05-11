import { DEFAULT_RULES } from '../config/defaultRules';
import { DEFAULT_PRIZE_TABLE } from '../config/prizeTables';
import { MockPlayer } from '../services/dataLoader';
import { runScenarioMonteCarlo } from '../services/fullSeasonSimulator';

// ─── Spazio di ricerca ────────────────────────────────────────────────────────

export interface OptimizerSearchSpace {
  buyCommissionRates: number[];
  sellCommissionRates: number[];
  platformFeeRates: number[];
}

export const DEFAULT_SEARCH_SPACE: OptimizerSearchSpace = {
  buyCommissionRates: [0.01, 0.02, 0.03, 0.05, 0.08, 0.10],
  sellCommissionRates: [0.005, 0.0125, 0.02, 0.05, 0.08],
  platformFeeRates: [0.05, 0.10, 0.15, 0.20, 0.25],
};

// ─── Obiettivi ────────────────────────────────────────────────────────────────

export type OptimizationObjective =
  | 'maxOrganizerRevenue'
  | 'maxParticipantWelfare'
  | 'maxWinnerAttractiveness'
  | 'balanced';

const OBJECTIVE_LABELS: Record<OptimizationObjective, string> = {
  maxOrganizerRevenue: 'Massimizza Ricavo Organizzatore',
  maxParticipantWelfare: 'Massimizza Break-even Partecipanti',
  maxWinnerAttractiveness: 'Massimizza ROI Vincitore',
  balanced: 'Bilanciato (organizzatore + partecipanti)',
};

// ─── Tipi output ──────────────────────────────────────────────────────────────

export interface OptimizerCandidate {
  buyCommissionRate: number;
  sellCommissionRate: number;
  platformFeeRate: number;
  avgOrganizerMarginPct: number;
  orgProfitPerParticipant: number;
  avgPlatformRevenue: number;
  avgPrizePool: number;
  avgFirstPrize: number;
  avgWinnerROIPct: number;
  pctAbove0: number;
  platformLossRisk: number;
  isSustainable: boolean;
  scores: Record<OptimizationObjective, number>;
  isParetoOptimal: boolean;
}

export interface OptimizerResult {
  generatedAt: string;
  numParticipants: number;
  numSimulationsPerCandidate: number;
  searchSpace: OptimizerSearchSpace;
  totalCandidatesEvaluated: number;
  bestPerObjective: Record<OptimizationObjective, OptimizerCandidate>;
  paretoFrontier: OptimizerCandidate[];
  allCandidates: OptimizerCandidate[];
  recommendations: string[];
}

// ─── Config esecuzione ────────────────────────────────────────────────────────

export interface OptimizerRunConfig {
  numParticipants: number;
  numSimulations: number;
  operationsPerTeamPerRound: number;
  registrationFeePerTeam: number;
  roundsPerSeason: number;
  randomSeed: number;
}

export const DEFAULT_OPTIMIZER_RUN_CONFIG: OptimizerRunConfig = {
  numParticipants: 50,
  numSimulations: 50,
  operationsPerTeamPerRound: 3.0,
  registrationFeePerTeam: 50,
  roundsPerSeason: 38,
  randomSeed: 42,
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

function computeScores(c: Omit<OptimizerCandidate, 'scores' | 'isParetoOptimal'>): Record<OptimizationObjective, number> {
  const logWinnerROI = Math.log1p(Math.max(0, c.avgWinnerROIPct));
  return {
    maxOrganizerRevenue: c.avgPlatformRevenue,
    maxParticipantWelfare: c.pctAbove0,
    maxWinnerAttractiveness: logWinnerROI,
    balanced: c.avgOrganizerMarginPct * 0.40 + c.pctAbove0 * 0.35 + logWinnerROI * 0.25,
  };
}

// ─── Pareto dominance ─────────────────────────────────────────────────────────
// Assi: avgPlatformRevenue (organizzatore) vs avgFirstPrize (attrattività vincitore).
// Questa è la vera tensione: platformFeeRate alto → più ricavo organizzatore ma
// meno montepremi → premi più piccoli.

function computeParetoFrontier(candidates: OptimizerCandidate[]): OptimizerCandidate[] {
  const sustainable = candidates.filter(c => c.isSustainable);

  return sustainable.filter(a => {
    return !sustainable.some(b =>
      b !== a &&
      b.avgPlatformRevenue >= a.avgPlatformRevenue &&
      b.avgFirstPrize >= a.avgFirstPrize &&
      (b.avgPlatformRevenue > a.avgPlatformRevenue || b.avgFirstPrize > a.avgFirstPrize),
    );
  });
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function runGridSearch(
  players: MockPlayer[],
  searchSpace: OptimizerSearchSpace = DEFAULT_SEARCH_SPACE,
  runCfg: OptimizerRunConfig = DEFAULT_OPTIMIZER_RUN_CONFIG,
  onProgress?: (done: number, total: number, label: string, ms: number) => void,
): OptimizerResult {
  const combos: [number, number, number][] = [];
  for (const buy of searchSpace.buyCommissionRates) {
    for (const sell of searchSpace.sellCommissionRates) {
      for (const platform of searchSpace.platformFeeRates) {
        combos.push([buy, sell, platform]);
      }
    }
  }

  const rawCandidates: Omit<OptimizerCandidate, 'scores' | 'isParetoOptimal'>[] = [];

  combos.forEach(([buy, sell, platform], idx) => {
    const prizePoolRate = Math.max(0, 1 - platform);
    const config = {
      numTeams: runCfg.numParticipants,
      numSimulations: runCfg.numSimulations,
      operationsPerTeamPerRound: runCfg.operationsPerTeamPerRound,
      registrationFeePerTeam: runCfg.registrationFeePerTeam,
      rules: {
        ...DEFAULT_RULES,
        buyCommissionRate: buy,
        sellCommissionRate: sell,
        prizePoolContributionRate: prizePoolRate,
        platformFeeRate: platform,
        roundsPerSeason: runCfg.roundsPerSeason,
      },
      prizeTable: DEFAULT_PRIZE_TABLE,
      randomSeed: runCfg.randomSeed,
    };

    const label = `buy=${(buy * 100).toFixed(1)}% sell=${(sell * 100).toFixed(2)}% platform=${(platform * 100).toFixed(0)}%`;
    const t0 = Date.now();
    const stats = runScenarioMonteCarlo(config, players);
    const ms = Date.now() - t0;
    onProgress?.(idx + 1, combos.length, label, ms);

    rawCandidates.push({
      buyCommissionRate: buy,
      sellCommissionRate: sell,
      platformFeeRate: platform,
      avgOrganizerMarginPct: stats.avgOrganizerMarginPct,
      orgProfitPerParticipant: stats.orgProfitPerParticipant,
      avgPlatformRevenue: stats.avgPlatformRevenue,
      avgPrizePool: stats.avgPrizePool,
      avgFirstPrize: stats.avgFirstPrize,
      avgWinnerROIPct: stats.avgWinnerROI,
      pctAbove0: stats.pctAbove0,
      platformLossRisk: stats.platformLossRisk,
      isSustainable: stats.isSustainableForOrganizer,
    });
  });

  // Aggiunge scores
  const candidates: OptimizerCandidate[] = rawCandidates.map(c => ({
    ...c,
    scores: computeScores(c),
    isParetoOptimal: false,
  }));

  // Pareto frontier
  const paretoSet = new Set(computeParetoFrontier(candidates));
  candidates.forEach(c => { c.isParetoOptimal = paretoSet.has(c); });

  // Best per obiettivo
  const objectives: OptimizationObjective[] = [
    'maxOrganizerRevenue', 'maxParticipantWelfare', 'maxWinnerAttractiveness', 'balanced',
  ];
  const bestPerObjective = {} as Record<OptimizationObjective, OptimizerCandidate>;
  for (const obj of objectives) {
    const best = [...candidates].sort((a, b) => b.scores[obj] - a.scores[obj])[0];
    bestPerObjective[obj] = best;
  }

  const paretoFrontier = [...paretoSet].sort((a, b) => b.avgOrganizerMarginPct - a.avgOrganizerMarginPct);

  return {
    generatedAt: new Date().toISOString(),
    numParticipants: runCfg.numParticipants,
    numSimulationsPerCandidate: runCfg.numSimulations,
    searchSpace,
    totalCandidatesEvaluated: candidates.length,
    bestPerObjective,
    paretoFrontier,
    allCandidates: candidates,
    recommendations: buildRecommendations(bestPerObjective, paretoFrontier),
  };
}

// ─── Raccomandazioni ──────────────────────────────────────────────────────────

function buildRecommendations(
  best: Record<OptimizationObjective, OptimizerCandidate>,
  pareto: OptimizerCandidate[],
): string[] {
  const recs: string[] = [];

  const b = best.balanced;
  recs.push(
    `OTTIMALE BILANCIATO: buy=${(b.buyCommissionRate * 100).toFixed(1)}%, sell=${(b.sellCommissionRate * 100).toFixed(2)}%, platform=${(b.platformFeeRate * 100).toFixed(0)}% → margine ${b.avgOrganizerMarginPct.toFixed(1)}%, break-even ${b.pctAbove0.toFixed(1)}%, ROI vincitore ${b.avgWinnerROIPct.toFixed(0)}%.`,
  );

  const org = best.maxOrganizerRevenue;
  recs.push(
    `MASSIMO RICAVO ORGANIZZATORE: buy=${(org.buyCommissionRate * 100).toFixed(1)}%, sell=${(org.sellCommissionRate * 100).toFixed(2)}%, platform=${(org.platformFeeRate * 100).toFixed(0)}% → ricavo ${org.avgPlatformRevenue.toFixed(0)} crediti/stagione (margine ${org.avgOrganizerMarginPct.toFixed(1)}%).`,
  );

  const part = best.maxParticipantWelfare;
  recs.push(
    `MASSIMO WELFARE PARTECIPANTI: buy=${(part.buyCommissionRate * 100).toFixed(1)}%, sell=${(part.sellCommissionRate * 100).toFixed(2)}%, platform=${(part.platformFeeRate * 100).toFixed(0)}% → break-even ${part.pctAbove0.toFixed(1)}% dei partecipanti recupera la quota.`,
  );

  recs.push(
    `FRONTIERA DI PARETO: ${pareto.length} soluzioni non dominate sul piano (ricavo piattaforma, premio 1° posto). La vera tensione è nel platformFeeRate: alto → più ricavo organizzatore ma premi più piccoli. Le commissioni di trading aumentano entrambi i valori e non creano un trade-off.`,
  );

  // Nota strutturale sul break-even
  const breakEvenValues = [...Object.values(best)].map(c => c.pctAbove0);
  const breakEvenVariance = Math.max(...breakEvenValues) - Math.min(...breakEvenValues);
  if (breakEvenVariance < 1) {
    recs.push(
      `NOTA STRUTTURALE: Il break-even % è costante al ${breakEvenValues[0].toFixed(1)}% indipendentemente dalle commissioni. Questo è determinato dalla struttura della prize table (${breakEvenValues[0].toFixed(1)}% = n. premi / n. partecipanti), non dai parametri di trading. Per aumentare la % di vincitori bisogna modificare la prize table.`,
    );
  }

  // Insight: soluzioni Pareto — quali platformFeeRate compaiono
  if (pareto.length > 0) {
    const platRates = [...new Set(pareto.map(c => c.platformFeeRate))].sort((a, b) => a - b);
    const minPlat = platRates[0];
    const maxPlat = platRates[platRates.length - 1];
    if (minPlat !== maxPlat) {
      recs.push(
        `TRADE-OFF PARETO: le ${pareto.length} soluzioni non dominate coprono platformFeeRate dal ${(minPlat * 100).toFixed(0)}% al ${(maxPlat * 100).toFixed(0)}%. La scelta del punto ottimale dipende dalla priorità dell'organizzatore: margine alto vs premi attrattivi per i vincitori.`,
      );
    } else {
      recs.push(
        `TRADE-OFF PARETO: le ${pareto.length} soluzioni non dominate hanno tutte platformFeeRate=${(minPlat * 100).toFixed(0)}% — le commissioni di trading non creano trade-off tra organizzatore e vincitore: commissioni più alte aumentano entrambi i valori.`,
      );
    }
  }

  return recs;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export { OBJECTIVE_LABELS };
