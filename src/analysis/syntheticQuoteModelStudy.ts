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
import { calculateCalibrationMetrics, CalibrationMetrics } from './syntheticQuoteCalibration';

export type SyntheticQuoteStudyModelId =
  | 'BASELINE'
  | 'ROLE_SPECIFIC'
  | 'QUOTE_BANDS'
  | 'APPEARANCE_ADJUSTED'
  | 'ATTACKER_TUNED'
  | 'ATTACKER_BONUS_SENSITIVE'
  | 'ROLE_BONUS_SENSITIVE'
  | 'HYBRID_ROLE_QUOTE_APPEARANCE'
  | 'HYBRID_ROLE_QUOTE_BONUS'
  | 'CONSERVATIVE'
  | 'AGGRESSIVE'
  | 'ORACLE_FINAL_ANCHOR';

export interface StudyBreakdownRow {
  key: string;
  count: number;
  mae: number;
  medianAbsError: number;
  rmse: number;
  bias: number;
  within1Pct: number;
  within2Pct: number;
  within3Pct: number;
}

export interface StudyModelResult {
  modelId: SyntheticQuoteStudyModelId;
  operational: boolean;
  usesFinalQuoteInDailySimulation: boolean;
  description: string;
  selectedParams: SyntheticQuoteParams | null;
  trainSeasonResults: Array<{ trainSeason: string; validationSeason: string; train: CalibrationMetrics; validation: CalibrationMetrics }>;
  aggregateValidation: CalibrationMetrics;
  bySeason: StudyBreakdownRow[];
  byRole: StudyBreakdownRow[];
  byQuoteBand: StudyBreakdownRow[];
  byPresence: StudyBreakdownRow[];
  growthDecline: StudyBreakdownRow[];
  bestEstimates: SyntheticPlayerFinal[];
  worstEstimates: SyntheticPlayerFinal[];
  validationFinals: SyntheticPlayerFinal[];
}

export interface OffensiveCorrelationRow {
  role: string;
  count: number;
  goalsToRealQuoteDiff: number;
  assistsToRealQuoteDiff: number;
  offensiveBonusToRealQuoteDiff: number;
  recentOffensiveBonusToEstimatedDiff: number;
}

export interface AttackerComparison {
  modelId: SyntheticQuoteStudyModelId;
  attackerMae: number;
  attackerBias: number;
  deltaVsBaseline: number;
}

export interface SyntheticQuoteModelStudyReport {
  generatedAt: string;
  title: 'Synthetic Quote Model Improvement Study';
  officialModel: false;
  completedSeasons: string[];
  inProgressSeasons: string[];
  models: StudyModelResult[];
  recommendedOperationalModel: SyntheticQuoteStudyModelId;
  bestByRole: Record<PlayerRole, SyntheticQuoteStudyModelId>;
  attackerComparison: AttackerComparison[];
  offensiveCorrelations: OffensiveCorrelationRow[];
  attackerImprovedExamples: Array<{ playerName: string; club: string; season: string; baselineError: number; improvedError: number; delta: number }>;
  attackerWorsenedExamples: Array<{ playerName: string; club: string; season: string; baselineError: number; improvedError: number; delta: number }>;
  targets: {
    maeUnder2: boolean;
    rmseUnder3: boolean;
    within2AtLeast70: boolean;
    attackerMaeUnder3: boolean;
  };
}

const COMPLETED_SEASONS = ['2023/24', '2024/25'];
const IN_PROGRESS_SEASONS = ['2025/26'];

export const BASELINE_STUDY_PARAMS: SyntheticQuoteParams = {
  lastPerformanceWeight: 0.46,
  fantasyAverageWeight: 0.38,
  presenceWeight: 0.45,
  adjustmentRate: 0.56,
  expectedStrength: 1.25,
  absencePenalty: -0.05,
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function rmse(values: number[]): number {
  return values.length ? Math.sqrt(mean(values.map(value => value ** 2))) : 0;
}

function pct(values: number[], predicate: (value: number) => boolean): number {
  return values.length ? values.filter(predicate).length / values.length * 100 : 0;
}

function pearson(xs: number[], ys: number[]): number {
  if (xs.length < 2 || xs.length !== ys.length) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  const cov = mean(xs.map((x, i) => (x - mx) * (ys[i] - my)));
  const sx = Math.sqrt(mean(xs.map(x => (x - mx) ** 2)));
  const sy = Math.sqrt(mean(ys.map(y => (y - my) ** 2)));
  return sx && sy ? cov / (sx * sy) : 0;
}

function key(row: { season: string; playerId: number | string }): string {
  return `${row.season}|${row.playerId}`;
}

function matchedQuotes(quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[], seasons: string[]): NormalizedQuoteRow[] {
  const voteKeys = new Set(voteRows.filter(row => seasons.includes(row.season)).map(key));
  return quoteRows.filter(row => seasons.includes(row.season) && voteKeys.has(key(row)));
}

function votesFor(voteRows: NormalizedVoteRow[], seasons: string[]): NormalizedVoteRow[] {
  return voteRows.filter(row => seasons.includes(row.season));
}

function summarize(label: string, rows: SyntheticPlayerFinal[]): StudyBreakdownRow {
  const errors = rows.map(row => row.error);
  return {
    key: label,
    count: rows.length,
    mae: mean(errors),
    medianAbsError: median(errors),
    rmse: rmse(errors),
    bias: mean(rows.map(row => row.signedError)),
    within1Pct: pct(errors, error => error <= 1),
    within2Pct: pct(errors, error => error <= 2),
    within3Pct: pct(errors, error => error <= 3),
  };
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
  return 'stabile/moderato';
}

function breakdown(finals: SyntheticPlayerFinal[], group: (row: SyntheticPlayerFinal) => string, order: string[]): StudyBreakdownRow[] {
  return order.map(label => summarize(label, finals.filter(row => group(row) === label)));
}

function modelCandidates(modelId: SyntheticQuoteStudyModelId): Array<{ description: string; params: SyntheticQuoteParams | null }> {
  const baseline = BASELINE_STUDY_PARAMS;
  const p = (overrides: Partial<SyntheticQuoteParams>): SyntheticQuoteParams => ({ ...baseline, ...overrides });
  switch (modelId) {
    case 'BASELINE':
      return [{ description: 'Modello attuale calibrato sui report precedenti.', params: baseline }];
    case 'ROLE_SPECIFIC':
      return [
        { description: 'Override moderati per ruolo.', params: p({ roleOverrides: { P: { presenceWeight: 0.55 }, D: { fantasyAverageWeight: 0.42 }, C: { lastPerformanceWeight: 0.52 }, A: { expectedStrength: 1.45, lastPerformanceWeight: 0.55 } } }) },
        { description: 'Ruoli offensivi piu reattivi.', params: p({ roleOverrides: { C: { offensiveBonusWeight: 0.08 }, A: { offensiveBonusWeight: 0.16, recentOffensiveBonusWeight: 0.08 } } }) },
      ];
    case 'QUOTE_BANDS':
      return [
        { description: 'Low cost piu elastici, top piu severi.', params: p({ quoteBandOverrides: { '1-5': { adjustmentRate: 0.66 }, '6-10': { adjustmentRate: 0.62 }, '21-35': { expectedStrength: 1.35 }, '36+': { expectedStrength: 1.55, adjustmentRate: 0.46 } } }) },
      ];
    case 'APPEARANCE_ADJUSTED':
      return [
        { description: 'Peso maggiore a continuita presenze.', params: p({ presenceWeight: 0.78, fantasyAverageWeight: 0.32, absencePenalty: -0.08 }) },
        { description: 'Continuita alta, movimenti controllati.', params: p({ presenceWeight: 0.9, adjustmentRate: 0.48, absencePenalty: -0.06 }) },
      ];
    case 'ATTACKER_TUNED':
      return [
        { description: 'Expected curve piu severa per attaccanti top.', params: p({ roleOverrides: { A: { expectedStrength: 1.65, lastPerformanceWeight: 0.58, fantasyAverageWeight: 0.48 } }, expectedCurve: { A: { base: 5.82, slope: 0.045, min: 5.5, max: 7.65 } } }) },
        { description: 'Attaccanti piu rapidi ma penalizzati da assenze.', params: p({ roleOverrides: { A: { adjustmentRate: 0.68, absencePenalty: -0.09, expectedStrength: 1.55 } } }) },
      ];
    case 'ATTACKER_BONUS_SENSITIVE':
      return [
        { description: 'Attaccanti sensibili a gol, assist, bonus recenti e dry spell.', params: p({ roleOverrides: { A: { offensiveBonusWeight: 0.34, recentOffensiveBonusWeight: 0.13, drySpellPenalty: 0.22, lowCostBreakoutWeight: 0.08, expectedStrength: 1.55 } }, expectedCurve: { A: { base: 5.8, slope: 0.046, min: 5.45, max: 7.75 } } }) },
        { description: 'Attaccanti bonus-driven aggressivi.', params: p({ roleOverrides: { A: { offensiveBonusWeight: 0.48, recentOffensiveBonusWeight: 0.18, drySpellPenalty: 0.28, lowCostBreakoutWeight: 0.12, adjustmentRate: 0.62 } }, expectedCurve: { A: { base: 5.85, slope: 0.05, min: 5.5, max: 7.85 } } }) },
      ];
    case 'ROLE_BONUS_SENSITIVE':
      return [
        { description: 'Bonus/malus differenziati per ruolo.', params: p({ roleOverrides: { P: { presenceWeight: 0.65 }, D: { offensiveBonusWeight: 0.08, recentOffensiveBonusWeight: 0.04 }, C: { offensiveBonusWeight: 0.16, recentOffensiveBonusWeight: 0.08 }, A: { offensiveBonusWeight: 0.34, recentOffensiveBonusWeight: 0.14, drySpellPenalty: 0.2, expectedStrength: 1.5 } } }) },
      ];
    case 'HYBRID_ROLE_QUOTE_APPEARANCE':
      return [
        { description: 'Ruolo, fascia prezzo e continuita combinati.', params: p({ presenceWeight: 0.7, roleOverrides: { A: { expectedStrength: 1.5 }, C: { offensiveBonusWeight: 0.08 } }, quoteBandOverrides: { '1-5': { adjustmentRate: 0.68 }, '36+': { adjustmentRate: 0.44, expectedStrength: 1.65 } } }) },
      ];
    case 'HYBRID_ROLE_QUOTE_BONUS':
      return [
        { description: 'Ruolo, fascia prezzo e bonus reali.', params: p({ roleOverrides: { C: { offensiveBonusWeight: 0.14, recentOffensiveBonusWeight: 0.07 }, A: { offensiveBonusWeight: 0.4, recentOffensiveBonusWeight: 0.16, drySpellPenalty: 0.24, lowCostBreakoutWeight: 0.1 } }, quoteBandOverrides: { '1-5': { adjustmentRate: 0.7 }, '6-10': { adjustmentRate: 0.64 }, '36+': { expectedStrength: 1.7, adjustmentRate: 0.46 } }, expectedCurve: { A: { base: 5.84, slope: 0.048, min: 5.5, max: 7.85 } } }) },
      ];
    case 'CONSERVATIVE':
      return [
        { description: 'Movimenti piu lenti e meno estremi.', params: p({ adjustmentRate: 0.36, lastPerformanceWeight: 0.34, fantasyAverageWeight: 0.26, presenceWeight: 0.35, absencePenalty: -0.03 }) },
      ];
    case 'AGGRESSIVE':
      return [
        { description: 'Movimenti rapidi per breakout.', params: p({ adjustmentRate: 0.76, lastPerformanceWeight: 0.58, fantasyAverageWeight: 0.48, presenceWeight: 0.55, lowCostBreakoutWeight: 0.1, offensiveBonusWeight: 0.12 }) },
      ];
    case 'ORACLE_FINAL_ANCHOR':
      return [{ description: 'Benchmark teorico: usa Qt.A finale dopo la simulazione, non utilizzabile live.', params: null }];
  }
}

function evaluateParams(
  modelId: SyntheticQuoteStudyModelId,
  params: SyntheticQuoteParams | null,
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
  seasons: string[],
): SyntheticPlayerFinal[] {
  if (modelId === 'ORACLE_FINAL_ANCHOR') {
    return matchedQuotes(quoteRows, voteRows, seasons).map(row => ({
      season: row.season,
      seasonStatus: row.seasonStatus,
      playerId: row.playerId,
      playerName: row.playerName,
      club: row.club,
      role: row.role,
      initialQuote: row.initialQuote,
      realCurrentOrFinalQuote: row.currentOrFinalQuote,
      finalQa: row.currentOrFinalQuote,
      finalQaa: row.currentOrFinalQuote,
      error: 0,
      signedError: 0,
      rounds: [...new Set(voteRows.filter(v => v.season === row.season).map(v => v.round))].length,
      usefulAppearances: voteRows.filter(v => v.season === row.season && String(v.playerId) === String(row.playerId) && v.played).length,
      presenceRateSeason: 1,
      presenceRateLast10: 1,
    }));
  }
  const result = runSyntheticRoundQuoteModel(
    matchedQuotes(quoteRows, voteRows, seasons),
    votesFor(voteRows, seasons),
    params!,
    seasons,
  );
  return result.finals;
}

function selectBestCandidate(modelId: SyntheticQuoteStudyModelId, quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[], trainSeason: string) {
  const candidates = modelCandidates(modelId);
  return candidates
    .map(candidate => {
      const finals = evaluateParams(modelId, candidate.params, quoteRows, voteRows, [trainSeason]);
      const metrics = calculateCalibrationMetrics(finals);
      const score = metrics.mae * 1.7 + metrics.rmse * 0.8 - metrics.within2Pct * 0.01;
      return { ...candidate, metrics, score };
    })
    .sort((a, b) => a.score - b.score)[0];
}

function buildModelResult(modelId: SyntheticQuoteStudyModelId, quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[]): StudyModelResult {
  const folds = [
    { trainSeason: '2023/24', validationSeason: '2024/25' },
    { trainSeason: '2024/25', validationSeason: '2023/24' },
  ];
  const trainSeasonResults: StudyModelResult['trainSeasonResults'] = [];
  const validationFinals: SyntheticPlayerFinal[] = [];
  const selected = selectBestCandidate(modelId, quoteRows, voteRows, '2023/24');
  for (const fold of folds) {
    const best = selectBestCandidate(modelId, quoteRows, voteRows, fold.trainSeason);
    const validatedFinals = evaluateParams(modelId, best.params, quoteRows, voteRows, [fold.validationSeason]);
    validationFinals.push(...validatedFinals);
    trainSeasonResults.push({
      trainSeason: fold.trainSeason,
      validationSeason: fold.validationSeason,
      train: best.metrics,
      validation: calculateCalibrationMetrics(validatedFinals),
    });
  }
  const aggregateValidation = calculateCalibrationMetrics(validationFinals);
  const bestEstimates = [...validationFinals].sort((a, b) => a.error - b.error).slice(0, 20);
  const worstEstimates = [...validationFinals].sort((a, b) => b.error - a.error).slice(0, 20);
  return {
    modelId,
    operational: modelId !== 'ORACLE_FINAL_ANCHOR',
    usesFinalQuoteInDailySimulation: modelId === 'ORACLE_FINAL_ANCHOR',
    description: selected.description,
    selectedParams: selected.params,
    trainSeasonResults,
    aggregateValidation,
    bySeason: breakdown(validationFinals, row => row.season, COMPLETED_SEASONS),
    byRole: breakdown(validationFinals, row => row.role, ['P', 'D', 'C', 'A']),
    byQuoteBand: breakdown(validationFinals, row => getQuoteBand(row.initialQuote), ['1-5', '6-10', '11-20', '21-35', '36+']),
    byPresence: breakdown(validationFinals, presenceBucket, ['poche presenze', 'presenze medie', 'alta continuita']),
    growthDecline: breakdown(validationFinals, growthBucket, ['forte crescita', 'stabile/moderato', 'forte calo']),
    bestEstimates,
    worstEstimates,
    validationFinals,
  };
}

function offensiveCorrelations(quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[]): OffensiveCorrelationRow[] {
  const completedQuotes = matchedQuotes(quoteRows, voteRows, COMPLETED_SEASONS);
  return ['ALL', 'P', 'D', 'C', 'A'].map(role => {
    const rows = role === 'ALL' ? completedQuotes : completedQuotes.filter(row => row.role === role);
    const data = rows.map(row => {
      const votes = voteRows.filter(v => v.season === row.season && String(v.playerId) === String(row.playerId));
      const metrics = calculateOffensiveMetrics(votes);
      return {
        goals: metrics.goals,
        assists: metrics.assists,
        offensiveBonus: metrics.goals + metrics.assists * 0.55,
        recent: metrics.recentOffensiveBonusLast10,
        realDiff: row.currentOrFinalQuote - row.initialQuote,
      };
    });
    return {
      role,
      count: data.length,
      goalsToRealQuoteDiff: pearson(data.map(d => d.goals), data.map(d => d.realDiff)),
      assistsToRealQuoteDiff: pearson(data.map(d => d.assists), data.map(d => d.realDiff)),
      offensiveBonusToRealQuoteDiff: pearson(data.map(d => d.offensiveBonus), data.map(d => d.realDiff)),
      recentOffensiveBonusToEstimatedDiff: pearson(data.map(d => d.recent), data.map(d => d.realDiff)),
    };
  });
}

function rowByRole(model: StudyModelResult, role: PlayerRole): StudyBreakdownRow {
  return model.byRole.find(row => row.key === role) ?? summarize(role, []);
}

function attackerExamples(baseline: StudyModelResult, improved: StudyModelResult) {
  const improvedMap = new Map(improved.validationFinals.map(row => [key(row), row]));
  const candidates = baseline.validationFinals
    .filter(row => row.role === 'A' && improvedMap.has(key(row)))
    .map(row => {
      const other = improvedMap.get(key(row))!;
      return { playerName: row.playerName, club: row.club, season: row.season, baselineError: row.error, improvedError: other.error, delta: row.error - other.error };
    });
  const improvedExamples = [...candidates].sort((a, b) => b.delta - a.delta).slice(0, 10);
  const worsenedExamples = [...candidates].sort((a, b) => a.delta - b.delta).slice(0, 10);
  return { improvedExamples, worsenedExamples };
}

export function runSyntheticQuoteModelStudy(quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[]): SyntheticQuoteModelStudyReport {
  const modelIds: SyntheticQuoteStudyModelId[] = [
    'BASELINE',
    'ROLE_SPECIFIC',
    'QUOTE_BANDS',
    'APPEARANCE_ADJUSTED',
    'ATTACKER_TUNED',
    'ATTACKER_BONUS_SENSITIVE',
    'ROLE_BONUS_SENSITIVE',
    'HYBRID_ROLE_QUOTE_APPEARANCE',
    'HYBRID_ROLE_QUOTE_BONUS',
    'CONSERVATIVE',
    'AGGRESSIVE',
    'ORACLE_FINAL_ANCHOR',
  ];
  const models = modelIds.map(modelId => buildModelResult(modelId, quoteRows, voteRows));
  const operationalModels = models.filter(model => model.operational);
  const recommended = [...operationalModels].sort((a, b) => a.aggregateValidation.mae - b.aggregateValidation.mae)[0];
  const baseline = models.find(model => model.modelId === 'BASELINE')!;
  const bestAttackerModel = [...operationalModels].sort((a, b) => rowByRole(a, 'A').mae - rowByRole(b, 'A').mae)[0];
  const examples = attackerExamples(baseline, bestAttackerModel);
  const bestByRole = (['P', 'D', 'C', 'A'] as PlayerRole[]).reduce((out, role) => {
    out[role] = [...operationalModels].sort((a, b) => rowByRole(a, role).mae - rowByRole(b, role).mae)[0].modelId;
    return out;
  }, {} as Record<PlayerRole, SyntheticQuoteStudyModelId>);
  const attackerComparison = operationalModels
    .filter(model => ['BASELINE', 'ATTACKER_TUNED', 'ATTACKER_BONUS_SENSITIVE', 'ROLE_BONUS_SENSITIVE'].includes(model.modelId))
    .map(model => ({
      modelId: model.modelId,
      attackerMae: rowByRole(model, 'A').mae,
      attackerBias: rowByRole(model, 'A').bias,
      deltaVsBaseline: rowByRole(baseline, 'A').mae - rowByRole(model, 'A').mae,
    }));
  return {
    generatedAt: new Date().toISOString(),
    title: 'Synthetic Quote Model Improvement Study',
    officialModel: false,
    completedSeasons: COMPLETED_SEASONS,
    inProgressSeasons: IN_PROGRESS_SEASONS,
    models,
    recommendedOperationalModel: recommended.modelId,
    bestByRole,
    attackerComparison,
    offensiveCorrelations: offensiveCorrelations(quoteRows, voteRows),
    attackerImprovedExamples: examples.improvedExamples,
    attackerWorsenedExamples: examples.worsenedExamples,
    targets: {
      maeUnder2: recommended.aggregateValidation.mae < 2,
      rmseUnder3: recommended.aggregateValidation.rmse < 3,
      within2AtLeast70: recommended.aggregateValidation.within2Pct >= 70,
      attackerMaeUnder3: rowByRole(bestAttackerModel, 'A').mae < 3,
    },
  };
}

function fmt(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function makeSyntheticQuoteModelStudyCsv(report: SyntheticQuoteModelStudyReport): string {
  const headers = ['modelId', 'operational', 'mae', 'rmse', 'medianAbsError', 'within1Pct', 'within2Pct', 'within3Pct', 'bias', 'attackerMae'];
  const rows = report.models.map(model => [
    model.modelId,
    model.operational,
    fmt(model.aggregateValidation.mae, 4),
    fmt(model.aggregateValidation.rmse, 4),
    fmt(model.aggregateValidation.medianAbsError, 4),
    fmt(model.aggregateValidation.within1Pct, 4),
    fmt(model.aggregateValidation.within2Pct, 4),
    fmt(model.aggregateValidation.within3Pct, 4),
    fmt(model.aggregateValidation.avgSignedError, 4),
    fmt(rowByRole(model, 'A').mae, 4),
  ]);
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function breakdownTable(rows: StudyBreakdownRow[]): string[] {
  const lines = ['| Segmento | N | MAE | Mediana | RMSE | Bias | Entro 1 | Entro 2 | Entro 3 |', '|----------|---|-----|---------|------|------|---------|---------|---------|'];
  for (const row of rows) {
    lines.push(`| ${row.key} | ${row.count} | ${fmt(row.mae)} | ${fmt(row.medianAbsError)} | ${fmt(row.rmse)} | ${fmt(row.bias)} | ${fmt(row.within1Pct)}% | ${fmt(row.within2Pct)}% | ${fmt(row.within3Pct)}% |`);
  }
  return lines;
}

export function buildSyntheticQuoteModelStudyMarkdown(report: SyntheticQuoteModelStudyReport): string {
  const lines: string[] = [];
  const baseline = report.models.find(model => model.modelId === 'BASELINE')!;
  const recommended = report.models.find(model => model.modelId === report.recommendedOperationalModel)!;
  lines.push('# Synthetic Quote Model Improvement Study');
  lines.push('');
  lines.push(`Generato: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Avvertenza');
  lines.push('');
  lines.push('Questo e un modello stimato, non ufficiale Fantacalcio. Lo studio non replica e non dichiara di replicare l algoritmo proprietario Fantacalcio. Qt.A finale e usata solo per misurare errore e scegliere parametri dopo la simulazione, mai dentro il calcolo giornaliero dei modelli operativi.');
  lines.push('');
  lines.push('## Confronto modelli');
  lines.push('');
  lines.push('| Modello | Operativo | MAE | RMSE | Mediana | Entro 1 | Entro 2 | Bias | MAE A |');
  lines.push('|---------|-----------|-----|------|---------|---------|---------|------|-------|');
  for (const model of report.models) {
    const m = model.aggregateValidation;
    lines.push(`| ${model.modelId} | ${model.operational ? 'si' : 'no, benchmark teorico'} | ${fmt(m.mae)} | ${fmt(m.rmse)} | ${fmt(m.medianAbsError)} | ${fmt(m.within1Pct)}% | ${fmt(m.within2Pct)}% | ${fmt(m.avgSignedError)} | ${fmt(rowByRole(model, 'A').mae)} |`);
  }
  lines.push('');
  lines.push(`Modello operativo raccomandato: **${report.recommendedOperationalModel}**.`);
  lines.push(`Baseline MAE ${fmt(baseline.aggregateValidation.mae)}, modello raccomandato MAE ${fmt(recommended.aggregateValidation.mae)}.`);
  lines.push('');
  lines.push('## Cross-validation');
  lines.push('');
  lines.push('| Modello | Train | Validation | MAE train | MAE validation | RMSE validation | Entro 2 validation |');
  lines.push('|---------|-------|------------|-----------|----------------|-----------------|--------------------|');
  for (const model of report.models) {
    for (const fold of model.trainSeasonResults) {
      lines.push(`| ${model.modelId} | ${fold.trainSeason} | ${fold.validationSeason} | ${fmt(fold.train.mae)} | ${fmt(fold.validation.mae)} | ${fmt(fold.validation.rmse)} | ${fmt(fold.validation.within2Pct)}% |`);
    }
  }
  lines.push('');
  lines.push('## Breakdown modello raccomandato');
  lines.push('');
  lines.push('### Per stagione');
  lines.push(...breakdownTable(recommended.bySeason));
  lines.push('');
  lines.push('### Per ruolo');
  lines.push(...breakdownTable(recommended.byRole));
  lines.push('');
  lines.push('### Per fascia quotazione iniziale');
  lines.push(...breakdownTable(recommended.byQuoteBand));
  lines.push('');
  lines.push('### Per presenze');
  lines.push(...breakdownTable(recommended.byPresence));
  lines.push('');
  lines.push('### Per crescita/calo reale');
  lines.push(...breakdownTable(recommended.growthDecline));
  lines.push('');
  lines.push('## Perche gli attaccanti sono piu difficili da stimare');
  lines.push('');
  lines.push('| Modello | MAE attaccanti | Bias attaccanti | Miglioramento vs baseline |');
  lines.push('|---------|----------------|-----------------|---------------------------|');
  for (const row of report.attackerComparison) {
    lines.push(`| ${row.modelId} | ${fmt(row.attackerMae)} | ${fmt(row.attackerBias)} | ${fmt(row.deltaVsBaseline)} |`);
  }
  lines.push('');
  lines.push('Gli attaccanti hanno dinamiche piu legate a eventi discreti: gol, assist, rigori sbagliati, periodi senza bonus e aspettative piu alte per i top player. Un 6 senza bonus puo essere neutro per molti ruoli ma negativo per un attaccante costoso. Il modello puo ancora sbagliare quando il prezzo reale incorpora infortuni, mercato, status da titolare o hype non osservabili nei dati disponibili.');
  lines.push('');
  lines.push('### Attaccanti dove il modello migliora');
  lines.push('| Giocatore | Club | Stagione | Errore baseline | Errore miglior modello A | Delta |');
  lines.push('|-----------|------|----------|-----------------|--------------------------|-------|');
  for (const row of report.attackerImprovedExamples) {
    lines.push(`| ${row.playerName} | ${row.club} | ${row.season} | ${fmt(row.baselineError)} | ${fmt(row.improvedError)} | ${fmt(row.delta)} |`);
  }
  lines.push('');
  lines.push('### Attaccanti dove il modello peggiora');
  lines.push('| Giocatore | Club | Stagione | Errore baseline | Errore miglior modello A | Delta |');
  lines.push('|-----------|------|----------|-----------------|--------------------------|-------|');
  for (const row of report.attackerWorsenedExamples) {
    lines.push(`| ${row.playerName} | ${row.club} | ${row.season} | ${fmt(row.baselineError)} | ${fmt(row.improvedError)} | ${fmt(row.delta)} |`);
  }
  lines.push('');
  lines.push('## Impatto di gol e assist sulla quotazione stimata');
  lines.push('');
  lines.push('| Ruolo | N | Corr gol-DeltaQt reale | Corr assist-DeltaQt reale | Corr bonus offensivo-DeltaQt reale | Corr bonus recente-DeltaQt reale |');
  lines.push('|-------|---|------------------------|----------------------------|------------------------------------|----------------------------------|');
  for (const row of report.offensiveCorrelations) {
    lines.push(`| ${row.role} | ${row.count} | ${fmt(row.goalsToRealQuoteDiff)} | ${fmt(row.assistsToRealQuoteDiff)} | ${fmt(row.offensiveBonusToRealQuoteDiff)} | ${fmt(row.recentOffensiveBonusToEstimatedDiff)} |`);
  }
  lines.push('');
  lines.push('## Migliori 20 stime del modello raccomandato');
  lines.push('| # | Giocatore | R | Club | Stagione | Qt.I | QAA stimata | Qt.A reale | Errore |');
  lines.push('|---|-----------|---|------|----------|------|-------------|-----------|--------|');
  recommended.bestEstimates.forEach((row, idx) => lines.push(`| ${idx + 1} | ${row.playerName} | ${row.role} | ${row.club} | ${row.season} | ${row.initialQuote} | ${row.finalQaa} | ${row.realCurrentOrFinalQuote} | ${fmt(row.error)} |`));
  lines.push('');
  lines.push('## Peggiori 20 errori del modello raccomandato');
  lines.push('| # | Giocatore | R | Club | Stagione | Qt.I | QAA stimata | Qt.A reale | Errore |');
  lines.push('|---|-----------|---|------|----------|------|-------------|-----------|--------|');
  recommended.worstEstimates.forEach((row, idx) => lines.push(`| ${idx + 1} | ${row.playerName} | ${row.role} | ${row.club} | ${row.season} | ${row.initialQuote} | ${row.finalQaa} | ${row.realCurrentOrFinalQuote} | ${fmt(row.error)} |`));
  lines.push('');
  lines.push('## Target indicativi');
  lines.push('');
  lines.push(`- MAE sotto 2.00: ${report.targets.maeUnder2 ? 'raggiunto' : 'non raggiunto'}.`);
  lines.push(`- RMSE sotto 3.00: ${report.targets.rmseUnder3 ? 'raggiunto' : 'non raggiunto'}.`);
  lines.push(`- Entro 2 punti almeno 70%: ${report.targets.within2AtLeast70 ? 'raggiunto' : 'non raggiunto'}.`);
  lines.push(`- MAE attaccanti sotto 3.00: ${report.targets.attackerMaeUnder3 ? 'raggiunto' : 'non raggiunto'}.`);
  lines.push('');
  lines.push('## Raccomandazione finale');
  lines.push('');
  lines.push(`1. Miglior modello operativo: **${report.recommendedOperationalModel}**.`);
  lines.push(`2. Miglior modello per ruolo: P=${report.bestByRole.P}, D=${report.bestByRole.D}, C=${report.bestByRole.C}, A=${report.bestByRole.A}.`);
  lines.push('3. Conviene usare parametri diversi per attaccanti se migliorano il MAE validation senza peggiorare troppo il bias.');
  lines.push('4. I bonus offensivi espliciti sono utili come segnale, ma non eliminano l errore degli attaccanti perche mancano prezzo reale intermedio, minuti, infortuni e status di titolarita.');
  lines.push('5. Il trading intra-stagione basato su questo modello deve essere marcato come esplorativo.');
  lines.push('6. Servono quotazioni reali giornata per giornata, minuti giocati, rigori segnati/subiti, titolarita, infortuni/squalifiche e data ingresso lista per migliorare ancora.');
  lines.push('');
  lines.push('## Limite recuperi');
  lines.push('');
  lines.push('La logica recuperi complessa non e implementata in questo studio.');
  return lines.join('\n');
}
