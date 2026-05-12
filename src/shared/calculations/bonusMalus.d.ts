import { getBonusMalusPct, getNoVoteBonusMalusPct } from '../../engine/fantaTradingBonusTableEngine';
import type { TeamVoteBand, NoVotePolicyConfig } from '../../engine/teamVoteBandEngine';
import type { TeamBandBonusTableConfig } from '../../config/teamBandBonusTables';
export { getBonusMalusPct, getNoVoteBonusMalusPct };
export type { BonusLookupResult } from '../../engine/fantaTradingBonusTableEngine';
export declare function calculateFantasyBonusMalus(teamBand: TeamVoteBand, individualVote: number | null, noVotePolicy?: NoVotePolicyConfig, tableConfig?: TeamBandBonusTableConfig): number;
export declare function applyBonusToMultiplier(fantasyMultiplier: number, bonusPct: number): number;
