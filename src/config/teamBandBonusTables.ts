import type { TeamVoteBand } from '../engine/teamVoteBandEngine';

export interface TeamBandBonusTableEntry {
  teamBand: TeamVoteBand;
  minTeamVoteSum: number;
  maxTeamVoteSum: number;
  individualVote: number;
  bonusMalusPct: number;
}

export const TEAM_BAND_RANGES: Record<TeamVoteBand, { minAverage: number; maxAverage: number; minTeamVoteSum: number; maxTeamVoteSum: number }> = {
  FASCIA_0: { minAverage: -Infinity, maxAverage: 5, minTeamVoteSum: -Infinity, maxTeamVoteSum: 124.99 },
  FASCIA_1: { minAverage: 5, maxAverage: 5.5, minTeamVoteSum: 125, maxTeamVoteSum: 137.49 },
  FASCIA_2: { minAverage: 5.5, maxAverage: 6, minTeamVoteSum: 137.5, maxTeamVoteSum: 149.99 },
  FASCIA_3: { minAverage: 6, maxAverage: 6.5, minTeamVoteSum: 150, maxTeamVoteSum: 162.49 },
  FASCIA_4: { minAverage: 6.5, maxAverage: Infinity, minTeamVoteSum: 162.5, maxTeamVoteSum: Infinity },
};

const VOTES = [0, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

const BAND_ADJUSTMENT: Record<TeamVoteBand, number> = {
  FASCIA_0: -4,
  FASCIA_1: -2,
  FASCIA_2: -1,
  FASCIA_3: 0,
  FASCIA_4: 2,
};

function baseBonusForVote(vote: number): number {
  if (vote <= 0) return -10;
  if (vote < 5) return -6;
  if (vote < 5.5) return -4;
  if (vote < 6) return -2;
  if (vote < 6.5) return 0;
  if (vote < 7) return 2;
  if (vote < 7.5) return 4;
  if (vote < 8) return 6;
  if (vote < 8.5) return 8;
  if (vote < 9) return 10;
  if (vote < 9.5) return 12;
  return 15;
}

/**
 * Tabella provvisoria per sviluppo strutturale.
 *
 * Il repository non contiene ancora la tabella numerica originale del regolamento
 * "fascia squadra + voto individuale". Questa default table serve solo a rendere
 * testabile il motore e deve essere sostituita con la tabella ufficiale prima di
 * usare il backtest completo per decisioni economiche.
 */
export const DEFAULT_TEAM_BAND_BONUS_TABLE: TeamBandBonusTableEntry[] = (Object.keys(TEAM_BAND_RANGES) as TeamVoteBand[])
  .flatMap(teamBand => VOTES.map(individualVote => ({
    teamBand,
    minTeamVoteSum: TEAM_BAND_RANGES[teamBand].minTeamVoteSum,
    maxTeamVoteSum: TEAM_BAND_RANGES[teamBand].maxTeamVoteSum,
    individualVote,
    bonusMalusPct: baseBonusForVote(individualVote) + BAND_ADJUSTMENT[teamBand],
  })));
