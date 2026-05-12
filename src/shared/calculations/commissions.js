"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBuyCommission = calculateBuyCommission;
exports.calculateSellCommission = calculateSellCommission;
exports.calculateBuyCost = calculateBuyCost;
exports.calculateSellProceeds = calculateSellProceeds;
exports.calculatePlatformFee = calculatePlatformFee;
function calculateBuyCommission(grossValue, rate) {
    return grossValue * rate;
}
function calculateSellCommission(grossValue, rate) {
    return grossValue * rate;
}
function calculateBuyCost(grossValue, rate) {
    const commission = calculateBuyCommission(grossValue, rate);
    return { grossValue, commission, totalCost: grossValue + commission };
}
function calculateSellProceeds(grossValue, rate) {
    const commission = calculateSellCommission(grossValue, rate);
    return { grossValue, commission, netProceeds: grossValue - commission };
}
function calculatePlatformFee(totalCommissions, feeRate) {
    return totalCommissions * feeRate;
}
//# sourceMappingURL=commissions.js.map