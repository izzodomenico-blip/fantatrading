import type { DemoPosition } from '../mock/favcDemoData';

export type TeamTrendPoint = {
  round: number;
  portfolioValue: number;
  totalValue: number;
  roiPct: number;
};

export function buildTeamTrendFromPositions(
  positions: Array<Pick<DemoPosition, 'status' | 'trend'>>,
  options: {
    virtualCashBalance?: number;
    totalCapitalDeposited?: number;
    includeCash?: boolean;
    lastRounds?: number;
  } = {},
): TeamTrendPoint[] {
  const activePositions = positions.filter(position => position.status === 'ACTIVE');
  const rounds = Array.from(
    new Set(activePositions.flatMap(position => position.trend?.map(point => point.round) ?? [])),
  ).sort((a, b) => a - b);

  const selectedRounds = options.lastRounds ? rounds.slice(-options.lastRounds) : rounds;
  const cash = options.virtualCashBalance ?? 0;
  const capital = options.totalCapitalDeposited ?? 0;

  return selectedRounds.map(round => {
    const portfolioValue = activePositions.reduce((sum, position) => {
      const trend = position.trend ?? [];
      const currentPoint = trend.find(point => point.round === round)
        ?? trend.filter(point => point.round <= round).at(-1)
        ?? trend[0];
      return sum + (currentPoint?.estimatedValue ?? 0);
    }, 0);
    const totalValue = portfolioValue + (options.includeCash === false ? 0 : cash);
    const roiPct = capital > 0 ? ((totalValue - capital) / capital) * 100 : 0;

    return {
      round,
      portfolioValue: Number(portfolioValue.toFixed(2)),
      totalValue: Number(totalValue.toFixed(2)),
      roiPct: Number(roiPct.toFixed(2)),
    };
  });
}
