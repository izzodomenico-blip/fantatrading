import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../../src/importers/realVotesImporter';
import { buildFullRulesStressMarkdown, runFullRulesStressTest } from '../../src/analysis/fullRulesStressTest';

function quote(season: string, id: number, role: NormalizedQuoteRow['role']): NormalizedQuoteRow {
  return {
    season,
    seasonStatus: season === '2025/26' ? 'in_progress' : 'completed',
    playerId: id,
    role,
    roleExtended: role,
    playerName: `P${id}`,
    club: 'Club',
    initialQuote: 10,
    currentOrFinalQuote: 11,
    quoteDiff: 1,
    quoteRawReturnPct: 10,
    quoteTradingReturnPct: 5,
    initialQuoteMantra: 10,
    currentOrFinalQuoteMantra: 11,
    quoteDiffMantra: 1,
    fvm: 10,
    fvmMantra: 10,
    sourceFile: 'x.xlsx',
  };
}

function seasonRows(season: string): { quotes: NormalizedQuoteRow[]; votes: NormalizedVoteRow[] } {
  let id = 1;
  const quotes: NormalizedQuoteRow[] = [];
  for (const [role, count] of Object.entries({ P: 3, D: 8, C: 8, A: 6 })) {
    for (let i = 0; i < count; i++) quotes.push(quote(season, id++, role as NormalizedQuoteRow['role']));
  }
  const votes: NormalizedVoteRow[] = quotes.map(q => ({
    season,
    seasonStatus: q.seasonStatus,
    round: 1,
    playerId: String(q.playerId),
    playerName: q.playerName,
    club: q.club,
    role: q.role,
    vote: 6,
    fantasyVote: null,
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
  }));
  return { quotes, votes };
}

describe('fullRulesStressTest', () => {
  test('genera report con PLAYER_ZERO_TEAM_EXCLUDE come policy raccomandata', () => {
    const s2023 = seasonRows('2023/24');
    const s2024 = seasonRows('2024/25');
    const s2025 = seasonRows('2025/26');
    const report = runFullRulesStressTest(
      [...s2023.quotes, ...s2024.quotes, ...s2025.quotes],
      [...s2023.votes, ...s2024.votes, ...s2025.votes],
      { numSimulations: 1, randomSeed: 7, prizeThresholds: [7], platformFeeRates: [0.1], sellCommissionRates: [0.02] },
    );
    expect(report.recommended.noVotePolicy).toBe('PLAYER_ZERO_TEAM_EXCLUDE');
    expect(report.strategyStats.some(s => s.season === '2025/26')).toBe(false);
    expect(report.inProgressStats.some(s => s.season === '2025/26')).toBe(true);
    expect(buildFullRulesStressMarkdown(report)).toContain('Proposta Regolamento FantaTrading V1');
  });
});
