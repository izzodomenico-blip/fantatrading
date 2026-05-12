"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRosterComposition = validateRosterComposition;
exports.isRosterComplete = isRosterComplete;
const v1Rules_1 = require("../rules/v1Rules");
function validateRosterComposition(actual, required = v1Rules_1.V1_ROSTER_COMPOSITION) {
    const errors = [];
    const roles = ['GK', 'DEF', 'MID', 'FWD'];
    for (const role of roles) {
        if (actual[role] !== required[role]) {
            errors.push(`${role}: richiesti ${required[role]}, trovati ${actual[role]}`);
        }
    }
    return errors;
}
function isRosterComplete(actual, required = v1Rules_1.V1_ROSTER_COMPOSITION) {
    return validateRosterComposition(actual, required).length === 0;
}
//# sourceMappingURL=roster.js.map