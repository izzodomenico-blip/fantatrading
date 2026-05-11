import { TradingRules } from '../config/defaultRules';
import { SimulationPreset } from '../config/simulationPresets';
import { runMonteCarloSimulation } from '../simulation/monteCarloSimulator';

export interface SensitivityPoint {
  parameterValue: number;
  avgPrizePool: number;
  avgPlatformRevenue: number;
  delta_prizePool_pct: number;
  delta_platformRevenue_pct: number;
}

export interface SensitivityResult {
  parameterName: string;
  baseValue: number;
  basePrizePool: number;
  basePlatformRevenue: number;
  points: SensitivityPoint[];
}

type SensitiveParam = 'buyCommissionRate' | 'sellCommissionRate' | 'prizePoolContributionRate' | 'platformFeeRate';

export function runSensitivityAnalysis(
  basePreset: SimulationPreset,
  parameterName: SensitiveParam,
  valuesToTest: number[],
): SensitivityResult {
  const baseResult = runMonteCarloSimulation(basePreset);
  const basePrizePool = baseResult.summary.avgPrizePool;
  const basePlatformRevenue = baseResult.summary.avgPlatformRevenue;
  const baseValue = basePreset.rules[parameterName];

  const points: SensitivityPoint[] = valuesToTest.map(val => {
    const preset: SimulationPreset = {
      ...basePreset,
      rules: { ...basePreset.rules, [parameterName]: val },
      numSimulations: Math.min(basePreset.numSimulations, 100),
    };
    const result = runMonteCarloSimulation(preset);
    const avgPrizePool = result.summary.avgPrizePool;
    const avgPlatformRevenue = result.summary.avgPlatformRevenue;

    return {
      parameterValue: val,
      avgPrizePool,
      avgPlatformRevenue,
      delta_prizePool_pct: basePrizePool > 0 ? ((avgPrizePool - basePrizePool) / basePrizePool) * 100 : 0,
      delta_platformRevenue_pct: basePlatformRevenue > 0 ? ((avgPlatformRevenue - basePlatformRevenue) / basePlatformRevenue) * 100 : 0,
    };
  });

  return { parameterName, baseValue, basePrizePool, basePlatformRevenue, points };
}
