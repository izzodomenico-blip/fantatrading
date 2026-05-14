import type { TeamRoundSnapshot } from './teamRoundSimulation';

export type SeasonReplayState = {
  selectedTeam?: string;
  teamIdByKey?: Record<string, string>;
  currentRoundByTeam: Record<string, number>;
  lastUpdated: string;
};

export const ACTIVE_TEAM_ID_KEY = 'fantatrading.activeTeamId';
export const ACTIVE_SEASON_ID_KEY = 'fantatrading.activeSeasonId';
export const ACTIVE_SIMULATION_ROUND_KEY = 'fantatrading.simulationRound';

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function advanceRound(currentRound: number, maxRound: number) {
  return Math.min(maxRound, currentRound + 1);
}

export function previousRound(currentRound: number) {
  return Math.max(1, currentRound - 1);
}

export function resetRound() {
  return 1;
}

export function clampRound(round: number, maxRound: number) {
  if (!Number.isFinite(round)) return 1;
  return Math.max(1, Math.min(maxRound, Math.round(round)));
}

export function rankTeamsByRoi<T extends { snapshot: TeamRoundSnapshot }>(items: T[]) {
  return [...items].sort((a, b) => b.snapshot.roiPct - a.snapshot.roiPct);
}

export function readReplayState(storage: StorageLike | undefined, key: string): SeasonReplayState | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) as SeasonReplayState : null;
  } catch {
    return null;
  }
}

export function writeReplayState(storage: StorageLike | undefined, key: string, state: Omit<SeasonReplayState, 'lastUpdated'>) {
  if (!storage) return;
  storage.setItem(key, JSON.stringify({
    ...state,
    lastUpdated: new Date().toISOString(),
  }));
}

export function setActiveSimulationTeam(storage: StorageLike | undefined, teamId: string, seasonId: string, round = 1) {
  if (!storage) return;
  storage.setItem(ACTIVE_TEAM_ID_KEY, teamId);
  storage.setItem(ACTIVE_SEASON_ID_KEY, seasonId);
  storage.setItem(ACTIVE_SIMULATION_ROUND_KEY, String(round));
}

export function readActiveSimulationTeam(storage: StorageLike | undefined) {
  if (!storage) return null;
  const teamId = storage.getItem(ACTIVE_TEAM_ID_KEY);
  const seasonId = storage.getItem(ACTIVE_SEASON_ID_KEY);
  const round = Number(storage.getItem(ACTIVE_SIMULATION_ROUND_KEY) ?? 1);
  return teamId && seasonId ? { teamId, seasonId, round: clampRound(round, 36) } : null;
}
