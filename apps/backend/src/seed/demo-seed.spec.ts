import { PlayerRole } from '@prisma/client';
import {
  countComposition,
  mapSeedRole,
  selectDemoRoster,
  selectDemoRosterByStrategy,
  splitSeedPlayerName,
  type ProcessedQuoteSeedRow,
  type ProcessedVoteSeedRow,
  type SyntheticQuoteSeedRow,
} from './demo-seed';

function quote(playerId: number, role: string, playerName: string, currentOrFinalQuote: number): ProcessedQuoteSeedRow {
  return {
    season: '2024/25',
    playerId,
    role,
    playerName,
    club: `Club ${role}`,
    initialQuote: Math.max(1, currentOrFinalQuote - 1),
    currentOrFinalQuote,
  };
}

describe('demo seed helpers', () => {
  it('maps Fantacalcio roles to backend roles', () => {
    expect(mapSeedRole('P')).toBe(PlayerRole.GK);
    expect(mapSeedRole('D')).toBe(PlayerRole.DEF);
    expect(mapSeedRole('C')).toBe(PlayerRole.MID);
    expect(mapSeedRole('A')).toBe(PlayerRole.FWD);
  });

  it('keeps real player names when splitting display names', () => {
    expect(splitSeedPlayerName('Donnarumma G.')).toEqual({ firstName: 'G.', lastName: 'Donnarumma' });
    expect(splitSeedPlayerName('Lukaku')).toEqual({ firstName: '', lastName: 'Lukaku' });
  });

  it('selects an idempotent 3/8/8/6 roster with no duplicate players', () => {
    const quotes: ProcessedQuoteSeedRow[] = [
      ...Array.from({ length: 4 }, (_, index) => quote(100 + index, 'P', `Portiere Reale ${index}`, 20 - index)),
      ...Array.from({ length: 10 }, (_, index) => quote(200 + index, 'D', `Difensore Reale ${index}`, 18 - index)),
      ...Array.from({ length: 10 }, (_, index) => quote(300 + index, 'C', `Centrocampista Reale ${index}`, 22 - index)),
      ...Array.from({ length: 8 }, (_, index) => quote(400 + index, 'A', `Attaccante Reale ${index}`, 28 - index)),
      quote(100, 'P', 'Portiere Duplicato', 1),
    ];
    const votes: ProcessedVoteSeedRow[] = quotes.map((row) => ({
      season: '2024/25',
      round: 1,
      playerId: row.playerId,
      playerName: row.playerName,
      club: row.club,
      role: row.role,
      vote: 6,
      fantasyVote: 6,
      played: true,
    }));
    const synthetic: SyntheticQuoteSeedRow[] = quotes.map((row) => ({
      season: '2024/25',
      round: 1,
      playerId: row.playerId,
      playerName: row.playerName,
      club: row.club,
      role: row.role,
      initialQuote: row.initialQuote,
      qaa: row.currentOrFinalQuote,
    }));

    const roster = selectDemoRoster(quotes, votes, synthetic);
    const composition = countComposition(roster);
    const playerIds = new Set(roster.map((player) => String(player.playerId)));

    expect(roster).toHaveLength(25);
    expect(playerIds.size).toBe(25);
    expect(composition).toEqual({
      [PlayerRole.GK]: 3,
      [PlayerRole.DEF]: 8,
      [PlayerRole.MID]: 8,
      [PlayerRole.FWD]: 6,
    });
    expect(roster.every((player) => player.voteCount > 0 && player.syntheticTrendCount > 0)).toBe(true);
  });

  it('selects valid 2025/26 strategy rosters for multi-team demo users', () => {
    const quotes: ProcessedQuoteSeedRow[] = [
      ...Array.from({ length: 5 }, (_, index) => quote(1100 + index, 'P', `Portiere 2025 ${index}`, 5 + index)),
      ...Array.from({ length: 12 }, (_, index) => quote(1200 + index, 'D', `Difensore 2025 ${index}`, 6 + index)),
      ...Array.from({ length: 12 }, (_, index) => quote(1300 + index, 'C', `Centrocampista 2025 ${index}`, 7 + index)),
      ...Array.from({ length: 10 }, (_, index) => quote(1400 + index, 'A', `Attaccante 2025 ${index}`, 8 + index)),
    ].map((row) => ({ ...row, season: '2025/26' }));
    const votes: ProcessedVoteSeedRow[] = quotes.flatMap((row) => [1, 2, 3].map((round) => ({
      season: '2025/26',
      round,
      playerId: row.playerId,
      playerName: row.playerName,
      club: row.club,
      role: row.role,
      vote: 6,
      fantasyVote: 6.5,
      played: true,
    })));
    const synthetic: SyntheticQuoteSeedRow[] = quotes.flatMap((row) => [1, 2, 3].map((round) => ({
      season: '2025/26',
      round,
      playerId: row.playerId,
      playerName: row.playerName,
      club: row.club,
      role: row.role,
      initialQuote: row.initialQuote,
      qaa: row.currentOrFinalQuote,
    })));

    for (const strategy of ['value', 'lowcost', 'top', 'balanced'] as const) {
      const roster = selectDemoRosterByStrategy(quotes, votes, synthetic, '2025/26', strategy);
      const playerIds = new Set(roster.map((player) => String(player.playerId)));

      expect(roster).toHaveLength(25);
      expect(playerIds.size).toBe(25);
      expect(countComposition(roster)).toEqual({
        [PlayerRole.GK]: 3,
        [PlayerRole.DEF]: 8,
        [PlayerRole.MID]: 8,
        [PlayerRole.FWD]: 6,
      });
      expect(roster.every((player) => player.playerName.includes('2025'))).toBe(true);
    }
  });
});
