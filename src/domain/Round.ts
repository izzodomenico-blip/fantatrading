import { PlayerStats } from './Player';
import { MarketOperation } from './MarketOperation';

export interface RoundPlayerResult {
  playerId: string;
  stats: PlayerStats;
  bonusMalus: number;
  previousValue: number;
  newValue: number;
}

export interface Round {
  number: number;
  seasonId: string;
  operations: MarketOperation[];
  playerResults: RoundPlayerResult[];
  totalCommissionsGenerated: number;
  isCompleted: boolean;
}

export function createRound(number: number, seasonId: string): Round {
  return {
    number,
    seasonId,
    operations: [],
    playerResults: [],
    totalCommissionsGenerated: 0,
    isCompleted: false,
  };
}

export function totalCommissionsInRound(round: Round): number {
  return round.operations.reduce((sum, op) => sum + op.commission, 0);
}
