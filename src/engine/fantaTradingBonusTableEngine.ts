import { DEFAULT_TEAM_BAND_BONUS_TABLE, TeamBandBonusTableEntry } from '../config/teamBandBonusTables';
import { TeamVoteBand } from './teamVoteBandEngine';

export interface BonusLookupResult {
  teamBand: TeamVoteBand;
  individualVote: number;
  matchedIndividualVote: number | null;
  bonusMalusPct: number;
  usedFallback: boolean;
}

export function getBonusMalusPct(
  teamBand: TeamVoteBand,
  individualVote: number,
  table: TeamBandBonusTableEntry[] = DEFAULT_TEAM_BAND_BONUS_TABLE,
): BonusLookupResult {
  const bandRows = table
    .filter(row => row.teamBand === teamBand)
    .sort((a, b) => a.individualVote - b.individualVote);

  if (bandRows.length === 0) {
    return { teamBand, individualVote, matchedIndividualVote: null, bonusMalusPct: 0, usedFallback: true };
  }

  const exact = bandRows.find(row => row.individualVote === individualVote);
  if (exact) {
    return { teamBand, individualVote, matchedIndividualVote: exact.individualVote, bonusMalusPct: exact.bonusMalusPct, usedFallback: false };
  }

  const lowerOrEqual = [...bandRows].reverse().find(row => individualVote >= row.individualVote);
  const matched = lowerOrEqual ?? bandRows[0];
  return {
    teamBand,
    individualVote,
    matchedIndividualVote: matched.individualVote,
    bonusMalusPct: matched.bonusMalusPct,
    usedFallback: true,
  };
}
