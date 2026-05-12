export declare function calculateBuyCommission(grossValue: number, rate: number): number;
export declare function calculateSellCommission(grossValue: number, rate: number): number;
export interface BuyCostResult {
    grossValue: number;
    commission: number;
    totalCost: number;
}
export declare function calculateBuyCost(grossValue: number, rate: number): BuyCostResult;
export interface SellProceedsResult {
    grossValue: number;
    commission: number;
    netProceeds: number;
}
export declare function calculateSellProceeds(grossValue: number, rate: number): SellProceedsResult;
export declare function calculatePlatformFee(totalCommissions: number, feeRate: number): number;
