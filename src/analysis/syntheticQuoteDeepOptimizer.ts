import { NormalizedQuoteRow, PlayerRole } from '../importers/realQuotesImporter';
import { NormalizedVoteRow } from '../importers/realVotesImporter';
import { mean } from '../utils/mathUtils';
import {
  QuoteBand,
  SyntheticPlayerFinal,
  SyntheticQuoteParams,
  calculateOffensiveMetrics,
  getQuoteBand,
  runSyntheticRoundQuoteModel,
} from '../engine/syntheticRoundQuoteEngine';
import {
  CalibrationMetrics,
  calculateCalibrationMetrics,
} from './syntheticQuoteCalibration';
import { BASELINE_STUDY_PARAMS, SyntheticQuoteStudyModelId } from './syntheticQuoteModelStudy';

export type DeepModelId =
  | 'AGGRESSIVE'
  | 'ROLE_BONUS_SENSITIVE'
  | 'HYBRID_AGGRESSIVE_ATTACKER_BONUS'
  | 'ROLE_SPECIFIC_OPTIMIZED'
  | 'QUOTE_BAND_OPTIMIZED'
  | 'ROLE_AND_QUOTE_BAND_OPTIMIZED'
  | 'BONUS_FEATURE_OPTIMIZED'
  | 'ENSEMBLE_AVERAGE'
  | 'ENSEMBLE_ROLE_WEIGHTED'
  | 'ROBUST_MODEL'
  | 'ORACLE_FINAL_ANCHOR';

export interface DeepScore {
  score: number;
  mae: number;
  rmse: number;
  within2Pct: number;
  biasPenalty: number;
  instabilityPenalty: number;
  outlierPenalty: number;
}

export interface DeepOutlier {
  season: string;
  playerId: number;
  playerName: string;
  role: PlayerRole;
  club: string;
  initialQuote: number;
  realCurrentOrFinalQuote: number;
  estimatedQaa: number;
  error: number;
  signedError: number;
  usefulAppearances: number;
  fantasyAverage: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltiesMissed: number;
  drySpell: number;
  possibleCause: string;
}

export interface DeepBreakdown {
  key: string;
  count: number;
  mae: number;
  rmse: number;
  medianAbsError: number;
  bias: number;
  within1Pct: number;
  within2Pct: number;
  within3Pct: number;
}

export interface DeepModelResult {
  modelId: DeepModelId;
  operational: boolean;
  usesFinalQuoteInDailySimulation: boolean;
  description: string;
  params: SyntheticQuoteParams | null;
  folds: Array<{ trainSeason: string; validationSeason: string; train: CalibrationMetrics; validation: CalibrationMetrics }>;
  aggregateValidation: CalibrationMetrics;
  score: DeepScore;
  validationFinals: SyntheticPlayerFinal[];
  bySeason: DeepBreakdown[];
  byRole: DeepBreakdown[];
  byQuoteBand: DeepBreakdown[];
  byGrowth: DeepBreakdown[];
  byPresence: DeepBreakdown[];
  topWorstErrors: DeepOutlier[];
  topBestEstimates: DeepOutlier[];
  topOverEstimates: DeepOutlier[];
  topUnderEstimates: DeepOutlier[];
}

export interface DeepOptimizerReport {
  generatedAt: string;
  title: 'Synthetic Quote Deep Optimization Study';
  officialModel: false;
  completedSeasons: string[];
  inProgressSeasons: string[];
  previousBest: {
    modelId: SyntheticQuoteStudyModelId;
    mae: number;
    rmse: number;
    within2Pct: number;
    attackerMae: number;
  };
  models: DeepModelResult[];
  bestPureErrorModel: DeepModelId;
  bestRobustModel: DeepModelId;
  bestAttackerModel: DeepModelId;
  recommendedOperationalModel: DeepModelId;
  preview2025: { modelId: DeepModelId; metrics: CalibrationMetrics } | null;
  targets: {
    maeUnder2: boolean;
    rmseUnder3: boolean;
    within2AtLeast75: boolean;
    attackerMaeUnder250: boolean;
  };
}

const COMPLETED = ['2023/24', '2024/25'];
const IN_PROGRESS = ['2025/26'];

const AGGRESSIVE_PARAMS: SyntheticQuoteParams = {
  ...BASELINE_STUDY_PARAMS,
  adjustmentRate: 0.76,
  lastPerformanceWeight: 0.58,
  fantasyAverageWeight: 0.48,
  presenceWeight: 0.55,
  lowCostBreakoutWeight: 0.1,
  offensiveBonusWeight: 0.12,
};

const ROLE_BONUS_PARAMS: SyntheticQuoteParams = {
  ...BASELINE_STUDY_PARAMS,
  roleOverrides: {
    P: { presenceWeight: 0.65 },
    D: { offensiveBonusWeight: 0.08, recentOffensiveBonusWeight: 0.04 },
    C: { offensiveBonusWeight: 0.16, recentOffensiveBonusWeight: 0.08 },
    A: { offensiveBonusWeight: 0.34, recentOffensiveBonusWeight: 0.14, drySpellPenalty: 0.2, expectedStrength: 1.5 },
  },
};

function avg(values: number[]): number {
  return mean(values);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function rmse(values: number[]): number {
  return values.length ? Math.sqrt(avg(values.map(v => v ** 2))) : 0;
}

function pct(values: number[], pred: (value: number) => boolean): number {
  return values.length ? values.filter(pred).length / values.length * 100 : 0;
}

function key(row: { season: string; playerId: number | string }): string {
  return `${row.season}|${row.playerId}`;
}

function matchedQuotes(quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[], seasons: string[]): NormalizedQuoteRow[] {
  const voteKeys = new Set(voteRows.filter(v => seasons.includes(v.season)).map(key));
  return quoteRows.filter(q => seasons.includes(q.season) && voteKeys.has(key(q)));
}

function seasonVotes(voteRows: NormalizedVoteRow[], seasons: string[]): NormalizedVoteRow[] {
  return voteRows.filter(v => seasons.includes(v.season));
}

function summarize(label: string, finals: SyntheticPlayerFinal[]): DeepBreakdown {
  const errors = finals.map(f => f.error);
  return {
    key: label,
    count: finals.length,
    mae: avg(errors),
    rmse: rmse(errors),
    medianAbsError: median(errors),
    bias: avg(finals.map(f => f.signedError)),
    within1Pct: pct(errors, e => e <= 1),
    within2Pct: pct(errors, e => e <= 2),
    within3Pct: pct(errors, e => e <= 3),
  };
}

function quoteBandOrder(): QuoteBand[] {
  return ['1-5', '6-10', '11-20', '21-35', '36+'];
}

function presenceBucket(row: SyntheticPlayerFinal): string {
  if (row.presenceRateSeason < 0.33) return 'poche presenze';
  if (row.presenceRateSeason < 0.67) return 'presenze medie';
  return 'alta continuita';
}

function growthBucket(row: SyntheticPlayerFinal): string {
  const diff = row.realCurrentOrFinalQuote - row.initialQuote;
  if (diff >= 5) return 'forte crescita';
  if (diff <= -5) return 'forte calo';
  return 'stabile';
}

function breakdown(finals: SyntheticPlayerFinal[], group: (row: SyntheticPlayerFinal) => string, order: string[]): DeepBreakdown[] {
  return order.map(label => summarize(label, finals.filter(row => group(row) === label)));
}

export function scoreModel(metrics: CalibrationMetrics, foldMetrics: CalibrationMetrics[]): DeepScore {
  const foldMaes = foldMetrics.map(m => m.mae);
  const instabilityPenalty = foldMaes.length > 1 ? Math.max(...foldMaes) - Math.min(...foldMaes) : 0;
  const biasPenalty = Math.abs(metrics.avgSignedError);
  const outlierPenalty = metrics.distribution.find(b => b.bucket === '>5')?.pct ?? 0;
  const score =
    metrics.mae * 0.4 +
    metrics.rmse * 0.25 -
    metrics.within2Pct * 0.015 +
    biasPenalty * 0.1 +
    instabilityPenalty * 0.1 +
    outlierPenalty * 0.01;
  return { score, mae: metrics.mae, rmse: metrics.rmse, within2Pct: metrics.within2Pct, biasPenalty, instabilityPenalty, outlierPenalty };
}

export function instabilityPenalty(folds: CalibrationMetrics[]): number {
  const maes = folds.map(f => f.mae);
  return maes.length > 1 ? Math.max(...maes) - Math.min(...maes) : 0;
}

function playerStats(voteRows: NormalizedVoteRow[], final: SyntheticPlayerFinal) {
  const votes = voteRows.filter(v => v.season === final.season && String(v.playerId) === String(final.playerId));
  const played = votes.filter(v => v.played);
  const fantasyValues = played.map(v => v.fantasyVote ?? v.vote).filter((v): v is number => v !== null);
  const offensive = calculateOffensiveMetrics(votes);
  return {
    fantasyAverage: avg(fantasyValues),
    goals: offensive.goals,
    assists: offensive.assists,
    yellowCards: played.reduce((s, v) => s + v.yellowCards, 0),
    redCards: played.reduce((s, v) => s + v.redCards, 0),
    ownGoals: played.reduce((s, v) => s + v.ownGoals, 0),
    penaltiesMissed: played.reduce((s, v) => s + v.penaltiesMissed, 0),
    drySpell: offensive.drySpell,
  };
}

function cause(final: SyntheticPlayerFinal, stats: ReturnType<typeof playerStats>): string {
  if (final.signedError < -5 && stats.goals + stats.assists > 8) return 'sottostima probabile: bonus offensivi/breakout forti';
  if (final.signedError < -5 && final.initialQuote <= 10) return 'sottostima probabile: low-cost cresciuto rapidamente';
  if (final.signedError > 5 && final.initialQuote >= 21 && stats.drySpell >= 5) return 'sovrastima probabile: top player con dry spell';
  if (final.signedError > 5 && final.usefulAppearances < 10) return 'sovrastima probabile: poche presenze/infortunio';
  if (final.role === 'A') return 'attaccante: prezzo molto sensibile a bonus e aspettative';
  return 'pattern non spiegato dai soli dati disponibili';
}

function makeOutlier(final: SyntheticPlayerFinal, voteRows: NormalizedVoteRow[]): DeepOutlier {
  const stats = playerStats(voteRows, final);
  return {
    season: final.season,
    playerId: final.playerId,
    playerName: final.playerName,
    role: final.role,
    club: final.club,
    initialQuote: final.initialQuote,
    realCurrentOrFinalQuote: final.realCurrentOrFinalQuote,
    estimatedQaa: final.finalQaa,
    error: final.error,
    signedError: final.signedError,
    usefulAppearances: final.usefulAppearances,
    fantasyAverage: +stats.fantasyAverage.toFixed(3),
    goals: stats.goals,
    assists: stats.assists,
    yellowCards: stats.yellowCards,
    redCards: stats.redCards,
    ownGoals: stats.ownGoals,
    penaltiesMissed: stats.penaltiesMissed,
    drySpell: stats.drySpell,
    possibleCause: cause(final, stats),
  };
}

function evaluateParams(params: SyntheticQuoteParams, quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[], seasons: string[]): SyntheticPlayerFinal[] {
  return runSyntheticRoundQuoteModel(matchedQuotes(quoteRows, voteRows, seasons), seasonVotes(voteRows, seasons), params, seasons).finals;
}

function oracleFinals(quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[], seasons: string[]): SyntheticPlayerFinal[] {
  return matchedQuotes(quoteRows, voteRows, seasons).map(q => ({
    season: q.season,
    seasonStatus: q.seasonStatus,
    playerId: q.playerId,
    playerName: q.playerName,
    club: q.club,
    role: q.role,
    initialQuote: q.initialQuote,
    realCurrentOrFinalQuote: q.currentOrFinalQuote,
    finalQa: q.currentOrFinalQuote,
    finalQaa: q.currentOrFinalQuote,
    error: 0,
    signedError: 0,
    rounds: 38,
    usefulAppearances: voteRows.filter(v => v.season === q.season && String(v.playerId) === String(q.playerId) && v.played).length,
    presenceRateSeason: 1,
    presenceRateLast10: 1,
  }));
}

function finalMap(finals: SyntheticPlayerFinal[]): Map<string, SyntheticPlayerFinal> {
  return new Map(finals.map(f => [key(f), f]));
}

export function ensembleFinals(
  components: Array<{ finals: SyntheticPlayerFinal[]; weightByRole?: Partial<Record<PlayerRole, number>>; weight?: number }>,
): SyntheticPlayerFinal[] {
  const base = components[0].finals;
  const maps = components.map(c => ({ ...c, map: finalMap(c.finals) }));
  return base.map(row => {
    let weighted = 0;
    let totalWeight = 0;
    for (const component of maps) {
      const found = component.map.get(key(row));
      if (!found) continue;
      const weight = component.weightByRole?.[row.role] ?? component.weight ?? 1;
      weighted += found.finalQaa * weight;
      totalWeight += weight;
    }
    const finalQaa = totalWeight ? Math.round(weighted / totalWeight) : row.finalQaa;
    return {
      ...row,
      finalQaa,
      finalQa: finalQaa,
      error: Math.abs(finalQaa - row.realCurrentOrFinalQuote),
      signedError: finalQaa - row.realCurrentOrFinalQuote,
    };
  });
}

function randomParams(seed: number, base: SyntheticQuoteParams): SyntheticQuoteParams {
  let x = seed + 101;
  const rand = () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 0xffffffff;
  };
  const range = (min: number, max: number) => min + rand() * (max - min);
  return {
    ...base,
    lastPerformanceWeight: range(0.42, 0.7),
    fantasyAverageWeight: range(0.32, 0.62),
    presenceWeight: range(0.35, 0.9),
    adjustmentRate: range(0.48, 0.86),
    expectedStrength: range(1.1, 1.8),
    absencePenalty: range(-0.11, -0.02),
    offensiveBonusWeight: range(0, 0.28),
    recentOffensiveBonusWeight: range(0, 0.18),
    recentOffensiveBonusLast5Weight: range(0, 0.08),
    recentOffensiveBonusLast10Weight: range(0, 0.05),
    drySpellPenalty: range(0, 0.28),
    lowCostBreakoutWeight: range(0, 0.16),
    maxDailyMove: range(0.8, 2.4),
  };
}

function candidatesFor(modelId: DeepModelId): SyntheticQuoteParams[] {
  if (modelId === 'AGGRESSIVE') return [AGGRESSIVE_PARAMS];
  if (modelId === 'ROLE_BONUS_SENSITIVE') return [ROLE_BONUS_PARAMS];
  if (modelId === 'HYBRID_AGGRESSIVE_ATTACKER_BONUS') return [{
    ...AGGRESSIVE_PARAMS,
    roleOverrides: { A: ROLE_BONUS_PARAMS.roleOverrides!.A },
  }];
  if (modelId === 'ROLE_SPECIFIC_OPTIMIZED') {
    return [0, 1, 2, 3, 4, 5].map(i => ({
      ...randomParams(i, AGGRESSIVE_PARAMS),
      roleOverrides: {
        P: { adjustmentRate: 0.42 + i * 0.03, presenceWeight: 0.65 },
        D: { adjustmentRate: 0.5 + i * 0.02, fantasyAverageWeight: 0.5 },
        C: { offensiveBonusWeight: 0.1 + i * 0.02, recentOffensiveBonusWeight: 0.05 },
        A: { offensiveBonusWeight: 0.25 + i * 0.04, drySpellPenalty: 0.12 + i * 0.03, expectedStrength: 1.35 + i * 0.06 },
      },
    }));
  }
  if (modelId === 'QUOTE_BAND_OPTIMIZED') {
    return [0, 1, 2, 3, 4].map(i => ({
      ...AGGRESSIVE_PARAMS,
      quoteBandOverrides: {
        '1-5': { adjustmentRate: 0.65 + i * 0.04, lowCostBreakoutWeight: 0.1 + i * 0.02 },
        '6-10': { adjustmentRate: 0.6 + i * 0.03 },
        '11-20': { adjustmentRate: 0.54 + i * 0.02 },
        '21-35': { expectedStrength: 1.35 + i * 0.05 },
        '36+': { expectedStrength: 1.6 + i * 0.05, adjustmentRate: 0.42 },
      },
    }));
  }
  if (modelId === 'ROLE_AND_QUOTE_BAND_OPTIMIZED') {
    return [0, 1, 2, 3, 4].map(i => ({
      ...candidatesFor('ROLE_SPECIFIC_OPTIMIZED')[i],
      quoteBandOverrides: candidatesFor('QUOTE_BAND_OPTIMIZED')[i].quoteBandOverrides,
    }));
  }
  if (modelId === 'BONUS_FEATURE_OPTIMIZED') {
    return [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({
      ...AGGRESSIVE_PARAMS,
      offensiveBonusWeight: 0.08 + i * 0.03,
      recentOffensiveBonusWeight: 0.04 + i * 0.02,
      recentOffensiveBonusLast5Weight: 0.01 + i * 0.01,
      recentOffensiveBonusLast10Weight: 0.005 + i * 0.006,
      drySpellPenalty: 0.04 + i * 0.035,
      lowCostBreakoutWeight: 0.04 + i * 0.018,
      roleOverrides: { A: { expectedStrength: 1.35 + i * 0.05, drySpellPenalty: 0.08 + i * 0.04 } },
    }));
  }
  if (modelId === 'ROBUST_MODEL') {
    return [
      { ...AGGRESSIVE_PARAMS, maxDailyMove: 1.4, adjustmentRate: 0.62 },
      { ...ROLE_BONUS_PARAMS, maxDailyMove: 1.2, adjustmentRate: 0.54 },
      { ...AGGRESSIVE_PARAMS, maxDailyMove: 1.0, adjustmentRate: 0.58, offensiveBonusWeight: 0.08 },
    ];
  }
  return [AGGRESSIVE_PARAMS];
}

function chooseBestParams(modelId: DeepModelId, quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[], trainSeason: string): SyntheticQuoteParams {
  const candidates = [...candidatesFor(modelId), ...[0, 1, 2, 3, 4].map(i => randomParams(i + modelId.length * 10, candidatesFor(modelId)[0] ?? AGGRESSIVE_PARAMS))];
  return candidates
    .map(params => {
      const finals = evaluateParams(params, quoteRows, voteRows, [trainSeason]);
      const metrics = calculateCalibrationMetrics(finals);
      return { params, score: scoreModel(metrics, [metrics]).score };
    })
    .sort((a, b) => a.score - b.score)[0].params;
}

function evaluateModel(modelId: DeepModelId, quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[], seasons: string[], params?: SyntheticQuoteParams): SyntheticPlayerFinal[] {
  if (modelId === 'ORACLE_FINAL_ANCHOR') return oracleFinals(quoteRows, voteRows, seasons);
  if (modelId === 'ENSEMBLE_AVERAGE' || modelId === 'ENSEMBLE_ROLE_WEIGHTED') {
    const aggressive = evaluateParams(AGGRESSIVE_PARAMS, quoteRows, voteRows, seasons);
    const roleBonus = evaluateParams(ROLE_BONUS_PARAMS, quoteRows, voteRows, seasons);
    const bonus = evaluateParams(candidatesFor('BONUS_FEATURE_OPTIMIZED')[3], quoteRows, voteRows, seasons);
    if (modelId === 'ENSEMBLE_ROLE_WEIGHTED') {
      return ensembleFinals([
        { finals: aggressive, weightByRole: { P: 0.55, D: 0.55, C: 0.35, A: 0.2 } },
        { finals: roleBonus, weightByRole: { P: 0.15, D: 0.25, C: 0.35, A: 0.55 } },
        { finals: bonus, weightByRole: { P: 0.3, D: 0.2, C: 0.3, A: 0.25 } },
      ]);
    }
    return ensembleFinals([{ finals: aggressive }, { finals: roleBonus }, { finals: bonus }]);
  }
  return evaluateParams(params ?? candidatesFor(modelId)[0], quoteRows, voteRows, seasons);
}

function buildResult(modelId: DeepModelId, quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[]): DeepModelResult {
  const operational = modelId !== 'ORACLE_FINAL_ANCHOR';
  const folds = [
    { trainSeason: '2023/24', validationSeason: '2024/25' },
    { trainSeason: '2024/25', validationSeason: '2023/24' },
  ];
  const foldRows: DeepModelResult['folds'] = [];
  const validationFinals: SyntheticPlayerFinal[] = [];
  let selectedParams: SyntheticQuoteParams | null = null;
  for (const fold of folds) {
    const params = operational && !modelId.startsWith('ENSEMBLE') ? chooseBestParams(modelId, quoteRows, voteRows, fold.trainSeason) : null;
    if (!selectedParams && params) selectedParams = params;
    const trainFinals = operational && !modelId.startsWith('ENSEMBLE')
      ? evaluateParams(params!, quoteRows, voteRows, [fold.trainSeason])
      : evaluateModel(modelId, quoteRows, voteRows, [fold.trainSeason], params ?? undefined);
    const valFinals = operational && !modelId.startsWith('ENSEMBLE')
      ? evaluateParams(params!, quoteRows, voteRows, [fold.validationSeason])
      : evaluateModel(modelId, quoteRows, voteRows, [fold.validationSeason], params ?? undefined);
    validationFinals.push(...valFinals);
    foldRows.push({ trainSeason: fold.trainSeason, validationSeason: fold.validationSeason, train: calculateCalibrationMetrics(trainFinals), validation: calculateCalibrationMetrics(valFinals) });
  }
  const aggregateValidation = calculateCalibrationMetrics(validationFinals);
  const score = scoreModel(aggregateValidation, foldRows.map(f => f.validation));
  const outliers = validationFinals.map(f => makeOutlier(f, voteRows));
  return {
    modelId,
    operational,
    usesFinalQuoteInDailySimulation: !operational,
    description: modelId === 'ORACLE_FINAL_ANCHOR' ? 'Benchmark teorico non operativo con Qt.A finale.' : 'Modello operativo stimato senza Qt.A nel calcolo giornaliero.',
    params: selectedParams,
    folds: foldRows,
    aggregateValidation,
    score,
    validationFinals,
    bySeason: breakdown(validationFinals, f => f.season, COMPLETED),
    byRole: breakdown(validationFinals, f => f.role, ['P', 'D', 'C', 'A']),
    byQuoteBand: breakdown(validationFinals, f => getQuoteBand(f.initialQuote), quoteBandOrder()),
    byGrowth: breakdown(validationFinals, growthBucket, ['forte crescita', 'stabile', 'forte calo']),
    byPresence: breakdown(validationFinals, presenceBucket, ['poche presenze', 'presenze medie', 'alta continuita']),
    topWorstErrors: [...outliers].sort((a, b) => b.error - a.error).slice(0, 30),
    topBestEstimates: [...outliers].sort((a, b) => a.error - b.error).slice(0, 30),
    topOverEstimates: [...outliers].sort((a, b) => b.signedError - a.signedError).slice(0, 20),
    topUnderEstimates: [...outliers].sort((a, b) => a.signedError - b.signedError).slice(0, 20),
  };
}

function byRoleMae(model: DeepModelResult, role: PlayerRole): number {
  return model.byRole.find(r => r.key === role)?.mae ?? 0;
}

export function runSyntheticQuoteDeepOptimizer(quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[]): DeepOptimizerReport {
  const modelIds: DeepModelId[] = [
    'AGGRESSIVE',
    'ROLE_BONUS_SENSITIVE',
    'HYBRID_AGGRESSIVE_ATTACKER_BONUS',
    'ROLE_SPECIFIC_OPTIMIZED',
    'QUOTE_BAND_OPTIMIZED',
    'ROLE_AND_QUOTE_BAND_OPTIMIZED',
    'BONUS_FEATURE_OPTIMIZED',
    'ENSEMBLE_AVERAGE',
    'ENSEMBLE_ROLE_WEIGHTED',
    'ROBUST_MODEL',
    'ORACLE_FINAL_ANCHOR',
  ];
  const models = modelIds.map(id => buildResult(id, quoteRows, voteRows));
  const operational = models.filter(m => m.operational);
  const bestPure = [...operational].sort((a, b) => a.aggregateValidation.mae - b.aggregateValidation.mae)[0];
  const bestRobust = [...operational].sort((a, b) => a.score.score - b.score.score)[0];
  const bestAttacker = [...operational].sort((a, b) => byRoleMae(a, 'A') - byRoleMae(b, 'A'))[0];
  const previewFinals = evaluateModel(bestRobust.modelId, quoteRows, voteRows, IN_PROGRESS, bestRobust.params ?? undefined);
  const preview2025 = previewFinals.length ? { modelId: bestRobust.modelId, metrics: calculateCalibrationMetrics(previewFinals) } : null;
  return {
    generatedAt: new Date().toISOString(),
    title: 'Synthetic Quote Deep Optimization Study',
    officialModel: false,
    completedSeasons: COMPLETED,
    inProgressSeasons: IN_PROGRESS,
    previousBest: { modelId: 'AGGRESSIVE', mae: 2.04, rmse: 3.05, within2Pct: 71.72, attackerMae: 2.68 },
    models,
    bestPureErrorModel: bestPure.modelId,
    bestRobustModel: bestRobust.modelId,
    bestAttackerModel: bestAttacker.modelId,
    recommendedOperationalModel: bestRobust.modelId,
    preview2025,
    targets: {
      maeUnder2: bestRobust.aggregateValidation.mae < 2,
      rmseUnder3: bestRobust.aggregateValidation.rmse < 3,
      within2AtLeast75: bestRobust.aggregateValidation.within2Pct >= 75,
      attackerMaeUnder250: byRoleMae(bestAttacker, 'A') < 2.5,
    },
  };
}

function fmt(n: number, d = 2): string {
  return n.toFixed(d);
}

export function makeSyntheticQuoteDeepOptimizerCsv(report: DeepOptimizerReport): string {
  const headers = ['modelId', 'operational', 'score', 'mae', 'rmse', 'medianAbsError', 'within1Pct', 'within2Pct', 'within3Pct', 'bias', 'instabilityPenalty', 'attackerMae'];
  const rows = report.models.map(m => [
    m.modelId, m.operational, fmt(m.score.score, 4), fmt(m.aggregateValidation.mae, 4), fmt(m.aggregateValidation.rmse, 4),
    fmt(m.aggregateValidation.medianAbsError, 4), fmt(m.aggregateValidation.within1Pct, 4), fmt(m.aggregateValidation.within2Pct, 4),
    fmt(m.aggregateValidation.within3Pct, 4), fmt(m.aggregateValidation.avgSignedError, 4), fmt(m.score.instabilityPenalty, 4), fmt(byRoleMae(m, 'A'), 4),
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function breakdownTable(rows: DeepBreakdown[]): string[] {
  const lines = ['| Cluster | N | MAE | RMSE | Mediana | Bias | Entro 1 | Entro 2 | Entro 3 |', '|---------|---|-----|------|---------|------|---------|---------|---------|'];
  rows.forEach(r => lines.push(`| ${r.key} | ${r.count} | ${fmt(r.mae)} | ${fmt(r.rmse)} | ${fmt(r.medianAbsError)} | ${fmt(r.bias)} | ${fmt(r.within1Pct)}% | ${fmt(r.within2Pct)}% | ${fmt(r.within3Pct)}% |`));
  return lines;
}

function outlierTable(rows: DeepOutlier[]): string[] {
  const lines = ['| Stagione | Id | Nome | R | Squadra | QI | Qt.A | QAA | Err | Pres | FM | G | A | Causa |', '|----------|----|------|---|---------|----|------|-----|-----|------|----|---|---|-------|'];
  rows.forEach(r => lines.push(`| ${r.season} | ${r.playerId} | ${r.playerName} | ${r.role} | ${r.club} | ${r.initialQuote} | ${r.realCurrentOrFinalQuote} | ${r.estimatedQaa} | ${fmt(r.error)} | ${r.usefulAppearances} | ${fmt(r.fantasyAverage)} | ${r.goals} | ${r.assists} | ${r.possibleCause} |`));
  return lines;
}

export function buildSyntheticQuoteDeepOptimizerMarkdown(report: DeepOptimizerReport): string {
  const rec = report.models.find(m => m.modelId === report.recommendedOperationalModel)!;
  const pure = report.models.find(m => m.modelId === report.bestPureErrorModel)!;
  const attacker = report.models.find(m => m.modelId === report.bestAttackerModel)!;
  const lines: string[] = [];
  lines.push('# Synthetic Quote Deep Optimization Study');
  lines.push('');
  lines.push('## Executive summary');
  lines.push('');
  lines.push('Questo e un modello stimato, non ufficiale Fantacalcio. Qt.A finale non e usata nel calcolo giornaliero operativo: serve solo per valutazione e calibrazione dopo la simulazione. ORACLE_FINAL_ANCHOR e solo benchmark teorico non utilizzabile live.');
  lines.push('');
  lines.push(`Miglior modello robusto e raccomandato: **${report.recommendedOperationalModel}**. Miglior errore puro: **${report.bestPureErrorModel}**. Miglior modello attaccanti: **${report.bestAttackerModel}**.`);
  lines.push('');
  lines.push('## Precedente vs nuovo migliore');
  lines.push('');
  lines.push('| Modello | MAE | RMSE | Entro 2 | MAE attaccanti |');
  lines.push('|---------|-----|------|---------|----------------|');
  lines.push(`| Precedente AGGRESSIVE | ${fmt(report.previousBest.mae)} | ${fmt(report.previousBest.rmse)} | ${fmt(report.previousBest.within2Pct)}% | ${fmt(report.previousBest.attackerMae)} |`);
  lines.push(`| Nuovo raccomandato ${rec.modelId} | ${fmt(rec.aggregateValidation.mae)} | ${fmt(rec.aggregateValidation.rmse)} | ${fmt(rec.aggregateValidation.within2Pct)}% | ${fmt(byRoleMae(rec, 'A'))} |`);
  lines.push(`| Miglior errore puro ${pure.modelId} | ${fmt(pure.aggregateValidation.mae)} | ${fmt(pure.aggregateValidation.rmse)} | ${fmt(pure.aggregateValidation.within2Pct)}% | ${fmt(byRoleMae(pure, 'A'))} |`);
  lines.push('');
  lines.push('## Tabella modelli');
  lines.push('');
  lines.push('| Modello | Operativo | Score | MAE | RMSE | Mediana | Entro 1 | Entro 2 | Entro 3 | Bias | Instabilita | MAE A |');
  lines.push('|---------|-----------|-------|-----|------|---------|---------|---------|---------|------|-------------|-------|');
  report.models.forEach(m => lines.push(`| ${m.modelId} | ${m.operational ? 'si' : 'no'} | ${fmt(m.score.score)} | ${fmt(m.aggregateValidation.mae)} | ${fmt(m.aggregateValidation.rmse)} | ${fmt(m.aggregateValidation.medianAbsError)} | ${fmt(m.aggregateValidation.within1Pct)}% | ${fmt(m.aggregateValidation.within2Pct)}% | ${fmt(m.aggregateValidation.within3Pct)}% | ${fmt(m.aggregateValidation.avgSignedError)} | ${fmt(m.score.instabilityPenalty)} | ${fmt(byRoleMae(m, 'A'))} |`));
  lines.push('');
  lines.push('Score usato: MAE*0.40 + RMSE*0.25 - entro2punti*0.015 + |bias|*0.10 + instabilita*0.10 + outlier>5*0.01. Lo score penalizza outlier, bias e instabilita tra fold.');
  lines.push('');
  lines.push('## Tabella modelli per ruolo');
  lines.push('');
  lines.push('| Modello | P MAE | D MAE | C MAE | A MAE |');
  lines.push('|---------|-------|-------|-------|-------|');
  report.models.forEach(m => lines.push(`| ${m.modelId} | ${fmt(byRoleMae(m, 'P'))} | ${fmt(byRoleMae(m, 'D'))} | ${fmt(byRoleMae(m, 'C'))} | ${fmt(byRoleMae(m, 'A'))} |`));
  lines.push('');
  lines.push('## Tabella modelli per fascia prezzo');
  lines.push('');
  lines.push(...breakdownTable(rec.byQuoteBand));
  lines.push('');
  lines.push('## Error analysis modello raccomandato');
  lines.push('');
  lines.push('### Per stagione');
  lines.push(...breakdownTable(rec.bySeason));
  lines.push('');
  lines.push('### Per ruolo');
  lines.push(...breakdownTable(rec.byRole));
  lines.push('');
  lines.push('### Per crescita/calo');
  lines.push(...breakdownTable(rec.byGrowth));
  lines.push('');
  lines.push('### Per presenze');
  lines.push(...breakdownTable(rec.byPresence));
  lines.push('');
  lines.push('## Analisi profonda attaccanti');
  lines.push('');
  lines.push(`Il miglior modello attaccanti e **${attacker.modelId}** con MAE ${fmt(byRoleMae(attacker, 'A'))}. Gli attaccanti restano il cluster piu delicato perche gol, assist e dry spell spostano le aspettative piu rapidamente del voto medio. I top player senza bonus tendono a essere sovrastimati; i low-cost in breakout tendono a essere sottostimati se i bonus arrivano concentrati.`);
  lines.push('');
  lines.push('## Analisi bonus gol/assist');
  lines.push('');
  lines.push('Lo studio usa gol, assist, bonus offensivi recenti last5/last10 e dry spell solo come feature operative derivate dai voti gia disponibili. Non usa rigori segnati o minuti se non presenti nei dati importati.');
  lines.push('');
  lines.push('## Analisi outlier');
  lines.push('');
  lines.push('### Top 30 peggiori errori');
  lines.push(...outlierTable(rec.topWorstErrors));
  lines.push('');
  lines.push('### Top 30 migliori stime');
  lines.push(...outlierTable(rec.topBestEstimates));
  lines.push('');
  lines.push('### Top 20 sovrastime');
  lines.push(...outlierTable(rec.topOverEstimates));
  lines.push('');
  lines.push('### Top 20 sottostime');
  lines.push(...outlierTable(rec.topUnderEstimates));
  lines.push('');
  lines.push('## Rischio overfitting');
  lines.push('');
  lines.push(`Instabilita del modello raccomandato tra fold: ${fmt(rec.score.instabilityPenalty)} punti MAE. 2025/26 resta solo preview in_progress e non entra nella raccomandazione definitiva.`);
  if (report.preview2025) {
    lines.push(`Preview 2025/26 con ${report.preview2025.modelId}: MAE ${fmt(report.preview2025.metrics.mae)}, RMSE ${fmt(report.preview2025.metrics.rmse)}, entro2 ${fmt(report.preview2025.metrics.within2Pct)}%.`);
  }
  lines.push('');
  lines.push('## Target');
  lines.push('');
  lines.push(`- MAE totale < 2.00: ${report.targets.maeUnder2 ? 'raggiunto' : 'non raggiunto'}.`);
  lines.push(`- RMSE < 3.00: ${report.targets.rmseUnder3 ? 'raggiunto' : 'non raggiunto'}.`);
  lines.push(`- Entro 2 punti >= 75%: ${report.targets.within2AtLeast75 ? 'raggiunto' : 'non raggiunto'}.`);
  lines.push(`- MAE attaccanti < 2.50: ${report.targets.attackerMaeUnder250 ? 'raggiunto' : 'non raggiunto'}.`);
  lines.push('');
  lines.push('## Modello operativo raccomandato');
  lines.push('');
  lines.push(`Raccomandazione: **${report.recommendedOperationalModel}**. Il backtest intra-stagione deve restare esplorativo: l errore e migliorato, ma mancano quotazioni ufficiali giornata per giornata e molte feature operative reali.`);
  lines.push('');
  lines.push('## Prossimi dati necessari');
  lines.push('');
  lines.push('- quotazioni reali giornata per giornata;');
  lines.push('- minuti giocati;');
  lines.push('- rigori segnati/subiti;');
  lines.push('- titolarita;');
  lines.push('- infortuni/squalifiche;');
  lines.push('- data ingresso lista.');
  return lines.join('\n');
}
