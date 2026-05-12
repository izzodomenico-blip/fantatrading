import { TeamBandBonusTableConfig } from '../config/teamBandBonusTables';
import { NoVotePolicyConfig, TeamVoteBand } from './teamVoteBandEngine';
export interface BonusLookupResult {
    teamBand: TeamVoteBand;
    individualVote: number;
    matchedIndividualVote: number | null;
    bonusMalusPct: number;
    usedFallback: boolean;
    outOfRange: boolean;
    handling: 'EXACT' | 'ROUND_TO_NEAREST' | 'CLAMP' | 'MISSING_BAND';
}
export declare function getBonusMalusPct(teamBand: TeamVoteBand, individualVote: number, tableConfig?: TeamBandBonusTableConfig): BonusLookupResult;
export declare function getNoVoteBonusMalusPct(noVotePolicy?: NoVotePolicyConfig): number;
