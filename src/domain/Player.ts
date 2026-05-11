export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface PlayerStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheet: boolean;
  minutesPlayed: number;
  rating: number;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  clubTeam: string;
  baseValue: number;
  currentValue: number;
  valueHistory: number[];
}

export function createPlayer(params: Omit<Player, 'valueHistory'>): Player {
  return { ...params, valueHistory: [params.baseValue] };
}

export function updatePlayerValue(player: Player, newValue: number): Player {
  return {
    ...player,
    currentValue: newValue,
    valueHistory: [...player.valueHistory, newValue],
  };
}

export function createEmptyStats(): PlayerStats {
  return {
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    cleanSheet: false,
    minutesPlayed: 0,
    rating: 6.0,
  };
}
