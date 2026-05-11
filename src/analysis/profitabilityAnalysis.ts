import { MonteCarloResult } from '../simulation/monteCarloSimulator';
import { TradingRules } from '../config/defaultRules';

export interface ProfitabilityReport {
  /** Ricavo medio piattaforma per stagione */
  avgPlatformRevenue: number;
  /** Ricavo piattaforma nel caso pessimistico (5° percentile) */
  p5PlatformRevenue: number;
  /** Ricavo piattaforma nel caso ottimistico (95° percentile) */
  p95PlatformRevenue: number;
  /** Montepremi medio per stagione */
  avgPrizePool: number;
  /** Commissione media per operazione */
  avgCommissionPerOp: number;
  /** Numero di operazioni necessarie per coprire i costi fissi */
  breakEvenOps: number;
  /** La piattaforma è sostenibile nello scenario base? */
  isSustainable: boolean;
}

export function analyzeProfitability(
  result: MonteCarloResult,
  fixedCosts: number = 0,
): ProfitabilityReport {
  const revenues = result.runs.map(r => r.platformRevenue).sort((a, b) => a - b);
  const n = revenues.length;

  const avgPlatformRevenue = revenues.reduce((s, v) => s + v, 0) / n;
  const p5PlatformRevenue = revenues[Math.floor(n * 0.05)] ?? revenues[0];
  const p95PlatformRevenue = revenues[Math.floor(n * 0.95)] ?? revenues[n - 1];

  const avgTotalOps = result.summary.avgTotalOperations;
  const avgCommissionPerOp = avgTotalOps > 0
    ? result.runs.reduce((s, r) => s + r.totalCommissions, 0) / result.runs.length / avgTotalOps
    : 0;

  const breakEvenOps = avgCommissionPerOp > 0
    ? Math.ceil(fixedCosts / (avgCommissionPerOp * result.preset.rules.platformFeeRate))
    : Infinity;

  return {
    avgPlatformRevenue,
    p5PlatformRevenue,
    p95PlatformRevenue,
    avgPrizePool: result.summary.avgPrizePool,
    avgCommissionPerOp,
    breakEvenOps,
    isSustainable: p5PlatformRevenue > fixedCosts,
  };
}
