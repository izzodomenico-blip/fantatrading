import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../../src/importers/realVotesImporter';
import {
  buildSyntheticQuoteDeepOptimizerMarkdown,
  ensembleFinals,
  instabilityPenalty,
  makeSyntheticQuoteDeepOptimizerCsv,
  runSyntheticQuoteDeepOptimizer,
  scoreModel,
} from '../../src/analysis/syntheticQuoteDeepOptimizer';
import { calculateCalibrationMetrics } from '../../src/analysis/syntheticQuoteCalibration';

function quote(season: string, playerId: number, role: NormalizedQuoteRow['role'], qi: number, qa: number): NormalizedQuoteRow {
  return {
    season,
    seasonStatus: season === '2025/26' ? 'in_progress' : 'completed',
    playerId,
    role,
    roleExtended: role,
    playerName: `${role}${playerId}`,
    club: 'Club',
    initialQuote: qi,
    currentOrFinalQuote: qa,
    quoteDiff: qa - qi,
    quoteRawReturnPct: qi ? ((qa - qi) / qi) * 100 : 0,
    quoteTradingReturnPct: (qa - qi) * 5,
    initialQuoteMantra: qi,
    currentOrFinalQuoteMantra: qa,
    quoteDiffMantra: qa - qi,
    fvm: 0,
    fvmMantra: 0,
    sourceFile: 'q.xlsx',
  };
}

function vote(season: string, round: number, playerId: number, role: NormalizedVoteRow['role'], fv: number, goals = 0, assists = 0): NormalizedVoteRow {
  return {
    season,
    seasonStatus: season === '2025/26' ? 'in_progress' : 'completed',
    round,
    playerId: String(playerId),
    playerName: `${role}${playerId}`,
    club: 'Club',
    role,
    vote: fv,
    fantasyVote: fv,
    minutesPlayed: null,
    played: true,
    starter: null,
    goals,
    assists,
    yellowCards: 0,
    redCards: 0,
    penaltiesMissed: 0,
    ownGoals: 0,
    sourceFile: 'v.xlsx',
  };
}

function dataset() {
  const quotes: NormalizedQuoteRow[] = [];
  const votes: NormalizedVoteRow[] = [];
  for (const season of ['2023/24', '2024/25', '2025/26']) {
    quotes.push(
      quote(season, 1, 'P', 14, 13),
      quote(season, 2, 'D', 8, 10),
      quote(season, 3, 'C', 16, 18),
      quote(season, 4, 'A', 24, 28),
      quote(season, 5, 'A', 7, 12),
    );
    for (let round = 1; round <= 6; round++) {
      votes.push(
        vote(season, round, 1, 'P', 6),
        vote(season, round, 2, 'D', 6.5, round === 3 ? 1 : 0),
        vote(season, round, 3, 'C', 6.5, round === 2 ? 1 : 0, round === 5 ? 1 : 0),
        vote(season, round, 4, 'A', 7, round <= 3 ? 1 : 0, round === 4 ? 1 : 0),
        vote(season, round, 5, 'A', round >= 4 ? 7.5 : 6, round >= 4 ? 1 : 0),
      );
    }
  }
  return { quotes, votes };
}

describe('syntheticQuoteDeepOptimizer', () => {
  test('produce risultati e report', () => {
    const { quotes, votes } = dataset();
    const report = runSyntheticQuoteDeepOptimizer(quotes, votes);
    expect(report.models.length).toBeGreaterThanOrEqual(11);
    expect(report.recommendedOperationalModel).toBeTruthy();
    expect(makeSyntheticQuoteDeepOptimizerCsv(report)).toContain('modelId');
    expect(buildSyntheticQuoteDeepOptimizerMarkdown(report)).toContain('modello stimato');
  });

  test('validazione train/validate corretta', () => {
    const { quotes, votes } = dataset();
    const report = runSyntheticQuoteDeepOptimizer(quotes, votes);
    const model = report.models.find(m => m.modelId === 'AGGRESSIVE')!;
    expect(model.folds).toHaveLength(2);
    expect(model.folds[0].trainSeason).not.toBe(model.folds[0].validationSeason);
  });

  test('scoring e penalita instabilita sono calcolati', () => {
    const metrics = calculateCalibrationMetrics([
      { season: '2023/24', seasonStatus: 'completed', playerId: 1, playerName: 'a', club: 'c', role: 'A', initialQuote: 10, realCurrentOrFinalQuote: 12, finalQa: 11, finalQaa: 11, error: 1, signedError: -1, rounds: 1, usefulAppearances: 1, presenceRateSeason: 1, presenceRateLast10: 1 },
    ]);
    const score = scoreModel(metrics, [metrics, { ...metrics, mae: metrics.mae + 2 }]);
    expect(Number.isFinite(score.score)).toBe(true);
    expect(instabilityPenalty([metrics, { ...metrics, mae: metrics.mae + 2 }])).toBe(2);
  });

  test('ensemble model combina finali', () => {
    const base = { season: '2023/24', seasonStatus: 'completed', playerId: 1, playerName: 'a', club: 'c', role: 'A' as const, initialQuote: 10, realCurrentOrFinalQuote: 12, finalQa: 10, finalQaa: 10, error: 2, signedError: -2, rounds: 1, usefulAppearances: 1, presenceRateSeason: 1, presenceRateLast10: 1 };
    const combined = ensembleFinals([
      { finals: [base], weight: 1 },
      { finals: [{ ...base, finalQaa: 14, finalQa: 14 }], weight: 1 },
    ]);
    expect(combined[0].finalQaa).toBe(12);
    expect(combined[0].error).toBe(0);
  });

  test('role-specific e quote-band optimization sono presenti', () => {
    const { quotes, votes } = dataset();
    const report = runSyntheticQuoteDeepOptimizer(quotes, votes);
    expect(report.models.some(m => m.modelId === 'ROLE_SPECIFIC_OPTIMIZED')).toBe(true);
    expect(report.models.some(m => m.modelId === 'QUOTE_BAND_OPTIMIZED')).toBe(true);
  });

  test('calcola outlier', () => {
    const { quotes, votes } = dataset();
    const report = runSyntheticQuoteDeepOptimizer(quotes, votes);
    const model = report.models.find(m => m.modelId === report.recommendedOperationalModel)!;
    expect(model.topWorstErrors.length).toBeGreaterThan(0);
    expect(model.topBestEstimates.length).toBeGreaterThan(0);
  });

  test('nessun modello operativo usa Qt.A finale nel calcolo giornaliero e ORACLE e non operativo', () => {
    const { quotes, votes } = dataset();
    const report = runSyntheticQuoteDeepOptimizer(quotes, votes);
    expect(report.models.filter(m => m.operational).every(m => !m.usesFinalQuoteInDailySimulation)).toBe(true);
    const oracle = report.models.find(m => m.modelId === 'ORACLE_FINAL_ANCHOR')!;
    expect(oracle.operational).toBe(false);
    expect(oracle.usesFinalQuoteInDailySimulation).toBe(true);
  });
});
