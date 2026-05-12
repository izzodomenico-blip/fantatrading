"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBonusMalusPct = getBonusMalusPct;
exports.getNoVoteBonusMalusPct = getNoVoteBonusMalusPct;
const teamBandBonusTables_1 = require("../config/teamBandBonusTables");
function getBonusMalusPct(teamBand, individualVote, tableConfig = teamBandBonusTables_1.DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG) {
    const bandRows = tableConfig.entries
        .filter(row => row.teamBand === teamBand)
        .sort((a, b) => a.individualVote - b.individualVote);
    if (bandRows.length === 0) {
        return {
            teamBand,
            individualVote,
            matchedIndividualVote: null,
            bonusMalusPct: 0,
            usedFallback: true,
            outOfRange: false,
            handling: 'MISSING_BAND',
        };
    }
    const exact = bandRows.find(row => row.individualVote === individualVote);
    if (exact) {
        return {
            teamBand,
            individualVote,
            matchedIndividualVote: exact.individualVote,
            bonusMalusPct: exact.bonusMalusPct,
            usedFallback: false,
            outOfRange: false,
            handling: 'EXACT',
        };
    }
    const min = bandRows[0];
    const max = bandRows[bandRows.length - 1];
    const outOfRange = individualVote < min.individualVote || individualVote > max.individualVote;
    const matched = individualVote < min.individualVote
        ? min
        : individualVote > max.individualVote
            ? max
            : bandRows.reduce((best, row) => {
                const bestDistance = Math.abs(individualVote - best.individualVote);
                const rowDistance = Math.abs(individualVote - row.individualVote);
                return rowDistance < bestDistance ? row : best;
            }, bandRows[0]);
    return {
        teamBand,
        individualVote,
        matchedIndividualVote: matched.individualVote,
        bonusMalusPct: matched.bonusMalusPct,
        usedFallback: true,
        outOfRange,
        handling: outOfRange ? 'CLAMP' : 'ROUND_TO_NEAREST',
    };
}
function getNoVoteBonusMalusPct(noVotePolicy = { policy: 'ZERO' }) {
    return noVotePolicy.policy === 'FIXED_MALUS' || noVotePolicy.policy === 'PLAYER_MALUS_TEAM_EXCLUDE'
        ? noVotePolicy.fixedMalusPct ?? -5
        : 0;
}
//# sourceMappingURL=fantaTradingBonusTableEngine.js.map