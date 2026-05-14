export type TeamBand = 'FASCIA_0' | 'FASCIA_1' | 'FASCIA_2' | 'FASCIA_3' | 'FASCIA_4';

const INDIVIDUAL_VOTES = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

const OFFICIAL_BONUS_BY_BAND: Record<Exclude<TeamBand, 'FASCIA_0'>, Record<number, number>> = {
  FASCIA_1: {
    3: -1.75, 3.5: -1.50, 4: -1.25, 4.5: -1.00, 5: -0.75, 5.5: -0.50,
    6: 0.00, 6.5: 0.50, 7: 0.75, 7.5: 1.00, 8: 1.25, 8.5: 1.50, 9: 1.75,
  },
  FASCIA_2: {
    3: -2.63, 3.5: -2.25, 4: -1.88, 4.5: -1.50, 5: -1.13, 5.5: -0.75,
    6: 0.00, 6.5: 0.75, 7: 1.13, 7.5: 1.50, 8: 1.88, 8.5: 2.25, 9: 2.63,
  },
  FASCIA_3: {
    3: -3.50, 3.5: -3.00, 4: -2.50, 4.5: -2.00, 5: -1.50, 5.5: -1.00,
    6: 0.00, 6.5: 1.00, 7: 1.50, 7.5: 2.00, 8: 2.50, 8.5: 3.00, 9: 3.50,
  },
  FASCIA_4: {
    3: -4.38, 3.5: -3.75, 4: -3.13, 4.5: -2.50, 5: -1.88, 5.5: -1.25,
    6: 0.00, 6.5: 1.25, 7: 1.88, 7.5: 2.50, 8: 3.13, 8.5: 3.75, 9: 4.38,
  },
};

export function calculateTeamBandLabel(teamVoteAverage: number | null): TeamBand {
  if (teamVoteAverage === null || teamVoteAverage < 5) return 'FASCIA_0';
  if (teamVoteAverage < 5.5) return 'FASCIA_1';
  if (teamVoteAverage < 6) return 'FASCIA_2';
  if (teamVoteAverage < 6.5) return 'FASCIA_3';
  return 'FASCIA_4';
}

export function getOfficialBonusMalusPct(teamBand: TeamBand, individualVote: number | null, isSv = false) {
  if (isSv || individualVote === null) return 0;
  if (teamBand === 'FASCIA_0') return -2.5;
  const closestVote = INDIVIDUAL_VOTES.reduce((best, vote) =>
    Math.abs(vote - individualVote) < Math.abs(best - individualVote) ? vote : best,
  INDIVIDUAL_VOTES[0]);
  return OFFICIAL_BONUS_BY_BAND[teamBand][closestVote] ?? 0;
}
