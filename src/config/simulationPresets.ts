import { TradingRules, DEFAULT_RULES } from './defaultRules';
import { PrizeDistribution, DEFAULT_PRIZE_TABLE, SMALL_LEAGUE_PRIZE_TABLE } from './prizeTables';

export interface SimulationPreset {
  name: string;
  description: string;
  numTeams: number;
  operationsPerTeamPerRound: number;
  numSimulations: number;
  rules: TradingRules;
  prizeTable: PrizeDistribution[];
  randomSeed?: number;
}

export const SIMULATION_PRESETS: Record<string, SimulationPreset> = {
  small: {
    name: 'Lega Piccola',
    description: '8 squadre, 2 operazioni medie per giornata — scenario baseline',
    numTeams: 8,
    operationsPerTeamPerRound: 2,
    numSimulations: 100,
    rules: DEFAULT_RULES,
    prizeTable: SMALL_LEAGUE_PRIZE_TABLE,
    randomSeed: 42,
  },
  medium: {
    name: 'Lega Media',
    description: '16 squadre, 3 operazioni medie per giornata — scenario tipico',
    numTeams: 16,
    operationsPerTeamPerRound: 3,
    numSimulations: 500,
    rules: DEFAULT_RULES,
    prizeTable: DEFAULT_PRIZE_TABLE,
    randomSeed: 42,
  },
  large: {
    name: 'Lega Grande',
    description: '32 squadre, 5 operazioni medie per giornata — scenario alto volume',
    numTeams: 32,
    operationsPerTeamPerRound: 5,
    numSimulations: 1000,
    rules: { ...DEFAULT_RULES, buyCommissionRate: 0.08, sellCommissionRate: 0.08 },
    prizeTable: DEFAULT_PRIZE_TABLE,
    randomSeed: 42,
  },
  stressLow: {
    name: 'Stress Test — Bassa Partecipazione',
    description: '8 squadre, 0.5 operazioni medie per giornata — worst case volume',
    numTeams: 8,
    operationsPerTeamPerRound: 0.5,
    numSimulations: 200,
    rules: DEFAULT_RULES,
    prizeTable: SMALL_LEAGUE_PRIZE_TABLE,
    randomSeed: 42,
  },
};
