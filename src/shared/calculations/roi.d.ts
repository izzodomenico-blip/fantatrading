export declare function calculateROI(portfolioValue: number, availableBudget: number, initialBudget: number): number;
export declare function calculatePrizeEligibility(roi: number, prizeThreshold: number): boolean;
export declare function calculateNetLiquidationValue(portfolioValue: number, sellCommissionRate: number): number;
export declare function calculateVariableCapitalROI(netLiquidationValue: number, virtualCashBalance: number, totalCapitalDeposited: number): number;
