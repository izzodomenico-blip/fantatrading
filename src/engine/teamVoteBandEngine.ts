export type TeamVoteBand = 'FASCIA_0' | 'FASCIA_1' | 'FASCIA_2' | 'FASCIA_3' | 'FASCIA_4';
export type NoVotePolicy = 'ZERO' | 'FIVE' | 'EXCLUDE' | 'FIXED_MALUS';

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

export function getTeamVoteBand(averageVote: number): TeamVoteBand {
  if (averageVote < 5) return 'FASCIA_0';
  if (averageVote < 5.5) return 'FASCIA_1';
  if (averageVote < 6) return 'FASCIA_2';
  if (averageVote < 6.5) return 'FASCIA_3';
  return 'FASCIA_4';
}

export function calculateTeamVoteBand(
  votes: TeamVoteInput[],
  noVotePolicy: NoVotePolicyConfig = { policy: 'ZERO' },
): TeamVoteBandResult {
  if (votes.length !== 25) {
    throw new Error(`La rosa deve contenere 25 voti/giocatori (ricevuti: ${votes.length})`);
  }

  const playedCount = votes.filter(v => v.played && v.vote !== null && Number.isFinite(v.vote)).length;
  const notEvaluatedCount = votes.length - playedCount;
  let evaluatedCount = votes.length;
  let totalVoteSum = 0;

  for (const entry of votes) {
    const hasVote = entry.played && entry.vote !== null && Number.isFinite(entry.vote);
    if (hasVote) {
      totalVoteSum += entry.vote as number;
    } else if (noVotePolicy.policy === 'FIVE') {
      totalVoteSum += 5;
    } else if (noVotePolicy.policy === 'EXCLUDE') {
      evaluatedCount--;
    }
  }

  const averageVote = evaluatedCount > 0 ? totalVoteSum / evaluatedCount : 0;

  return {
    totalVoteSum,
    averageVote,
    playedCount,
    evaluatedCount,
    notEvaluatedCount,
    rosterSize: votes.length,
    teamBand: getTeamVoteBand(averageVote),
    noVotePolicy: noVotePolicy.policy,
    fixedNoVoteMalusPct: noVotePolicy.policy === 'FIXED_MALUS' ? noVotePolicy.fixedMalusPct ?? -5 : 0,
  };
}
