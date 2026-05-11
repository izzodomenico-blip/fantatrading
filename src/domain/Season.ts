import { Round } from './Round';
import { Team } from './Team';

export interface SeasonConfig {
  id: string;
  name: string;
  numRounds: number;
  registrationFeePerTeam: number;
}

export interface Season {
  config: SeasonConfig;
  teams: Team[];
  rounds: Round[];
  totalCommissionsCollected: number;
  totalPrizePool: number;
  platformRevenue: number;
  isCompleted: boolean;
}

export function createSeason(config: SeasonConfig, teams: Team[]): Season {
  return {
    config,
    teams,
    rounds: [],
    totalCommissionsCollected: 0,
    totalPrizePool: 0,
    platformRevenue: 0,
    isCompleted: false,
  };
}

export function getCompletedRoundsCount(season: Season): number {
  return season.rounds.filter(r => r.isCompleted).length;
}
