import { DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG, TeamBandBonusTableConfig, TeamBandBonusTableEntry } from '../config/teamBandBonusTables';
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

export function getBonusMalusPct(
  teamBand: TeamVoteBand,
  individualVote: number,
  tableConfig: TeamBandBonusTableConfig = DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG,
): BonusLookupResult {
  const bandRows = tableConfig.entries
    .filter(row => row.teamBand === teamBand)
    .sort((a, b) => a.individualVote - b.individualVote);

  if (bandRows.length === 0) {
    return {
      teamBand,
      individualVote,
      matchedIndividualVote: null,
      bonusMalusPct: 0,
      usedFallback: true,
      outOfRange: false,
      handling: 'MISSING_BAND',
    };
  }

  const exact = bandRows.find(row => row.individualVote === individualVote);
  if (exact) {
    return {
      teamBand,
      individualVote,
      matchedIndividualVote: exact.individualVote,
      bonusMalusPct: exact.bonusMalusPct,
      usedFallback: false,
      outOfRange: false,
      handling: 'EXACT',
    };
  }

  const min = bandRows[0];
  const max = bandRows[bandRows.length - 1];
  const outOfRange = individualVote < min.individualVote || individualVote > max.individualVote;
  const matched = individualVote < min.individualVote
    ? min
    : individualVote > max.individualVote
      ? max
      : bandRows.reduce((best, row) => {
        const bestDistance = Math.abs(individualVote - best.individualVote);
        const rowDistance = Math.abs(individualVote - row.individualVote);
        return rowDistance < bestDistance ? row : best;
      }, bandRows[0]);

  return {
    teamBand,
    individualVote,
    matchedIndividualVote: matched.individualVote,
    bonusMalusPct: matched.bonusMalusPct,
    usedFallback: true,
    outOfRange,
    handling: outOfRange ? 'CLAMP' : 'ROUND_TO_NEAREST',
  };
}

export function getNoVoteBonusMalusPct(noVotePolicy: NoVotePolicyConfig = { policy: 'ZERO' }): number {
  return noVotePolicy.policy === 'FIXED_MALUS' ? noVotePolicy.fixedMalusPct ?? -5 : 0;
}
