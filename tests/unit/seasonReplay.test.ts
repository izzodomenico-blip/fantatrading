import { buildPlayerRoundMemory } from '../../app/web/src/utils/playerRoundMemory';
import {
  ACTIVE_SEASON_ID_KEY,
  ACTIVE_SIMULATION_ROUND_KEY,
  ACTIVE_TEAM_ID_KEY,
  advanceRound,
  clampRound,
  rankTeamsByRoi,
  readActiveSimulationTeam,
  resetRound,
  setActiveSimulationTeam,
} from '../../app/web/src/utils/seasonReplay';
import { buildTeamReplay, buildTeamRoundSnapshot } from '../../app/web/src/utils/teamRoundSimulation';
import type { ReplayPosition } from '../../app/web/src/utils/teamRoundSimulation';
import type { RawSyntheticRoundQuote, RawVoteRow } from '../../app/web/src/utils/playerTrend';

function position(playerId: string, playerName: string, initialQuote = 10): ReplayPosition {
  return {
    id: `pos-${playerId}`,
    playerId,
    backendPlayerId: `backend-${playerId}`,
    playerName,
    realTeam: 'Club Reale',
    role: 'C',
    initialQuote,
    currentQuote: initialQuote + 1,
    fantasyMultiplier: 1,
    status: 'ACTIVE',
  };
}

describe('season historical replay utilities', () => {
  const players = [
    position('10', 'Giocatore Voto', 10),
    position('20', 'Giocatore SV', 8),
  ];
  const votes: RawVoteRow[] = [
    { playerId: 'backend-10', round: 1, vote: 6.5, fantasyVote: 7, played: true },
    { playerId: 'backend-10', round: 2, vote: 6, fantasyVote: 6, played: true },
  ];
  const syntheticRows: RawSyntheticRoundQuote[] = [
    { season: '2025/26', playerId: '10', playerName: 'Giocatore Voto', club: 'Club Reale', role: 'C', round: 1, initialQuote: 10, qaa: 10 },
    { season: '2025/26', playerId: '10', playerName: 'Giocatore Voto', club: 'Club Reale', role: 'C', round: 2, initialQuote: 10, qaa: 11 },
    { season: '2025/26', playerId: '20', playerName: 'Giocatore SV', club: 'Club Reale', role: 'C', round: 1, initialQuote: 8, qaa: 8 },
    { season: '2025/26', playerId: '20', playerName: 'Giocatore SV', club: 'Club Reale', role: 'C', round: 2, initialQuote: 8, qaa: 9 },
  ];

  it('builds player memory from G1 to G36 using real votes where available', () => {
    const memory = buildPlayerRoundMemory(players.map(item => ({
      playerId: item.playerId ?? item.id,
      backendPlayerId: item.backendPlayerId,
      externalId: item.playerId,
      playerName: item.playerName,
      role: item.role,
      club: item.realTeam,
      season: '2025/26',
      initialQuote: item.initialQuote,
      currentQuote: item.currentQuote,
    })), votes, syntheticRows, { season: '2025/26', maxRound: 36 });

    const voted = memory.get('10');
    const sv = memory.get('20');

    expect(voted?.rounds).toHaveLength(36);
    expect(voted?.rounds[0].vote).toBe(6.5);
    expect(voted?.rounds[0].sourceVote).toBe('official');
    expect(sv?.rounds[0].isSv).toBe(true);
    expect(sv?.rounds[0].sourceVote).toBe('missing');
  });

  it('matches real vote rows by player name, club and role when ids come from different sources', () => {
    const memory = buildPlayerRoundMemory([{
      playerId: 'external-4431',
      backendPlayerId: 'backend-carnesecchi',
      externalId: 'external-4431',
      playerName: 'Carnesecchi',
      role: 'P',
      club: 'Atalanta',
      season: '2025/26',
      initialQuote: 12,
      currentQuote: 13,
    }], [{
      season: '2025/26',
      playerId: '4431',
      playerName: 'Carnesecchi',
      club: 'Atalanta',
      role: 'P',
      round: 1,
      vote: 6.5,
      fantasyVote: null,
      played: true,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    }], [], { season: '2025/26', maxRound: 36 });

    expect(memory.get('external-4431')?.rounds[0].vote).toBe(6.5);
    expect(memory.get('external-4431')?.rounds[0].sourceVote).toBe('official');
    expect(memory.get('external-4431')?.rounds[0].isSv).toBe(false);
  });

  it('uses +1 quote as +5% fanta trading return', () => {
    const memory = buildPlayerRoundMemory([{
      playerId: '10',
      backendPlayerId: 'backend-10',
      externalId: '10',
      playerName: 'Giocatore Voto',
      role: 'C',
      club: 'Club Reale',
      season: '2025/26',
      initialQuote: 10,
      currentQuote: 11,
    }], votes, syntheticRows, { season: '2025/26', maxRound: 36 });

    expect(memory.get('10')?.rounds[1].quote).toBe(11);
    expect(memory.get('10')?.rounds[1].fantaTradingReturnPct).toBe(5);
  });

  it('excludes SV players from team average and counts them in the snapshot', () => {
    const memory = buildPlayerRoundMemory(players.map(item => ({
      playerId: item.playerId ?? item.id,
      backendPlayerId: item.backendPlayerId,
      externalId: item.playerId,
      playerName: item.playerName,
      role: item.role,
      club: item.realTeam,
      season: '2025/26',
      initialQuote: item.initialQuote,
      currentQuote: item.currentQuote,
    })), votes, syntheticRows, { season: '2025/26', maxRound: 36 });
    const snapshot = buildTeamRoundSnapshot({
      teamId: 'team-1',
      seasonId: 'season-2025',
      virtualCashBalance: 0,
      totalCapitalDeposited: 30,
    }, players, memory, 1);

    expect(snapshot.activePlayersCount).toBe(2);
    expect(snapshot.playersWithVote).toBe(1);
    expect(snapshot.svCount).toBe(1);
    expect(snapshot.teamVoteAverage).toBe(6.5);
    expect(snapshot.teamBandLabel).toBe('FASCIA_4');
    expect(snapshot.playerSnapshots.find(player => player.playerId === '20')?.fantasyBonusPct).toBe(0);
    expect(snapshot.playerSnapshots.find(player => player.playerId === '10')?.fantasyBonusPct).toBeGreaterThan(0);
  });

  it('builds ROI round-by-round and ranks teams by ROI%', () => {
    const memory = buildPlayerRoundMemory(players.map(item => ({
      playerId: item.playerId ?? item.id,
      backendPlayerId: item.backendPlayerId,
      externalId: item.playerId,
      playerName: item.playerName,
      role: item.role,
      club: item.realTeam,
      season: '2025/26',
      initialQuote: item.initialQuote,
      currentQuote: item.currentQuote,
    })), votes, syntheticRows, { season: '2025/26', maxRound: 36 });
    const replayA = buildTeamReplay({ teamId: 'a', seasonId: 's', virtualCashBalance: 0, totalCapitalDeposited: 30 }, players, memory, 36);
    const replayB = buildTeamReplay({ teamId: 'b', seasonId: 's', virtualCashBalance: 0, totalCapitalDeposited: 50 }, players, memory, 36);
    const ranking = rankTeamsByRoi([
      { key: 'A', snapshot: replayA[1] },
      { key: 'B', snapshot: replayB[1] },
    ]);

    expect(replayA).toHaveLength(36);
    expect(replayA[0].totalSpentPlayers).toBeGreaterThan(0);
    expect(replayA[0].buyCommissions).toBeGreaterThan(0);
    expect(replayA[0]).toHaveProperty('netLiquidationValue');
    expect(Number.isFinite(replayA[1].roiPct)).toBe(true);
    expect(ranking[0].snapshot.roiPct).toBeGreaterThanOrEqual(ranking[1].snapshot.roiPct);
  });

  it('advances, resets and clamps replay rounds without database mutation', () => {
    expect(advanceRound(35, 36)).toBe(36);
    expect(advanceRound(36, 36)).toBe(36);
    expect(resetRound()).toBe(1);
    expect(clampRound(99, 36)).toBe(36);
    expect(clampRound(-3, 36)).toBe(1);
  });

  it('stores and reads active simulation team without mutating the database', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    };

    setActiveSimulationTeam(storage, 'team-created', 'season-2025', 7);

    expect(store.get(ACTIVE_TEAM_ID_KEY)).toBe('team-created');
    expect(store.get(ACTIVE_SEASON_ID_KEY)).toBe('season-2025');
    expect(store.get(ACTIVE_SIMULATION_ROUND_KEY)).toBe('7');
    expect(readActiveSimulationTeam(storage)).toEqual({ teamId: 'team-created', seasonId: 'season-2025', round: 7 });
  });
});
