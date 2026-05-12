import type { NoVotePolicyConfig } from '../../engine/teamVoteBandEngine';
export declare const V1_BUY_COMMISSION_RATE = 0.02;
export declare const V1_SELL_COMMISSION_RATE = 0.02;
export declare const V1_PLATFORM_FEE_RATE = 0.1;
export declare const V1_SURVIVAL_THRESHOLD = 0;
export declare const V1_PRIZE_THRESHOLD = 7;
export declare const V1_QUOTE_STEP_PCT = 5;
export declare const V1_MAX_LOSS_PCT = -100;
export declare const V1_ROSTER_COMPOSITION: {
    readonly GK: 3;
    readonly DEF: 8;
    readonly MID: 8;
    readonly FWD: 6;
    readonly total: 25;
};
export declare const V1_NO_VOTE_POLICY: NoVotePolicyConfig;
export declare const V1_RULES_SUMMARY: {
    readonly buyCommissionRate: 0.02;
    readonly sellCommissionRate: 0.02;
    readonly platformFeeRate: 0.1;
    readonly survivalThreshold: 0;
    readonly prizeThreshold: 7;
    readonly quoteStepPctPerPoint: 5;
    readonly maxLossPct: -100;
    readonly rosterComposition: {
        readonly GK: 3;
        readonly DEF: 8;
        readonly MID: 8;
        readonly FWD: 6;
        readonly total: 25;
    };
    readonly noVotePolicy: import("../../engine/teamVoteBandEngine").NoVotePolicy;
};
