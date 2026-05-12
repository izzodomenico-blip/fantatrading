import { Portfolio, getPortfolioValue } from '../domain/Portfolio';
import { Team } from '../domain/Team';
import { MarketOperation } from '../domain/MarketOperation';

export interface ROIResult {
  teamId: string;
  initialBudget: number;
  totalCapitalDeposited: number;
  currentBudget: number;
  virtualCashBalance: number;
  portfolioValue: number;
  netLiquidationValue: number;
  totalWealth: number;
  totalCommissionsPaid: number;
  realizedGains: number;
  unrealizedGains: number;
  /** ROI netto: guadagni al netto delle commissioni / budget iniziale */
  netROIPercent: number;
  /** ROI lordo: guadagni prima delle commissioni / budget iniziale */
  grossROIPercent: number;
  /** Perdita da commissioni sul totale investito */
  commissionDragPercent: number;
}

export function calculateVariableCapitalROI(
  netLiquidationValue: number,
  virtualCashBalance: number,
  totalCapitalDeposited: number,
): number {
  if (totalCapitalDeposited <= 0) return 0;
  return ((netLiquidationValue + virtualCashBalance - totalCapitalDeposited) / totalCapitalDeposited) * 100;
}

export function calculateRealizedGains(operations: MarketOperation[]): number {
  let proceeds = 0;
  let costs = 0;

  for (const op of operations) {
    if (op.type === 'SELL') proceeds += op.grossAmount;
    if (op.type === 'BUY') costs += op.grossAmount;
  }

  return proceeds - costs;
}

export function calculateROI(
  team: Team,
  portfolio: Portfolio,
  initialBudget: number,
  operations: MarketOperation[],
): ROIResult {
  const portfolioValue = getPortfolioValue(portfolio);
  const virtualCashBalance = team.virtualCashBalance ?? team.budget;
  const totalCapitalDeposited = team.totalCapitalDeposited ?? initialBudget;
  const netLiquidationValue = team.netLiquidationValue || portfolioValue;
  const totalWealth = virtualCashBalance + portfolioValue;
  const realizedGains = calculateRealizedGains(operations);
  const unrealizedGains = portfolioValue;

  const base = initialBudget > 0 ? initialBudget : 1;

  const grossGains = totalWealth - initialBudget;
  const netGains = grossGains;

  return {
    teamId: team.id,
    initialBudget,
    totalCapitalDeposited,
    currentBudget: virtualCashBalance,
    virtualCashBalance,
    portfolioValue,
    netLiquidationValue,
    totalWealth,
    totalCommissionsPaid: team.totalCommissionsPaid,
    realizedGains,
    unrealizedGains,
    netROIPercent: (netGains / base) * 100,
    grossROIPercent: ((netGains + team.totalCommissionsPaid) / base) * 100,
    commissionDragPercent: (team.totalCommissionsPaid / base) * 100,
  };
}

export function compareROIs(results: ROIResult[]): {
  best: ROIResult;
  worst: ROIResult;
  average: number;
  median: number;
} {
  if (results.length === 0) throw new Error('Nessun risultato ROI fornito');

  const sorted = [...results].sort((a, b) => a.netROIPercent - b.netROIPercent);
  const avg = results.reduce((s, r) => s + r.netROIPercent, 0) / results.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1].netROIPercent + sorted[mid].netROIPercent) / 2
    : sorted[mid].netROIPercent;

  return { best: sorted[sorted.length - 1], worst: sorted[0], average: avg, median };
}
