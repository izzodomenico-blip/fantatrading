"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V1_RULES_SUMMARY = exports.V1_NO_VOTE_POLICY = exports.V1_ROSTER_COMPOSITION = exports.V1_MAX_LOSS_PCT = exports.V1_QUOTE_STEP_PCT = exports.V1_PRIZE_THRESHOLD = exports.V1_SURVIVAL_THRESHOLD = exports.V1_PLATFORM_FEE_RATE = exports.V1_SELL_COMMISSION_RATE = exports.V1_BUY_COMMISSION_RATE = void 0;
exports.V1_BUY_COMMISSION_RATE = 0.02;
exports.V1_SELL_COMMISSION_RATE = 0.02;
exports.V1_PLATFORM_FEE_RATE = 0.10;
exports.V1_SURVIVAL_THRESHOLD = 0;
exports.V1_PRIZE_THRESHOLD = 7;
exports.V1_QUOTE_STEP_PCT = 5;
exports.V1_MAX_LOSS_PCT = -100;
exports.V1_ROSTER_COMPOSITION = {
    GK: 3,
    DEF: 8,
    MID: 8,
    FWD: 6,
    total: 25,
};
exports.V1_NO_VOTE_POLICY = {
    policy: 'PLAYER_ZERO_TEAM_EXCLUDE',
};
exports.V1_RULES_SUMMARY = {
    buyCommissionRate: exports.V1_BUY_COMMISSION_RATE,
    sellCommissionRate: exports.V1_SELL_COMMISSION_RATE,
    platformFeeRate: exports.V1_PLATFORM_FEE_RATE,
    survivalThreshold: exports.V1_SURVIVAL_THRESHOLD,
    prizeThreshold: exports.V1_PRIZE_THRESHOLD,
    quoteStepPctPerPoint: exports.V1_QUOTE_STEP_PCT,
    maxLossPct: exports.V1_MAX_LOSS_PCT,
    rosterComposition: exports.V1_ROSTER_COMPOSITION,
    noVotePolicy: exports.V1_NO_VOTE_POLICY.policy,
};
//# sourceMappingURL=v1Rules.js.map