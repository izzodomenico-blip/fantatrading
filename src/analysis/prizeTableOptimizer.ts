import { PrizeDistribution } from '../config/prizeTables';
import { DEFAULT_RULES } from '../config/defaultRules';
import { MockPlayer } from '../services/dataLoader';
import { runScenarioMonteCarlo } from '../services/fullSeasonSimulator';

// ─── Distribuzione geometrica ─────────────────────────────────────────────────

/**
 * Genera una prize table geometrica:
 *   prize_k = A * r^(k-1)   per k=1..n
 *   con somma = 1.0
 *
 * Dato firstPrizePct = A, si ricava r dalla somma geometrica:
 *   A * (1 - r^n) / (1 - r) = 1   →   risolto numericamente (bisezione)
 */
export function generateGeometricTable(numPrizes: number, firstPrizePct: number): PrizeDistribution[] {
  if (numPrizes === 1) {
    return [{ rank: 1, percentageOfPool: 1.0, label: '1° posto' }];
  }

  // Trova il ratio r tale che sum_{k=0}^{n-1} firstPrizePct * r^k = 1
  // => firstPrizePct * (1 - r^n) / (1 - r) = 1   (r != 1)
  // Se firstPrizePct = 1/n → r = 1 (distribuzione piatta)
  const flatPct = 1 / numPrizes;
  if (Math.abs(firstPrizePct - flatPct) < 1e-9) {
    return Array.from({ length: numPrizes }, (_, i) => ({
      rank: i + 1,
      percentageOfPool: flatPct,
      label: ordinalLabel(i + 1),
    }));
  }

  // Bisezione per trovare r in (0, 1) tale che f(r) = 0
  // f(r) = firstPrizePct * (1 - r^n) / (1 - r) - 1
  let lo = 0.001;
  let hi = 0.9999;
  let r = 0.5;
  for (let iter = 0; iter < 200; iter++) {
    r = (lo + hi) / 2;
    const geomSum = firstPrizePct * (1 - Math.pow(r, numPrizes)) / (1 - r);
    if (geomSum > 1) {
      hi = r; // somma troppo alta → r più piccolo
    } else {
      lo = r;
    }
    if (hi - lo < 1e-10) break;
  }

  const rawPcts = Array.from({ length: numPrizes }, (_, i) => firstPrizePct * Math.pow(r, i));
  const total = rawPcts.reduce((s, v) => s + v, 0);
  // Normalizza per garantire somma = 1
  return rawPcts.map((pct, i) => ({
    rank: i + 1,
    percentageOfPool: pct / total,
    label: ordinalLabel(i + 1),
  }));
}

function ordinalLabel(rank: number): string {
  return `${rank}° posto`;
}

// ─── Concentrazione Gini ──────────────────────────────────────────────────────

/**
 * Indice di Gini dei premi distribuiti tra tutti N partecipanti.
 * 0 = perfettamente piatto, 1 = winner-takes-all.
 */
export function computePrizeGini(table: PrizeDistribution[], numParticipants: number): number {
  const prizes = Array.from({ length: numParticipants }, (_, i) => {
    const entry = table.find(e => e.rank === i + 1);
    return entry ? entry.percentageOfPool : 0;
  }).sort((a, b) => a - b); // ordinati crescenti

  const n = prizes.length;
  const total = prizes.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;

  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += (i + 1) * prizes[i];
  }
  return (2 * weightedSum) / (n * total) - (n + 1) / n;
}

// ─── Tipi output ──────────────────────────────────────────────────────────────

export interface PrizeTableCandidate {
  numPrizes: number;
  firstPrizePct: number;
  table: PrizeDistribution[];
  giniCoefficient: number;
  // metriche simulate
  pctAbove0: number;
  pctAbove5: number;
  avgFirstPrize: number;
  avgLastPrize: number;
  avgWinnerROIPct: number;
  avgPrizePool: number;
  lastPrizeCoversRegistrationFee: boolean;
  isParetoOptimal: boolean;
}

export interface PrizeTableOptimizerResult {
  generatedAt: string;
  numParticipants: number;
  registrationFeePerTeam: number;
  numSimulations: number;
  candidatesEvaluated: number;
  paretoFrontier: PrizeTableCandidate[];
  bestForWinnerROI: PrizeTableCandidate;
  bestForBreakEven: PrizeTableCandidate;
  bestBalanced: PrizeTableCandidate;
  allCandidates: PrizeTableCandidate[];
  recommendations: string[];
}

// ─── Config run ───────────────────────────────────────────────────────────────

export interface PrizeTableOptimizerConfig {
  numParticipants: number;
  numSimulations: number;
  operationsPerTeamPerRound: number;
  registrationFeePerTeam: number;
  buyCommissionRate: number;
  sellCommissionRate: number;
  platformFeeRate: number;
  roundsPerSeason: number;
  randomSeed: number;
  numPrizesValues: number[];
  firstPrizePctValues: number[];
}

export const DEFAULT_PRIZE_TABLE_OPTIMIZER_CONFIG: PrizeTableOptimizerConfig = {
  numParticipants: 50,
  numSimulations: 80,
  operationsPerTeamPerRound: 3.0,
  registrationFeePerTeam: 50,
  buyCommissionRate: 0.02,
  sellCommissionRate: 0.0125,
  platformFeeRate: 0.10,
  roundsPerSeason: 38,
  randomSeed: 42,
  numPrizesValues: [1, 2, 3, 4, 5, 6, 8, 10, 15],
  firstPrizePctValues: [0.30, 0.40, 0.50, 0.60, 0.70],
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export function runPrizeTableGridSearch(
  players: MockPlayer[],
  cfg: PrizeTableOptimizerConfig = DEFAULT_PRIZE_TABLE_OPTIMIZER_CONFIG,
  onProgress?: (done: number, total: number, label: string, ms: number) => void,
): PrizeTableOptimizerResult {
  const combos: [number, number][] = [];
  for (const n of cfg.numPrizesValues) {
    for (const p of cfg.firstPrizePctValues) {
      // firstPrizePct ha senso solo se <= 1 e se non è minore di 1/n (piatto)
      // Per numPrizes=1 la distribuzione è always winner-takes-all
      if (n === 1 || p >= 1 / n) {
        combos.push([n, p]);
      }
    }
  }

  const prizePoolRate = Math.max(0, 1 - cfg.platformFeeRate);
  const rules = {
    ...DEFAULT_RULES,
    buyCommissionRate: cfg.buyCommissionRate,
    sellCommissionRate: cfg.sellCommissionRate,
    prizePoolContributionRate: prizePoolRate,
    platformFeeRate: cfg.platformFeeRate,
    roundsPerSeason: cfg.roundsPerSeason,
  };

  const rawCandidates: Omit<PrizeTableCandidate, 'isParetoOptimal'>[] = [];
  let done = 0;

  for (const [numPrizes, firstPrizePct] of combos) {
    const table = generateGeometricTable(numPrizes, firstPrizePct);
    const gini = computePrizeGini(table, cfg.numParticipants);

    const config = {
      numTeams: cfg.numParticipants,
      numSimulations: cfg.numSimulations,
      operationsPerTeamPerRound: cfg.operationsPerTeamPerRound,
      registrationFeePerTeam: cfg.registrationFeePerTeam,
      rules,
      prizeTable: table,
      randomSeed: cfg.randomSeed,
    };

    const label = `n=${numPrizes} top=${(firstPrizePct * 100).toFixed(0)}%`;
    const t0 = Date.now();
    const stats = runScenarioMonteCarlo(config, players);
    const ms = Date.now() - t0;
    done++;
    onProgress?.(done, combos.length, label, ms);

    const avgLastPrize = stats.avgPrizePool * (table[table.length - 1]?.percentageOfPool ?? 0);
    rawCandidates.push({
      numPrizes,
      firstPrizePct,
      table,
      giniCoefficient: gini,
      pctAbove0: stats.pctAbove0,
      pctAbove5: stats.pctAbove5,
      avgFirstPrize: stats.avgFirstPrize,
      avgLastPrize,
      avgWinnerROIPct: stats.avgWinnerROI,
      avgPrizePool: stats.avgPrizePool,
      lastPrizeCoversRegistrationFee: avgLastPrize >= cfg.registrationFeePerTeam,
    });
  }

  const candidates: PrizeTableCandidate[] = rawCandidates.map(c => ({ ...c, isParetoOptimal: false }));

  // Pareto: (pctAbove0, avgFirstPrize) — più vincitori vs premi più grandi
  const paretoSet = new Set(
    candidates.filter(a =>
      !candidates.some(b =>
        b !== a &&
        b.pctAbove0 >= a.pctAbove0 &&
        b.avgFirstPrize >= a.avgFirstPrize &&
        (b.pctAbove0 > a.pctAbove0 || b.avgFirstPrize > a.avgFirstPrize),
      ),
    ),
  );
  candidates.forEach(c => { c.isParetoOptimal = paretoSet.has(c); });

  const pareto = [...paretoSet].sort((a, b) => b.pctAbove0 - a.pctAbove0);

  // Best per singolo obiettivo
  const byWinnerROI = [...candidates].sort((a, b) => b.avgWinnerROIPct - a.avgWinnerROIPct)[0];
  const byBreakEven = [...candidates].sort((a, b) => b.pctAbove0 - a.pctAbove0)[0];
  const balanced = [...candidates].sort(
    (a, b) =>
      (Math.log1p(b.avgWinnerROIPct) * 0.5 + b.pctAbove0 * 0.5) -
      (Math.log1p(a.avgWinnerROIPct) * 0.5 + a.pctAbove0 * 0.5),
  )[0];

  return {
    generatedAt: new Date().toISOString(),
    numParticipants: cfg.numParticipants,
    registrationFeePerTeam: cfg.registrationFeePerTeam,
    numSimulations: cfg.numSimulations,
    candidatesEvaluated: candidates.length,
    paretoFrontier: pareto,
    bestForWinnerROI: byWinnerROI,
    bestForBreakEven: byBreakEven,
    bestBalanced: balanced,
    allCandidates: candidates,
    recommendations: buildPrizeTableRecommendations(pareto, byWinnerROI, byBreakEven, balanced, cfg),
  };
}

// ─── Raccomandazioni ──────────────────────────────────────────────────────────

function buildPrizeTableRecommendations(
  pareto: PrizeTableCandidate[],
  byROI: PrizeTableCandidate,
  byBreak: PrizeTableCandidate,
  balanced: PrizeTableCandidate,
  cfg: PrizeTableOptimizerConfig,
): string[] {
  const recs: string[] = [];

  recs.push(
    `BILANCIATO: n=${balanced.numPrizes} premi, top=${(balanced.firstPrizePct * 100).toFixed(0)}% → break-even ${balanced.pctAbove0.toFixed(1)}%, ROI vincitore ${balanced.avgWinnerROIPct.toFixed(0)}%, Gini ${balanced.giniCoefficient.toFixed(2)}.`,
  );

  recs.push(
    `MASSIMO ROI VINCITORE: n=${byROI.numPrizes} premi, top=${(byROI.firstPrizePct * 100).toFixed(0)}% → ROI vincitore ${byROI.avgWinnerROIPct.toFixed(0)}%, premio 1° ${byROI.avgFirstPrize.toFixed(0)} crediti.`,
  );

  recs.push(
    `MASSIMO BREAK-EVEN: n=${byBreak.numPrizes} premi, top=${(byBreak.firstPrizePct * 100).toFixed(0)}% → ${byBreak.pctAbove0.toFixed(1)}% dei partecipanti recupera la quota, ultimo premio ${byBreak.avgLastPrize.toFixed(0)} crediti (${byBreak.lastPrizeCoversRegistrationFee ? '>= quota' : '< quota'}).`,
  );

  recs.push(
    `FRONTIERA DI PARETO: ${pareto.length} soluzioni non dominate sul piano (break-even %, premio 1°). Aggiungere premi aumenta la % di vincitori ma riduce la dimensione di ciascun premio.`,
  );

  // Check: ultimo premio copre la quota?
  const withLastPrizeCovering = pareto.filter(c => c.lastPrizeCoversRegistrationFee);
  if (withLastPrizeCovering.length > 0) {
    const best = withLastPrizeCovering.sort((a, b) => b.pctAbove0 - a.pctAbove0)[0];
    recs.push(
      `OGNI VINCITORE COPRE LA QUOTA: con n=${best.numPrizes} premi e top=${(best.firstPrizePct * 100).toFixed(0)}%, anche l'ultimo classificato premiato riceve ${best.avgLastPrize.toFixed(0)} crediti ≥ quota ${cfg.registrationFeePerTeam}.`,
    );
  }

  return recs;
}
