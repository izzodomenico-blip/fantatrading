"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePortfolioValue = calculatePortfolioValue;
function calculatePortfolioValue(positionValues, availableBudget) {
    return positionValues.reduce((sum, v) => sum + v, 0) + availableBudget;
}
//# sourceMappingURL=portfolio.js.map