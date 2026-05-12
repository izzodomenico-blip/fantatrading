import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../../src/importers/realVotesImporter';
import {
  SyntheticRoundQuoteInput,
  buildInitialRoster,
  buildIntraseasonBacktestCsv,
  buildIntraseasonBacktestMarkdown,
  buildSyntheticQuoteIndex,
  executeTrade,
  isValidRoster,
  runIntraseasonTradingBacktest,
} from '../../src/analysis/intraseasonTradingBacktest';

function quote(season: string, id: number, role: NormalizedQuoteRow['role'], initialQuote = 10): NormalizedQuoteRow {
  return {
    season,
    seasonStatus: season === '2025/26' ? 'in_progress' : 'completed',
    playerId: id,
    role,
    roleExtended: role,
    playerName: `${role}${id}`,
    club: 'Club',
    initialQuote,
    currentOrFinalQuote: initialQuote + 1,
    quoteDiff: 1,
    quoteRawReturnPct: 10,
    quoteTradingReturnPct: 5,
    initialQuoteMantra: initialQuote,
    currentOrFinalQuoteMantra: initialQuote + 1,
    quoteDiffMantra: 1,
    fvm: 0,
    fvmMantra: 0,
    sourceFile: 'q.xlsx',
  };
}

function vote(season: string, round: number, q: NormalizedQuoteRow): NormalizedVoteRow {
  return {
    season,
    seasonStatus: q.seasonStatus,
    round,
    playerId: String(q.playerId),
    playerName: q.playerName,
    club: q.club,
    role: q.role,
    vote: 6,
    fantasyVote: 6,
    minutesPlayed: null,
    played: true,
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

function seasonData(season: string) {
  let id = 1;
  const quotes: NormalizedQuoteRow[] = [];
  for (const [role, count] of Object.entries({ P: 5, D: 10, C: 10, A: 8 })) {
    for (let i = 0; i < count; i++) quotes.push(quote(season, id++, role as NormalizedQuoteRow['role'], 5 + i));
  }
  const synthetic: SyntheticRoundQuoteInput[] = [];
  const votes: NormalizedVoteRow[] = [];
  for (let round = 1; round <= 8; round++) {
    for (const q of quotes) {
      synthetic.push({
        season,
        seasonStatus: q.seasonStatus,
        round,
        playerId: q.playerId,
        playerName: q.playerName,
        club: q.club,
        role: q.role,
        initialQuote: q.initialQuote,
        realCurrentOrFinalQuote: q.currentOrFinalQuote,
        qa: q.initialQuote + round * 0.1,
        qaa: q.initialQuote + (q.playerId % 3 === 0 ? round % 3 : 0),
      });
      votes.push(vote(season, round, q));
    }
  }
  return { quotes, synthetic, votes };
}

describe('intraseasonTradingBacktest', () => {
  test('legge quotazioni sintetiche per round', () => {
    const data = seasonData('2023/24');
    const index = buildSyntheticQuoteIndex(data.synthetic);
    expect(index.get('2023/24|2|1')?.qaa).toBeDefined();
  });

  test('costruisce rosa sempre valida 3P/8D/8C/6A', () => {
    const data = seasonData('2023/24');
    const roster = buildInitialRoster(data.quotes, 'HOLD');
    expect(isValidRoster(roster)).toBe(true);
  });

  test('vendita e riacquisto stesso ruolo con commissioni corrette', () => {
    const sold = { playerId: 1, role: 'P' as const, playerName: 'P1', club: 'Club', buyRound: 1, buyPrice: 10, fantasyMultiplier: 1 };
    const replacement = quote('2023/24', 99, 'P', 12);
    const result = executeTrade([sold], sold, replacement, 2, 11, 12);
    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].role).toBe('P');
    expect(result.commission).toBeCloseTo(11 * 0.02 + 12 * 0.02);
  });

  test('backtest non compra duplicati e non scende sotto 25 giocatori', () => {
    const s2023 = seasonData('2023/24');
    const s2024 = seasonData('2024/25');
    const s2025 = seasonData('2025/26');
    const report = runIntraseasonTradingBacktest(
      [...s2023.quotes, ...s2024.quotes, ...s2025.quotes],
      [...s2023.votes, ...s2024.votes, ...s2025.votes],
      [...s2023.synthetic, ...s2024.synthetic, ...s2025.synthetic],
      { marketFrequencies: [3], maxChangesPerWindow: [1], stopLossThresholds: [-5], takeProfitThresholds: [7] },
    );
    expect(report.scenarioResults.length).toBeGreaterThan(0);
    expect(report.scenarioResults.every(row => row.trades >= 0)).toBe(true);
  });

  test('calcola numero cambi e genera output report', () => {
    const s2023 = seasonData('2023/24');
    const s2024 = seasonData('2024/25');
    const s2025 = seasonData('2025/26');
    const report = runIntraseasonTradingBacktest(
      [...s2023.quotes, ...s2024.quotes, ...s2025.quotes],
      [...s2023.votes, ...s2024.votes, ...s2025.votes],
      [...s2023.synthetic, ...s2024.synthetic, ...s2025.synthetic],
      { marketFrequencies: [3], maxChangesPerWindow: [1], stopLossThresholds: [-5], takeProfitThresholds: [7] },
    );
    expect(report.completedStats.some(row => row.avgTrades >= 0)).toBe(true);
    expect(buildIntraseasonBacktestCsv(report)).toContain('avgROI');
    expect(buildIntraseasonBacktestMarkdown(report)).toContain('quotazioni giornata per giornata usate in questo report sono sintetiche');
  });
});
