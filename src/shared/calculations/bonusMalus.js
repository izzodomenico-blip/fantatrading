"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNoVoteBonusMalusPct = exports.getBonusMalusPct = void 0;
exports.calculateFantasyBonusMalus = calculateFantasyBonusMalus;
exports.applyBonusToMultiplier = applyBonusToMultiplier;
const fantaTradingBonusTableEngine_1 = require("../../engine/fantaTradingBonusTableEngine");
Object.defineProperty(exports, "getBonusMalusPct", { enumerable: true, get: function () { return fantaTradingBonusTableEngine_1.getBonusMalusPct; } });
Object.defineProperty(exports, "getNoVoteBonusMalusPct", { enumerable: true, get: function () { return fantaTradingBonusTableEngine_1.getNoVoteBonusMalusPct; } });
const teamBandBonusTables_1 = require("../../config/teamBandBonusTables");
function calculateFantasyBonusMalus(teamBand, individualVote, noVotePolicy = { policy: 'PLAYER_ZERO_TEAM_EXCLUDE' }, tableConfig = teamBandBonusTables_1.DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG) {
    if (individualVote === null) {
        return (0, fantaTradingBonusTableEngine_1.getNoVoteBonusMalusPct)(noVotePolicy);
    }
    return (0, fantaTradingBonusTableEngine_1.getBonusMalusPct)(teamBand, individualVote, tableConfig).bonusMalusPct;
}
function applyBonusToMultiplier(fantasyMultiplier, bonusPct) {
    return fantasyMultiplier * (1 + bonusPct / 100);
}
//# sourceMappingURL=bonusMalus.js.map