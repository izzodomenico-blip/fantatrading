export type TeamVoteBand = 'FASCIA_0' | 'FASCIA_1' | 'FASCIA_2' | 'FASCIA_3' | 'FASCIA_4';
export type NoVotePolicy = 'ZERO' | 'FIVE' | 'EXCLUDE' | 'FIXED_MALUS' | 'PLAYER_ZERO_TEAM_EXCLUDE' | 'PLAYER_MALUS_TEAM_EXCLUDE';
export interface TeamVoteInput {
    playerId: number;
    vote: number | null;
    played: boolean;
}
export interface NoVotePolicyConfig {
    policy: NoVotePolicy;
    fixedMalusPct?: number;
}
export interface TeamVoteBandResult {
    totalVoteSum: number;
    averageVote: number;
    playedCount: number;
    evaluatedCount: number;
    notEvaluatedCount: number;
    rosterSize: number;
    teamBand: TeamVoteBand;
    noVotePolicy: NoVotePolicy;
    fixedNoVoteMalusPct: number;
}
export declare function getTeamVoteBand(averageVote: number): TeamVoteBand;
export declare function calculateTeamVoteBand(votes: TeamVoteInput[], noVotePolicy?: NoVotePolicyConfig): TeamVoteBandResult;
