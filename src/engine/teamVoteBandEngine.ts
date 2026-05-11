export type TeamVoteBand = 'FASCIA_0' | 'FASCIA_1' | 'FASCIA_2' | 'FASCIA_3' | 'FASCIA_4';

export interface TeamVoteInput {
  playerId: number;
  vote: number | null;
  played: boolean;
}

export interface TeamVoteBandResult {
  totalVoteSum: number;
  averageVote: number;
  playedCount: number;
  rosterSize: number;
  teamBand: TeamVoteBand;
}

export function getTeamVoteBand(averageVote: number): TeamVoteBand {
  if (averageVote < 5) return 'FASCIA_0';
  if (averageVote < 5.5) return 'FASCIA_1';
  if (averageVote < 6) return 'FASCIA_2';
  if (averageVote < 6.5) return 'FASCIA_3';
  return 'FASCIA_4';
}

export function calculateTeamVoteBand(votes: TeamVoteInput[]): TeamVoteBandResult {
  if (votes.length !== 25) {
    throw new Error(`La rosa deve contenere 25 voti/giocatori (ricevuti: ${votes.length})`);
  }

  const totalVoteSum = votes.reduce((sum, entry) => {
    if (!entry.played || entry.vote === null || !Number.isFinite(entry.vote)) return sum;
    return sum + entry.vote;
  }, 0);
  const playedCount = votes.filter(v => v.played && v.vote !== null && Number.isFinite(v.vote)).length;
  const averageVote = totalVoteSum / votes.length;

  return {
    totalVoteSum,
    averageVote,
    playedCount,
    rosterSize: votes.length,
    teamBand: getTeamVoteBand(averageVote),
  };
}

