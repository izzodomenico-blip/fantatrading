"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundTo6 = exports.roundTo4 = exports.roundTo2 = void 0;
exports.roundTo = roundTo;
function roundTo(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
const roundTo2 = (v) => roundTo(v, 2);
exports.roundTo2 = roundTo2;
const roundTo4 = (v) => roundTo(v, 4);
exports.roundTo4 = roundTo4;
const roundTo6 = (v) => roundTo(v, 6);
exports.roundTo6 = roundTo6;
//# sourceMappingURL=precision.js.map