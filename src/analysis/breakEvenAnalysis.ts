import { TradingRules } from '../config/defaultRules';

export interface BreakEvenResult {
  /** Numero minimo di operazioni totali per la stagione */
  minOperations: number;
  /** Numero minimo di operazioni per squadra per giornata */
  minOpsPerTeamPerRound: number;
  /** Volume di trading minimo (in crediti) */
  minTradingVolume: number;
  /** Montepremi atteso a break-even */
  expectedPrizePool: number;
  /** Ricavo piattaforma a break-even (= fixedCosts) */
  platformRevenueAtBreakEven: number;
}

export function calculateBreakEven(
  fixedCosts: number,
  rules: TradingRules,
  numTeams: number,
  avgOperationValue: number,
): BreakEvenResult {
  const avgCommissionRate = (rules.buyCommissionRate + rules.sellCommissionRate) / 2;
  const platformRevenuePerOp = avgOperationValue * avgCommissionRate * rules.platformFeeRate;

  if (platformRevenuePerOp <= 0) throw new Error('platformRevenuePerOp deve essere positivo');

  const minOperations = Math.ceil(fixedCosts / platformRevenuePerOp);
  const minOpsPerTeamPerRound = minOperations / (numTeams * rules.roundsPerSeason);
  const minTradingVolume = minOperations * avgOperationValue;

  const totalCommissionsAtBreakEven = minOperations * avgOperationValue * avgCommissionRate;
  const expectedPrizePool = totalCommissionsAtBreakEven * rules.prizePoolContributionRate;

  return {
    minOperations,
    minOpsPerTeamPerRound,
    minTradingVolume,
    expectedPrizePool,
    platformRevenueAtBreakEven: fixedCosts,
  };
}

export function isAboveBreakEven(
  actualOperations: number,
  fixedCosts: number,
  rules: TradingRules,
  avgOperationValue: number,
): boolean {
  const avgCommissionRate = (rules.buyCommissionRate + rules.sellCommissionRate) / 2;
  const platformRevenue = actualOperations * avgOperationValue * avgCommissionRate * rules.platformFeeRate;
  return platformRevenue >= fixedCosts;
}
