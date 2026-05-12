import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../../src/importers/realVotesImporter';
import {
  buildSyntheticQuoteModelStudyMarkdown,
  makeSyntheticQuoteModelStudyCsv,
  runSyntheticQuoteModelStudy,
} from '../../src/analysis/syntheticQuoteModelStudy';
import { calculateCalibrationMetrics } from '../../src/analysis/syntheticQuoteCalibration';
import {
  calculateOffensiveMetrics,
  qaToPublicQuote,
  runSyntheticRoundQuoteModel,
} from '../../src/engine/syntheticRoundQuoteEngine';

function quote(season: string, playerId: number, role: NormalizedQuoteRow['role'], initialQuote: number, finalQuote: number): NormalizedQuoteRow {
  return {
    season,
    seasonStatus: 'completed',
    playerId,
    role,
    roleExtended: role,
    playerName: `${role}${playerId}`,
    club: 'Club',
    initialQuote,
    currentOrFinalQuote: finalQuote,
    quoteDiff: finalQuote - initialQuote,
    quoteRawReturnPct: initialQuote ? ((finalQuote - initialQuote) / initialQuote) * 100 : 0,
    quoteTradingReturnPct: (finalQuote - initialQuote) * 5,
    initialQuoteMantra: initialQuote,
    currentOrFinalQuoteMantra: finalQuote,
    quoteDiffMantra: finalQuote - initialQuote,
    fvm: 0,
    fvmMantra: 0,
    sourceFile: 'q.xlsx',
  };
}

function vote(
  season: string,
  round: number,
  playerId: number,
  role: NormalizedVoteRow['role'],
  fantasyVote: number,
  goals = 0,
  assists = 0,
): NormalizedVoteRow {
  return {
    season,
    seasonStatus: 'completed',
    round,
    playerId: String(playerId),
    playerName: `${role}${playerId}`,
    club: 'Club',
    role,
    vote: fantasyVote,
    fantasyVote,
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
  for (const season of ['2023/24', '2024/25']) {
    quotes.push(
      quote(season, 1, 'P', 14, 13),
      quote(season, 2, 'D', 8, 9),
      quote(season, 3, 'C', 16, 17),
      quote(season, 4, 'A', 24, 29),
      quote(season, 5, 'A', 7, 11),
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

describe('syntheticQuoteModelStudy', () => {
  test('confronta modelli e genera output report', () => {
    const { quotes, votes } = dataset();
    const report = runSyntheticQuoteModelStudy(quotes, votes);
    expect(report.models.length).toBeGreaterThanOrEqual(12);
    expect(report.models.some(model => model.modelId === 'ORACLE_FINAL_ANCHOR' && !model.operational)).toBe(true);
    expect(makeSyntheticQuoteModelStudyCsv(report)).toContain('modelId');
    expect(buildSyntheticQuoteModelStudyMarkdown(report)).toContain('modello stimato, non ufficiale Fantacalcio');
  });

  test('usa split training/validation 2023-24 e 2024-25', () => {
    const { quotes, votes } = dataset();
    const report = runSyntheticQuoteModelStudy(quotes, votes);
    const baseline = report.models.find(model => model.modelId === 'BASELINE')!;
    expect(baseline.trainSeasonResults).toHaveLength(2);
    expect(baseline.trainSeasonResults[0].trainSeason).not.toBe(baseline.trainSeasonResults[0].validationSeason);
  });

  test('i modelli operativi non usano Qt.A finale nella simulazione giornaliera', () => {
    const { quotes, votes } = dataset();
    const report = runSyntheticQuoteModelStudy(quotes, votes);
    const operative = report.models.filter(model => model.operational);
    expect(operative.every(model => model.usesFinalQuoteInDailySimulation === false)).toBe(true);
    expect(report.models.find(model => model.modelId === 'ORACLE_FINAL_ANCHOR')!.usesFinalQuoteInDailySimulation).toBe(true);
  });

  test('calcola bias e breakdown per ruolo e fascia prezzo', () => {
    const { quotes, votes } = dataset();
    const report = runSyntheticQuoteModelStudy(quotes, votes);
    const baseline = report.models.find(model => model.modelId === 'BASELINE')!;
    expect(Number.isFinite(baseline.aggregateValidation.avgSignedError)).toBe(true);
    expect(baseline.byRole.map(row => row.key)).toEqual(['P', 'D', 'C', 'A']);
    expect(baseline.byQuoteBand.map(row => row.key)).toEqual(['1-5', '6-10', '11-20', '21-35', '36+']);
  });

  test('calcola metriche offensive per attaccanti', () => {
    const votes = [
      vote('2023/24', 1, 4, 'A', 7, 1, 0),
      vote('2023/24', 2, 4, 'A', 6, 0, 1),
      vote('2023/24', 3, 4, 'A', 5.5, 0, 0),
      vote('2023/24', 4, 4, 'A', 7, 1, 1),
      vote('2023/24', 5, 4, 'A', 6, 0, 0),
      vote('2023/24', 6, 4, 'A', 6, 0, 0),
      vote('2023/24', 7, 4, 'A', 6, 0, 0),
      vote('2023/24', 8, 4, 'A', 6, 0, 0),
      vote('2023/24', 9, 4, 'A', 6, 0, 0),
      vote('2023/24', 10, 4, 'A', 6, 0, 0),
    ];
    const metrics = calculateOffensiveMetrics(votes);
    expect(metrics.goalRate).toBeCloseTo(0.2);
    expect(metrics.assistRate).toBeCloseTo(0.2);
    expect(metrics.recentOffensiveBonusLast5).toBe(0);
    expect(metrics.recentOffensiveBonusLast10).toBeCloseTo(2 + 2 * 0.55);
    expect(metrics.drySpell).toBe(6);
  });

  test('ATTACKER_BONUS_SENSITIVE aumenta la spinta su bonus offensivi', () => {
    const q = [quote('2023/24', 4, 'A', 7, 12)];
    const v = [1, 2, 3, 4, 5].map(round => vote('2023/24', round, 4, 'A', 7.5, 1, 0));
    const base = runSyntheticRoundQuoteModel(q, v, {
      lastPerformanceWeight: 0.46,
      fantasyAverageWeight: 0.38,
      presenceWeight: 0.45,
      adjustmentRate: 0.56,
      expectedStrength: 1.25,
      absencePenalty: -0.05,
    }, ['2023/24']);
    const bonus = runSyntheticRoundQuoteModel(q, v, {
      lastPerformanceWeight: 0.46,
      fantasyAverageWeight: 0.38,
      presenceWeight: 0.45,
      adjustmentRate: 0.56,
      expectedStrength: 1.25,
      absencePenalty: -0.05,
      roleOverrides: { A: { offensiveBonusWeight: 0.5, recentOffensiveBonusWeight: 0.2 } },
    }, ['2023/24']);
    expect(bonus.finals[0].finalQa).toBeGreaterThan(base.finals[0].finalQa);
  });

  test('mantiene paracadute e limiti 1-60', () => {
    expect(qaToPublicQuote(1.2, 'A', 25)).toBe(12);
    expect(qaToPublicQuote(99, 'A', 5)).toBe(60);
  });

  test('calcolo bias da metriche calibrazione', () => {
    const metrics = calculateCalibrationMetrics([
      { season: '2023/24', seasonStatus: 'completed', playerId: 1, playerName: 'a', club: 'c', role: 'A', initialQuote: 10, realCurrentOrFinalQuote: 12, finalQa: 11, finalQaa: 11, error: 1, signedError: -1, rounds: 1, usefulAppearances: 1, presenceRateSeason: 1, presenceRateLast10: 1 },
      { season: '2023/24', seasonStatus: 'completed', playerId: 2, playerName: 'b', club: 'c', role: 'A', initialQuote: 10, realCurrentOrFinalQuote: 10, finalQa: 12, finalQaa: 12, error: 2, signedError: 2, rounds: 1, usefulAppearances: 1, presenceRateSeason: 1, presenceRateLast10: 1 },
    ]);
    expect(metrics.avgSignedError).toBe(0.5);
  });
});
