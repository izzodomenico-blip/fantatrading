"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateROI = calculateROI;
exports.calculateNetLiquidationValue = calculateNetLiquidationValue;
exports.calculateVariableCapitalROI = calculateVariableCapitalROI;
exports.calculatePrizeEligibility = calculatePrizeEligibility;
function calculateROI(portfolioValue, availableBudget, initialBudget) {
    if (initialBudget <= 0)
        return 0;
    const totalWealth = portfolioValue + availableBudget;
    return ((totalWealth - initialBudget) / initialBudget) * 100;
}
function calculateNetLiquidationValue(portfolioValue, sellCommissionRate) {
    return portfolioValue * (1 - sellCommissionRate);
}
function calculateVariableCapitalROI(netLiquidationValue, virtualCashBalance, totalCapitalDeposited) {
    if (totalCapitalDeposited <= 0)
        return 0;
    const totalFinalValue = netLiquidationValue + virtualCashBalance;
    return ((totalFinalValue - totalCapitalDeposited) / totalCapitalDeposited) * 100;
}
function calculatePrizeEligibility(roi, prizeThreshold) {
    return roi >= prizeThreshold;
}
//# sourceMappingURL=roi.js.map
