import { TradingRules, DEFAULT_RULES } from '../config/defaultRules';
import { SimulationPreset } from '../config/simulationPresets';
import { DEFAULT_PRIZE_TABLE } from '../config/prizeTables';
import { runMonteCarloSimulation } from './monteCarloSimulator';

export interface StressTestConfig {
  basePreset: SimulationPreset;
  parameterName: keyof TradingRules | 'numTeams' | 'operationsPerTeamPerRound';
  values: number[];
  numSimulationsPerValue: number;
}

export interface StressTestPoint {
  parameterValue: number;
  avgPrizePool: number;
  minPrizePool: number;
  maxPrizePool: number;
  avgPlatformRevenue: number;
  prizePoolStdDev: number;
}

export interface StressTestResult {
  config: StressTestConfig;
  points: StressTestPoint[];
}

export function runStressTest(config: StressTestConfig): StressTestResult {
  const points: StressTestPoint[] = config.values.map(value => {
    const preset: SimulationPreset = buildPresetVariant(config.basePreset, config.parameterName, value, config.numSimulationsPerValue);
    const result = runMonteCarloSimulation(preset);

    return {
      parameterValue: value,
      avgPrizePool: result.summary.avgPrizePool,
      minPrizePool: result.summary.minPrizePool,
      maxPrizePool: result.summary.maxPrizePool,
      avgPlatformRevenue: result.summary.avgPlatformRevenue,
      prizePoolStdDev: result.summary.prizePoolStdDev,
    };
  });

  return { config, points };
}

function buildPresetVariant(
  base: SimulationPreset,
  param: StressTestConfig['parameterName'],
  value: number,
  numSimulations: number,
): SimulationPreset {
  if (param === 'numTeams') {
    return { ...base, numTeams: value, numSimulations };
  }
  if (param === 'operationsPerTeamPerRound') {
    return { ...base, operationsPerTeamPerRound: value, numSimulations };
  }
  return {
    ...base,
    numSimulations,
    rules: { ...base.rules, [param]: value },
  };
}
