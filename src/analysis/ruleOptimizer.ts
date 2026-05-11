import { TradingRules, DEFAULT_RULES } from '../config/defaultRules';
import { SimulationPreset } from '../config/simulationPresets';
import { DEFAULT_PRIZE_TABLE } from '../config/prizeTables';
import { runMonteCarloSimulation } from '../simulation/monteCarloSimulator';

export type OptimizationTarget = 'maxPrizePool' | 'maxPlatformRevenue' | 'balanced';

export interface OptimizationCandidate {
  rules: Partial<TradingRules>;
  score: number;
  avgPrizePool: number;
  avgPlatformRevenue: number;
}

export interface OptimizationResult {
  target: OptimizationTarget;
  bestCandidate: OptimizationCandidate;
  allCandidates: OptimizationCandidate[];
  baselineScore: number;
  improvement: number;
}

function scoreCandidate(
  avgPrizePool: number,
  avgPlatformRevenue: number,
  target: OptimizationTarget,
): number {
  if (target === 'maxPrizePool') return avgPrizePool;
  if (target === 'maxPlatformRevenue') return avgPlatformRevenue;
  // balanced: normalizes both metrics and combines them
  return avgPrizePool * 0.6 + avgPlatformRevenue * 0.4;
}

export function optimizeRules(
  basePreset: SimulationPreset,
  target: OptimizationTarget,
  commissionRateCandidates: number[] = [0.05, 0.08, 0.10, 0.12, 0.15],
  splitCandidates: number[] = [0.70, 0.75, 0.80, 0.85, 0.90],
): OptimizationResult {
  const fastPreset: SimulationPreset = { ...basePreset, numSimulations: 50, randomSeed: 42 };

  const baseResult = runMonteCarloSimulation(fastPreset);
  const baselineScore = scoreCandidate(
    baseResult.summary.avgPrizePool,
    baseResult.summary.avgPlatformRevenue,
    target,
  );

  const candidates: OptimizationCandidate[] = [];

  for (const commRate of commissionRateCandidates) {
    for (const split of splitCandidates) {
      const rules: TradingRules = {
        ...fastPreset.rules,
        buyCommissionRate: commRate,
        sellCommissionRate: commRate,
        prizePoolContributionRate: split,
        platformFeeRate: 1 - split,
      };
      const preset: SimulationPreset = { ...fastPreset, rules };
      const result = runMonteCarloSimulation(preset);

      candidates.push({
        rules: { buyCommissionRate: commRate, sellCommissionRate: commRate, prizePoolContributionRate: split, platformFeeRate: 1 - split },
        score: scoreCandidate(result.summary.avgPrizePool, result.summary.avgPlatformRevenue, target),
        avgPrizePool: result.summary.avgPrizePool,
        avgPlatformRevenue: result.summary.avgPlatformRevenue,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  return {
    target,
    bestCandidate: best,
    allCandidates: candidates,
    baselineScore,
    improvement: baselineScore > 0 ? ((best.score - baselineScore) / baselineScore) * 100 : 0,
  };
}
