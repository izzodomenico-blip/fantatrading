"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateROI = calculateROI;
exports.calculatePrizeEligibility = calculatePrizeEligibility;
function calculateROI(portfolioValue, availableBudget, initialBudget) {
    if (initialBudget <= 0)
        return 0;
    const totalWealth = portfolioValue + availableBudget;
    return ((totalWealth - initialBudget) / initialBudget) * 100;
}
function calculatePrizeEligibility(roi, prizeThreshold) {
    return roi >= prizeThreshold;
}
//# sourceMappingURL=roi.js.map