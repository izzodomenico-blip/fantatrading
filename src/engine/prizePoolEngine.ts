import { TradingRules } from '../config/defaultRules';
import { PrizeDistribution } from '../config/prizeTables';

export interface CommissionSplit {
  toPrizePool: number;
  toPlatform: number;
}

/** Divide una singola commissione tra montepremi e piattaforma */
export function splitCommission(
  commissionAmount: number,
  rules: TradingRules,
): CommissionSplit {
  return {
    toPrizePool: commissionAmount * rules.prizePoolContributionRate,
    toPlatform: commissionAmount * rules.platformFeeRate,
  };
}

export interface PrizePoolSummary {
  totalCommissions: number;
  totalPrizePool: number;
  totalPlatformRevenue: number;
}

/** Aggrega una lista di commissioni nel riepilogo del montepremi */
export function aggregateCommissions(
  commissions: number[],
  rules: TradingRules,
): PrizePoolSummary {
  const totalCommissions = commissions.reduce((s, c) => s + c, 0);
  return {
    totalCommissions,
    totalPrizePool: totalCommissions * rules.prizePoolContributionRate,
    totalPlatformRevenue: totalCommissions * rules.platformFeeRate,
  };
}

export interface PrizeAward {
  rank: number;
  label: string;
  amount: number;
}

/** Calcola l'importo assegnato a ogni posizione in classifica */
export function calculatePrizeDistribution(
  prizePoolTotal: number,
  prizeTable: PrizeDistribution[],
): PrizeAward[] {
  return prizeTable.map(entry => ({
    rank: entry.rank,
    label: entry.label,
    amount: prizePoolTotal * entry.percentageOfPool,
  }));
}

/** Montepremi minimo affinché il 1° premio superi la quota di iscrizione */
export function minPrizePoolForPositiveROI(
  registrationFeePerTeam: number,
  numTeams: number,
  firstPlacePercentage: number,
): number {
  return registrationFeePerTeam / firstPlacePercentage;
}

/** Volume minimo di operazioni affinché il montepremi raggiunga un target */
export function minOperationsForTargetPool(
  targetPrizePool: number,
  avgOperationValue: number,
  avgCommissionRate: number,
  prizePoolContributionRate: number,
): number {
  const prizePerOp = avgOperationValue * avgCommissionRate * prizePoolContributionRate;
  if (prizePerOp <= 0) throw new Error('prizePerOp deve essere positivo');
  return Math.ceil(targetPrizePool / prizePerOp);
}
