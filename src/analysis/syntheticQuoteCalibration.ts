import { NormalizedQuoteRow, PlayerRole } from '../importers/realQuotesImporter';
import { NormalizedVoteRow } from '../importers/realVotesImporter';
import { mean } from '../utils/mathUtils';
import {
  DEFAULT_SYNTHETIC_QUOTE_PARAMS,
  SyntheticPlayerFinal,
  SyntheticQuoteParams,
  SyntheticRoundQuoteRow,
  runSyntheticRoundQuoteModel,
} from '../engine/syntheticRoundQuoteEngine';

export const SYNTHETIC_QUOTE_COMPLETED_SEASONS = ['2023/24', '2024/25'];
export const SYNTHETIC_QUOTE_IN_PROGRESS_SEASONS = ['2025/26'];

export interface ErrorBucket {
  bucket: string;
  count: number;
  pct: number;
}

export interface RoleCalibrationStats {
  role: PlayerRole;
  count: number;
  mae: number;
  medianAbsError: number;
  rmse: number;
  avgSignedError: number;
}

export interface CalibrationMetrics {
  count: number;
  mae: number;
  medianAbsError: number;
  rmse: number;
  avgSignedError: number;
  exactPct: number;
  within1Pct: number;
  within2Pct: number;
  within3Pct: number;
  byRole: RoleCalibrationStats[];
  distribution: ErrorBucket[];
}

export interface CalibrationCandidate {
  params: SyntheticQuoteParams;
  metrics: CalibrationMetrics;
  score: number;
}

export interface SyntheticQuoteCalibrationReport {
  generatedAt: string;
  modelId: 'SYNTHETIC_ROUND_QUOTES_V1';
  officialModel: false;
  completedSeasons: string[];
  inProgressSeasons: string[];
  testedCandidates: number;
  bestCandidate: CalibrationCandidate;
  candidates: CalibrationCandidate[];
  completedFinals: SyntheticPlayerFinal[];
  inProgressFinals: SyntheticPlayerFinal[];
  roleDifficulty: RoleCalibrationStats[];
  bestEstimates: SyntheticPlayerFinal[];
  worstEstimates: SyntheticPlayerFinal[];
}

export interface SyntheticQuoteRunOutput {
  calibration: SyntheticQuoteCalibrationReport;
  syntheticRows: SyntheticRoundQuoteRow[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pct(values: number[], predicate: (value: number) => boolean): number {
  return values.length === 0 ? 0 : values.filter(predicate).length / values.length * 100;
}

function rmse(errors: number[]): number {
  if (errors.length === 0) return 0;
  return Math.sqrt(mean(errors.map(error => error ** 2)));
}

export function calculateCalibrationMetrics(finals: SyntheticPlayerFinal[]): CalibrationMetrics {
  const absErrors = finals.map(row => row.error);
  const signedErrors = finals.map(row => row.signedError);
  const byRole = (['P', 'D', 'C', 'A'] as PlayerRole[]).map(role => {
    const rows = finals.filter(row => row.role === role);
    const roleAbsErrors = rows.map(row => row.error);
    const roleSignedErrors = rows.map(row => row.signedError);
    return {
      role,
      count: rows.length,
      mae: mean(roleAbsErrors),
      medianAbsError: median(roleAbsErrors),
      rmse: rmse(roleAbsErrors),
      avgSignedError: mean(roleSignedErrors),
    };
  });
  const buckets = [
    { bucket: '0', predicate: (e: number) => e === 0 },
    { bucket: '0-1', predicate: (e: number) => e > 0 && e <= 1 },
    { bucket: '1-2', predicate: (e: number) => e > 1 && e <= 2 },
    { bucket: '2-5', predicate: (e: number) => e > 2 && e <= 5 },
    { bucket: '>5', predicate: (e: number) => e > 5 },
  ];
  return {
    count: finals.length,
    mae: mean(absErrors),
    medianAbsError: median(absErrors),
    rmse: rmse(absErrors),
    avgSignedError: mean(signedErrors),
    exactPct: pct(absErrors, error => error === 0),
    within1Pct: pct(absErrors, error => error <= 1),
    within2Pct: pct(absErrors, error => error <= 2),
    within3Pct: pct(absErrors, error => error <= 3),
    byRole,
    distribution: buckets.map(bucket => {
      const count = absErrors.filter(bucket.predicate).length;
      return { bucket: bucket.bucket, count, pct: finals.length ? count / finals.length * 100 : 0 };
    }),
  };
}

function candidateScore(metrics: CalibrationMetrics): number {
  return metrics.mae * 1.8 + metrics.rmse * 0.9 - metrics.within1Pct * 0.015 - metrics.within2Pct * 0.005;
}

export function buildCalibrationGrid(): SyntheticQuoteParams[] {
  const lastPerformanceWeights = [0.22, 0.34, 0.46];
  const fantasyAverageWeights = [0.18, 0.28, 0.38];
  const presenceWeights = [0.25, 0.45];
  const adjustmentRates = [0.28, 0.42, 0.56];
  const expectedStrengths = [0.75, 1, 1.25];
  const absencePenalties = [-0.02, -0.05];
  const out: SyntheticQuoteParams[] = [];
  for (const lastPerformanceWeight of lastPerformanceWeights) {
    for (const fantasyAverageWeight of fantasyAverageWeights) {
      for (const presenceWeight of presenceWeights) {
        for (const adjustmentRate of adjustmentRates) {
          for (const expectedStrength of expectedStrengths) {
            for (const absencePenalty of absencePenalties) {
              out.push({
                lastPerformanceWeight,
                fantasyAverageWeight,
                presenceWeight,
                adjustmentRate,
                expectedStrength,
                absencePenalty,
              });
            }
          }
        }
      }
    }
  }
  return out;
}

function normalizeId(row: { season: string; playerId: number | string }): string {
  return `${row.season}|${row.playerId}`;
}

function matchedRows(quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[]): NormalizedQuoteRow[] {
  const voteKeys = new Set(voteRows.map(normalizeId));
  return quoteRows.filter(row => voteKeys.has(normalizeId(row)));
}

export function calibrateSyntheticQuoteModel(
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
  grid: SyntheticQuoteParams[] = buildCalibrationGrid(),
): SyntheticQuoteCalibrationReport {
  const completedQuotes = matchedRows(
    quoteRows.filter(row => SYNTHETIC_QUOTE_COMPLETED_SEASONS.includes(row.season)),
    voteRows,
  );
  const completedVotes = voteRows.filter(row => SYNTHETIC_QUOTE_COMPLETED_SEASONS.includes(row.season));

  const candidates = grid.map(params => {
    const result = runSyntheticRoundQuoteModel(completedQuotes, completedVotes, params, SYNTHETIC_QUOTE_COMPLETED_SEASONS);
    const metrics = calculateCalibrationMetrics(result.finals);
    return { params, metrics, score: candidateScore(metrics) };
  }).sort((a, b) => a.score - b.score);

  const bestCandidate = candidates[0] ?? {
    params: DEFAULT_SYNTHETIC_QUOTE_PARAMS,
    metrics: calculateCalibrationMetrics([]),
    score: 0,
  };
  const completedResult = runSyntheticRoundQuoteModel(completedQuotes, completedVotes, bestCandidate.params, SYNTHETIC_QUOTE_COMPLETED_SEASONS);
  const inProgressQuotes = matchedRows(
    quoteRows.filter(row => SYNTHETIC_QUOTE_IN_PROGRESS_SEASONS.includes(row.season)),
    voteRows,
  );
  const inProgressVotes = voteRows.filter(row => SYNTHETIC_QUOTE_IN_PROGRESS_SEASONS.includes(row.season));
  const inProgressResult = runSyntheticRoundQuoteModel(inProgressQuotes, inProgressVotes, bestCandidate.params, SYNTHETIC_QUOTE_IN_PROGRESS_SEASONS);
  const sortedBest = [...completedResult.finals].sort((a, b) => a.error - b.error || a.playerName.localeCompare(b.playerName));
  const sortedWorst = [...completedResult.finals].sort((a, b) => b.error - a.error || a.playerName.localeCompare(b.playerName));

  return {
    generatedAt: new Date().toISOString(),
    modelId: 'SYNTHETIC_ROUND_QUOTES_V1',
    officialModel: false,
    completedSeasons: SYNTHETIC_QUOTE_COMPLETED_SEASONS,
    inProgressSeasons: SYNTHETIC_QUOTE_IN_PROGRESS_SEASONS,
    testedCandidates: candidates.length,
    bestCandidate: {
      params: bestCandidate.params,
      metrics: calculateCalibrationMetrics(completedResult.finals),
      score: bestCandidate.score,
    },
    candidates: candidates.slice(0, 50),
    completedFinals: completedResult.finals,
    inProgressFinals: inProgressResult.finals,
    roleDifficulty: [...calculateCalibrationMetrics(completedResult.finals).byRole].sort((a, b) => b.mae - a.mae),
    bestEstimates: sortedBest.slice(0, 20),
    worstEstimates: sortedWorst.slice(0, 20),
  };
}

export function runSyntheticQuoteCalibration(
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
): SyntheticQuoteRunOutput {
  const calibration = calibrateSyntheticQuoteModel(quoteRows, voteRows);
  const allQuotes = matchedRows(
    quoteRows.filter(row => [...SYNTHETIC_QUOTE_COMPLETED_SEASONS, ...SYNTHETIC_QUOTE_IN_PROGRESS_SEASONS].includes(row.season)),
    voteRows,
  );
  const allVotes = voteRows.filter(row => [...SYNTHETIC_QUOTE_COMPLETED_SEASONS, ...SYNTHETIC_QUOTE_IN_PROGRESS_SEASONS].includes(row.season));
  const synthetic = runSyntheticRoundQuoteModel(
    allQuotes,
    allVotes,
    calibration.bestCandidate.params,
    [...SYNTHETIC_QUOTE_COMPLETED_SEASONS, ...SYNTHETIC_QUOTE_IN_PROGRESS_SEASONS],
  );
  return { calibration, syntheticRows: synthetic.rows };
}

function fmt(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

function paramsSummary(params: SyntheticQuoteParams): string {
  return [
    `peso ultima prestazione=${params.lastPerformanceWeight}`,
    `peso fantamedia=${params.fantasyAverageWeight}`,
    `peso presenza=${params.presenceWeight}`,
    `velocita adeguamento=${params.adjustmentRate}`,
    `forza rendimento atteso=${params.expectedStrength}`,
    `penalita assenza=${params.absencePenalty}`,
  ].join(', ');
}

export function buildSyntheticQuoteModelMarkdown(): string {
  return [
    '# Modello Sintetico Quotazioni Giornata per Giornata',
    '',
    '## Natura del modello',
    '',
    'Questo modello e sintetico, stimato e non ufficiale Fantacalcio.',
    '',
    'Non usa quotazioni giornata per giornata reali. Parte dalle quotazioni iniziali reali, legge voti e presenze reali giornata per giornata, genera una QA interna decimale stimata e la confronta solo alla fine con la Qt.A reale disponibile.',
    '',
    '## Logica implementata',
    '',
    '- L ultima prestazione giocata muove la QA in base alla differenza tra fantavoto/voto e rendimento atteso.',
    '- Dalla quinta presenza utile entra una componente stagionale basata su fantamedia e presenza.',
    '- La presenza usa il valore migliore tra presenceRateSeason e presenceRateLast10.',
    '- Se la componente stagionale darebbe un upgrade ma il giocatore non ha giocato l ultima partita, l upgrade viene congelato.',
    '- Lo stesso voto ha effetto diverso in base a ruolo e quotazione corrente stimata.',
    '- Il calcolo riparte sempre da QA decimale, non dalla QAA pubblica arrotondata.',
    '- QAA e arrotondata per difetto da .01 a .50 e per eccesso da .51 a .99.',
    '- Il paracadute agisce sulla QAA pubblica minima, secondo ruolo e quotazione iniziale.',
    '- QAA non scende sotto 1 e non supera 60.',
    '',
    '## Limiti',
    '',
    '- Non implementa logiche complesse di recuperi.',
    '- Non replica un algoritmo ufficiale Fantacalcio.',
    '- Non osserva movimenti reali intermedi di mercato.',
    '- La calibrazione vede solo Qt.I e Qt.A, quindi molte traiettorie giornaliere diverse possono arrivare allo stesso valore finale.',
    '- Va usato come baseline sperimentale per stress test, non come fonte ufficiale di prezzo.',
  ].join('\n');
}

export function buildCalibrationMarkdown(report: SyntheticQuoteCalibrationReport): string {
  const lines: string[] = [];
  const metrics = report.bestCandidate.metrics;
  lines.push('# Calibrazione Modello Sintetico Quotazioni');
  lines.push('');
  lines.push(`Generato: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Avvertenza');
  lines.push('');
  lines.push('Il modello e sintetico e non ufficiale Fantacalcio. Non inventa quotazioni reali giornata per giornata: genera stime coerenti con la logica descritta e le calibra sui soli valori reali Qt.I e Qt.A.');
  lines.push('');
  lines.push('## Dati usati');
  lines.push('');
  lines.push(`- Stagioni completed per calibrazione: ${report.completedSeasons.join(', ')}`);
  lines.push(`- Stagioni in_progress generate separatamente: ${report.inProgressSeasons.join(', ')}`);
  lines.push(`- Candidati parametrici testati: ${report.testedCandidates}`);
  lines.push('');
  lines.push('## Miglior configurazione');
  lines.push('');
  lines.push(paramsSummary(report.bestCandidate.params));
  lines.push('');
  lines.push('| Metrica | Valore |');
  lines.push('|---------|--------|');
  lines.push(`| Giocatori matched completed | ${metrics.count} |`);
  lines.push(`| Errore assoluto medio | ${fmt(metrics.mae)} punti quota |`);
  lines.push(`| Errore assoluto mediano | ${fmt(metrics.medianAbsError)} punti quota |`);
  lines.push(`| RMSE | ${fmt(metrics.rmse)} punti quota |`);
  lines.push(`| Errore medio firmato | ${fmt(metrics.avgSignedError)} punti quota |`);
  lines.push(`| Stime esatte | ${fmt(metrics.exactPct)}% |`);
  lines.push(`| Entro 1 punto | ${fmt(metrics.within1Pct)}% |`);
  lines.push(`| Entro 2 punti | ${fmt(metrics.within2Pct)}% |`);
  lines.push('');
  lines.push('## Distribuzione errori');
  lines.push('');
  lines.push('| Errore assoluto | Record | % |');
  lines.push('|-----------------|--------|---|');
  for (const bucket of metrics.distribution) {
    lines.push(`| ${bucket.bucket} | ${bucket.count} | ${fmt(bucket.pct)}% |`);
  }
  lines.push('');
  lines.push('## Difficolta per ruolo');
  lines.push('');
  lines.push('| Ruolo | N | MAE | Mediana | RMSE | Bias |');
  lines.push('|-------|---|-----|---------|------|------|');
  for (const row of report.roleDifficulty) {
    lines.push(`| ${row.role} | ${row.count} | ${fmt(row.mae)} | ${fmt(row.medianAbsError)} | ${fmt(row.rmse)} | ${fmt(row.avgSignedError)} |`);
  }
  lines.push('');
  lines.push('I ruoli con MAE piu alto sono i piu difficili da stimare con soli Qt.I, Qt.A, voti e presenze.');
  lines.push('');
  lines.push('## Top 20 migliori stime');
  lines.push('');
  lines.push('| # | Giocatore | R | Club | Stagione | Qt.I | QAA stimata | Qt.A reale | Errore |');
  lines.push('|---|-----------|---|------|----------|------|-------------|-----------|--------|');
  report.bestEstimates.forEach((row, idx) => {
    lines.push(`| ${idx + 1} | ${row.playerName} | ${row.role} | ${row.club} | ${row.season} | ${row.initialQuote} | ${row.finalQaa} | ${row.realCurrentOrFinalQuote} | ${fmt(row.error)} |`);
  });
  lines.push('');
  lines.push('## Top 20 peggiori stime');
  lines.push('');
  lines.push('| # | Giocatore | R | Club | Stagione | Qt.I | QAA stimata | Qt.A reale | Errore |');
  lines.push('|---|-----------|---|------|----------|------|-------------|-----------|--------|');
  report.worstEstimates.forEach((row, idx) => {
    lines.push(`| ${idx + 1} | ${row.playerName} | ${row.role} | ${row.club} | ${row.season} | ${row.initialQuote} | ${row.finalQaa} | ${row.realCurrentOrFinalQuote} | ${fmt(row.error)} |`);
  });
  lines.push('');
  lines.push('## Rischi per trading intra-stagione');
  lines.push('');
  lines.push('- La traiettoria giornaliera e stimata, non osservata.');
  lines.push('- Errori piccoli a fine stagione non garantiscono prezzi intermedi corretti.');
  lines.push('- Il modello puo sottostimare effetti di mercato non presenti nei voti, come hype, infortuni lunghi, trasferimenti e cambio titolarita.');
  lines.push('- I recuperi non sono modellati in modo complesso.');
  lines.push('- Va usato per scenari e sensibilita, non per dichiarare prezzi ufficiali.');
  return lines.join('\n');
}

export function makeCalibrationCsv(report: SyntheticQuoteCalibrationReport): string {
  const headers = [
    'rank', 'score', 'mae', 'medianAbsError', 'rmse', 'avgSignedError', 'exactPct', 'within1Pct', 'within2Pct',
    'lastPerformanceWeight', 'fantasyAverageWeight', 'presenceWeight', 'adjustmentRate', 'expectedStrength', 'absencePenalty',
  ];
  const rows = report.candidates.map((candidate, idx) => [
    idx + 1,
    candidate.score.toFixed(6),
    candidate.metrics.mae.toFixed(6),
    candidate.metrics.medianAbsError.toFixed(6),
    candidate.metrics.rmse.toFixed(6),
    candidate.metrics.avgSignedError.toFixed(6),
    candidate.metrics.exactPct.toFixed(4),
    candidate.metrics.within1Pct.toFixed(4),
    candidate.metrics.within2Pct.toFixed(4),
    candidate.params.lastPerformanceWeight,
    candidate.params.fantasyAverageWeight,
    candidate.params.presenceWeight,
    candidate.params.adjustmentRate,
    candidate.params.expectedStrength,
    candidate.params.absencePenalty,
  ]);
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
