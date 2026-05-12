import * as fs from 'fs';
import * as path from 'path';
import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../../src/importers/realVotesImporter';
import {
  buildFullRulesRoster,
  buildHistoricalFullRulesCsv,
  buildHistoricalFullRulesMarkdown,
  buildMatchedSeasonPool,
  calculateSellValue,
  evaluateFullRulesPortfolio,
  getRoundVoteInput,
  runHistoricalFullRulesBacktest,
} from '../../src/analysis/historicalFullRulesBacktest';
import { calculateTeamVoteBand } from '../../src/engine/teamVoteBandEngine';
import { getBonusMalusPct } from '../../src/engine/fantaTradingBonusTableEngine';

function quote(overrides: Partial<NormalizedQuoteRow> = {}): NormalizedQuoteRow {
  return {
    season: '2023/24',
    seasonStatus: 'completed',
    playerId: 1,
    role: 'P',
    roleExtended: 'Por',
    playerName: 'Player 1',
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
    sourceFile: 'test.xlsx',
    ...overrides,
  };
}

function vote(overrides: Partial<NormalizedVoteRow> = {}): NormalizedVoteRow {
  return {
    season: '2023/24',
    seasonStatus: 'completed',
    round: 1,
    playerId: '1',
    playerName: 'Player 1',
    club: 'Club',
    role: 'P',
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
    sourceFile: 'votes.xlsx',
    ...overrides,
  };
}

function makeRoster(season = '2023/24', seasonStatus: 'completed' | 'in_progress' = 'completed'): NormalizedQuoteRow[] {
  let id = 1;
  const rows: NormalizedQuoteRow[] = [];
  for (const [role, count] of Object.entries({ P: 3, D: 8, C: 8, A: 6 })) {
    for (let i = 0; i < count; i++) {
      rows.push(quote({
        season,
        seasonStatus,
        playerId: id,
        role: role as NormalizedQuoteRow['role'],
        playerName: `Player ${id}`,
        initialQuote: 10 + (id % 5),
        currentOrFinalQuote: 11 + (id % 5),
      }));
      id++;
    }
  }
  return rows;
}

function makeVotesForRoster(roster: NormalizedQuoteRow[], rounds = [1], seasonStatus: 'completed' | 'in_progress' = 'completed'): NormalizedVoteRow[] {
  return rounds.flatMap(round => roster.map(player => vote({
    season: player.season,
    seasonStatus,
    round,
    playerId: String(player.playerId),
    playerName: player.playerName,
    club: player.club,
    role: player.role,
    vote: 6,
    played: true,
  })));
}

describe('historicalFullRulesBacktest', () => {
  test('generazione rosa valida solo da pool matched', () => {
    const roster = makeRoster();
    const extraQuote = quote({ playerId: 999, role: 'A', playerName: 'Quote Only' });
    const votes = makeVotesForRoster(roster);
    const pool = buildMatchedSeasonPool([...roster, extraQuote], votes, '2023/24');

    expect(pool.matchedRows).toHaveLength(25);
    expect(pool.quoteOnlyRows.map(row => row.playerId)).toContain(999);

    const selected = buildFullRulesRoster(pool.matchedRows, 'RANDOM', () => 0.1);
    expect(selected).toHaveLength(25);
    expect(selected.some(row => row.playerId === 999)).toBe(false);
    expect(selected.filter(row => row.role === 'P')).toHaveLength(3);
    expect(selected.filter(row => row.role === 'D')).toHaveLength(8);
    expect(selected.filter(row => row.role === 'C')).toHaveLength(8);
    expect(selected.filter(row => row.role === 'A')).toHaveLength(6);
  });

  test('SV derivato per assenza nel round', () => {
    const roster = makeRoster();
    const votes = makeVotesForRoster(roster).filter(row => row.playerId !== '1');
    const index = new Map(votes.map(row => [`${row.season}|${row.round}|${row.playerId}`, row]));
    expect(getRoundVoteInput(roster[0], 1, index)).toEqual({ playerId: 1, played: false, vote: null });
  });

  test('applicazione NoVotePolicy ZERO', () => {
    const inputs = makeRoster().map((player, idx) => ({ playerId: player.playerId, played: idx !== 0, vote: idx === 0 ? null : 6 }));
    const result = calculateTeamVoteBand(inputs, { policy: 'ZERO' });
    expect(result.totalVoteSum).toBe(144);
    expect(result.averageVote).toBeCloseTo(144 / 25);
  });

  test('applicazione NoVotePolicy FIVE', () => {
    const inputs = makeRoster().map((player, idx) => ({ playerId: player.playerId, played: idx !== 0, vote: idx === 0 ? null : 6 }));
    const result = calculateTeamVoteBand(inputs, { policy: 'FIVE' });
    expect(result.totalVoteSum).toBe(149);
  });

  test('applicazione NoVotePolicy EXCLUDE', () => {
    const inputs = makeRoster().map((player, idx) => ({ playerId: player.playerId, played: idx !== 0, vote: idx === 0 ? null : 6 }));
    const result = calculateTeamVoteBand(inputs, { policy: 'EXCLUDE' });
    expect(result.evaluatedCount).toBe(24);
    expect(result.averageVote).toBe(6);
  });

  test('applicazione NoVotePolicy PLAYER_MALUS_TEAM_EXCLUDE', () => {
    const roster = makeRoster();
    const votes = makeVotesForRoster(roster).filter(row => row.playerId !== '1');
    const result = evaluateFullRulesPortfolio(roster, votes, { policy: 'PLAYER_MALUS_TEAM_EXCLUDE', fixedMalusPct: -10 });
    expect(result.derivedNoVotes).toBe(1);
    expect(result.fullRulesROI).toBeLessThan(result.tradingOnlyROI);
  });

  test('applicazione NoVotePolicy PLAYER_ZERO_TEAM_EXCLUDE', () => {
    const roster = makeRoster();
    const votes = makeVotesForRoster(roster).filter(row => row.playerId !== '1');
    const result = evaluateFullRulesPortfolio(roster, votes, { policy: 'PLAYER_ZERO_TEAM_EXCLUDE' });
    expect(result.derivedNoVotes).toBe(1);
    expect(result.playedVotes).toBe(24);
  });

  test('calcolo fascia squadra', () => {
    const inputs = makeRoster().map(player => ({ playerId: player.playerId, played: true, vote: 6 }));
    expect(calculateTeamVoteBand(inputs).teamBand).toBe('FASCIA_3');
  });

  test('applicazione bonus/malus ufficiale', () => {
    expect(getBonusMalusPct('FASCIA_4', 8.5).bonusMalusPct).toBe(3.75);
    expect(getBonusMalusPct('FASCIA_0', 6).bonusMalusPct).toBe(-2.5);
  });

  test('sellValue mai negativo', () => {
    expect(calculateSellValue(10, -500)).toBe(0);
  });

  test('nessun uso della stagione 2025/26 nei risultati completed', () => {
    const completedRoster = makeRoster('2023/24', 'completed');
    const completedVotes = makeVotesForRoster(completedRoster);
    const inProgressRoster = makeRoster('2025/26', 'in_progress');
    const inProgressVotes = makeVotesForRoster(inProgressRoster, [1], 'in_progress');
    const report = runHistoricalFullRulesBacktest(
      [...completedRoster, ...inProgressRoster],
      [...completedVotes, ...inProgressVotes],
      { numSimulations: 1, randomSeed: 1, fixedNoVoteMalusPct: -5 },
    );
    expect(report.completedStats.some(stat => stat.season === '2025/26')).toBe(false);
    expect(report.inProgressStats.some(stat => stat.season === '2025/26')).toBe(true);
  });

  test('output report generato', () => {
    const roster2023 = makeRoster('2023/24', 'completed');
    const roster2024 = makeRoster('2024/25', 'completed');
    const votes2023 = makeVotesForRoster(roster2023);
    const votes2024 = makeVotesForRoster(roster2024);
    const report = runHistoricalFullRulesBacktest(
      [...roster2023, ...roster2024],
      [...votes2023, ...votes2024],
      { numSimulations: 1, randomSeed: 1, fixedNoVoteMalusPct: -5 },
    );
    const csv = buildHistoricalFullRulesCsv(report);
    const md = buildHistoricalFullRulesMarkdown(report);
    expect(csv.rows.length).toBeGreaterThan(0);
    expect(md).toContain('Backtest Storico Full Rules V1');
  });

  test('script output path dichiarato', () => {
    expect(path.basename('reports/real-data/historical_full_rules_backtest.md')).toBe('historical_full_rules_backtest.md');
    expect(fs.existsSync(path.resolve(__dirname, '../../scripts/run-historical-full-rules-backtest.ts'))).toBe(true);
  });
});
