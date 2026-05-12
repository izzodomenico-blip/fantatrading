"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateQuoteStepReturn = calculateQuoteStepReturn;
exports.calculatePositionValue = calculatePositionValue;
function calculateQuoteStepReturn(qtI, qtA) {
    return (qtA - qtI) * 5;
}
function calculatePositionValue(initialQuote, currentQuote, fantasyMultiplier) {
    const tradingReturnPct = calculateQuoteStepReturn(initialQuote, currentQuote);
    return Math.max(0, initialQuote * fantasyMultiplier * (1 + tradingReturnPct / 100));
}
//# sourceMappingURL=positionValue.js.map