import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../../src/importers/realVotesImporter';
import {
  DEFAULT_SYNTHETIC_QUOTE_PARAMS,
  applyPublicQuoteLimits,
  computePresenceRates,
  getParachuteMinQaa,
  qaToPublicQuote,
  roundQaToQaa,
  runSyntheticRoundQuoteModel,
} from '../../src/engine/syntheticRoundQuoteEngine';

function quote(overrides: Partial<NormalizedQuoteRow> = {}): NormalizedQuoteRow {
  return {
    season: '2023/24',
    seasonStatus: 'completed',
    playerId: 10,
    role: 'C',
    roleExtended: 'C',
    playerName: 'Player',
    club: 'Club',
    initialQuote: 16,
    currentOrFinalQuote: 18,
    quoteDiff: 2,
    quoteRawReturnPct: 12.5,
    quoteTradingReturnPct: 10,
    initialQuoteMantra: 16,
    currentOrFinalQuoteMantra: 18,
    quoteDiffMantra: 2,
    fvm: 0,
    fvmMantra: 0,
    sourceFile: 'q.xlsx',
    ...overrides,
  };
}

function vote(round: number, played: boolean, fantasyVote: number | null = 7): NormalizedVoteRow {
  return {
    season: '2023/24',
    seasonStatus: 'completed',
    round,
    playerId: '10',
    playerName: 'Player',
    club: 'Club',
    role: 'C',
    vote: played ? fantasyVote : null,
    fantasyVote: played ? fantasyVote : null,
    minutesPlayed: null,
    played,
    starter: null,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    penaltiesMissed: 0,
    ownGoals: 0,
    sourceFile: 'v.xlsx',
  };
}

describe('syntheticRoundQuoteEngine', () => {
  test('arrotonda QA in QAA con soglia .50 per difetto e .51 per eccesso', () => {
    expect(roundQaToQaa(10.01)).toBe(10);
    expect(roundQaToQaa(10.5)).toBe(10);
    expect(roundQaToQaa(10.51)).toBe(11);
    expect(roundQaToQaa(10.99)).toBe(11);
  });

  test('QAA viene calcolata dalla QA decimale e non da un valore pubblico precedente', () => {
    expect(qaToPublicQuote(12.49, 'C', 10)).toBe(12);
    expect(qaToPublicQuote(12.51, 'C', 10)).toBe(13);
  });

  test('applica limite minimo 1', () => {
    expect(applyPublicQuoteLimits(0, 'A', 5)).toBe(1);
  });

  test('applica limite massimo 60', () => {
    expect(applyPublicQuoteLimits(75, 'A', 5)).toBe(60);
  });

  test('calcola paracadute per P/D/C/A', () => {
    expect(getParachuteMinQaa('P', 14)).toBe(7);
    expect(getParachuteMinQaa('D', 13)).toBe(6);
    expect(getParachuteMinQaa('C', 16)).toBe(8);
    expect(getParachuteMinQaa('A', 25)).toBe(12);
    expect(getParachuteMinQaa('A', 23)).toBe(0);
  });

  test('congela upgrade stagionale se il giocatore non ha giocato', () => {
    const result = runSyntheticRoundQuoteModel(
      [quote()],
      [vote(1, true, 8), vote(2, true, 8), vote(3, true, 8), vote(4, true, 8), vote(5, false, null)],
      { ...DEFAULT_SYNTHETIC_QUOTE_PARAMS, absencePenalty: 0 },
      ['2023/24'],
    );
    const round5 = result.rows.find(row => row.round === 5)!;
    expect(round5.seasonComponentDelta).toBe(0);
  });

  test('calcola presenza season e last10', () => {
    const rates = computePresenceRates([true, false, true, true, false, true, true, true, false, true, true]);
    expect(rates.season).toBeCloseTo(8 / 11, 5);
    expect(rates.last10).toBeCloseTo(7 / 10, 5);
    expect(rates.best).toBeCloseTo(8 / 11, 5);
  });

  test('modello deterministico a parita di input e parametri', () => {
    const quotes = [quote()];
    const votes = [vote(1, true, 6.5), vote(2, false, null), vote(3, true, 7)];
    const first = runSyntheticRoundQuoteModel(quotes, votes, DEFAULT_SYNTHETIC_QUOTE_PARAMS, ['2023/24']);
    const second = runSyntheticRoundQuoteModel(quotes, votes, DEFAULT_SYNTHETIC_QUOTE_PARAMS, ['2023/24']);
    expect(second).toEqual(first);
  });
});
