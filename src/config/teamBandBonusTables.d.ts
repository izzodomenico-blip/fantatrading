import type { TeamVoteBand } from '../engine/teamVoteBandEngine';
export interface TeamBandRangeConfig {
    teamBand: TeamVoteBand;
    minTeamVoteSum: number;
    maxTeamVoteSum: number;
    minAverage: number;
    maxAverage: number;
}
export interface TeamBandBonusTableEntry extends TeamBandRangeConfig {
    individualVote: number;
    bonusMalusPct: number;
}
export interface TeamBandBonusTableConfig {
    id: string;
    description: string;
    source: string;
    isOfficial: boolean;
    assumptions: string[];
    rosterSize: number;
    bands: Record<TeamVoteBand, TeamBandRangeConfig>;
    entries: TeamBandBonusTableEntry[];
}
export declare const INDIVIDUAL_VOTES: number[];
export declare const TEAM_BAND_RANGES: Record<TeamVoteBand, TeamBandRangeConfig>;
export declare const DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG: TeamBandBonusTableConfig;
export declare const DEFAULT_TEAM_BAND_BONUS_TABLE: TeamBandBonusTableEntry[];
