import { BUY_COMMISSION_RATE, SELL_COMMISSION_RATE, calculatePositionValue, type DemoMarketPlayer, type DemoPosition } from '../mock/favcDemoData';

export type TradeSimulationResult = {
  sellGrossValue: number;
  sellFee: number;
  sellNetProceeds: number;
  buyGrossCost: number;
  buyFee: number;
  buyTotalCost: number;
  cashBefore: number;
  cashAfterSale: number;
  capitalAdded: number;
  cashAfterBuy: number;
  totalCapitalDepositedAfter: number;
  estimatedPortfolioValueAfter: number;
  estimatedFinalValueAfter: number;
  estimatedRoiPctAfter: number;
};

export function simulateTradeChange(
  sellPosition: DemoPosition,
  buyPlayer: DemoMarketPlayer,
  context: {
    virtualCashBalance: number;
    totalCapitalDeposited: number;
    currentPortfolioValue: number;
  },
): TradeSimulationResult {
  const sellGrossValue = calculatePositionValue(sellPosition);
  const sellFee = sellGrossValue * SELL_COMMISSION_RATE;
  const sellNetProceeds = sellGrossValue - sellFee;
  const buyGrossCost = buyPlayer.quote;
  const buyFee = buyGrossCost * BUY_COMMISSION_RATE;
  const buyTotalCost = buyGrossCost + buyFee;
  const cashAfterSale = context.virtualCashBalance + sellNetProceeds;
  const capitalAdded = Math.max(0, buyTotalCost - cashAfterSale);
  const cashAfterBuy = cashAfterSale + capitalAdded - buyTotalCost;
  const totalCapitalDepositedAfter = context.totalCapitalDeposited + capitalAdded;
  const estimatedPortfolioValueAfter = Math.max(0, context.currentPortfolioValue - sellGrossValue + buyGrossCost);
  const estimatedFinalValueAfter = estimatedPortfolioValueAfter * (1 - SELL_COMMISSION_RATE) + cashAfterBuy;
  const estimatedRoiPctAfter = totalCapitalDepositedAfter > 0
    ? ((estimatedFinalValueAfter - totalCapitalDepositedAfter) / totalCapitalDepositedAfter) * 100
    : 0;

  return {
    sellGrossValue,
    sellFee,
    sellNetProceeds,
    buyGrossCost,
    buyFee,
    buyTotalCost,
    cashBefore: context.virtualCashBalance,
    cashAfterSale,
    capitalAdded,
    cashAfterBuy,
    totalCapitalDepositedAfter,
    estimatedPortfolioValueAfter,
    estimatedFinalValueAfter,
    estimatedRoiPctAfter,
  };
}
