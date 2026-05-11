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

export const INDIVIDUAL_VOTES = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

export const TEAM_BAND_RANGES: Record<TeamVoteBand, TeamBandRangeConfig> = {
  FASCIA_0: { teamBand: 'FASCIA_0', minAverage: -Infinity, maxAverage: 5, minTeamVoteSum: -Infinity, maxTeamVoteSum: 124.99 },
  FASCIA_1: { teamBand: 'FASCIA_1', minAverage: 5, maxAverage: 5.5, minTeamVoteSum: 125, maxTeamVoteSum: 137.49 },
  FASCIA_2: { teamBand: 'FASCIA_2', minAverage: 5.5, maxAverage: 6, minTeamVoteSum: 137.5, maxTeamVoteSum: 149.99 },
  FASCIA_3: { teamBand: 'FASCIA_3', minAverage: 6, maxAverage: 6.5, minTeamVoteSum: 150, maxTeamVoteSum: 162.49 },
  FASCIA_4: { teamBand: 'FASCIA_4', minAverage: 6.5, maxAverage: Infinity, minTeamVoteSum: 162.5, maxTeamVoteSum: Infinity },
};

const BAND_MULTIPLIER: Record<TeamVoteBand, number> = {
  FASCIA_0: 6,
  FASCIA_1: 5,
  FASCIA_2: 4,
  FASCIA_3: 4,
  FASCIA_4: 5,
};

function interpretedBonusMalusPct(teamBand: TeamVoteBand, individualVote: number): number {
  if (individualVote === 6) return 0;
  return (individualVote - 6) * BAND_MULTIPLIER[teamBand];
}

function buildEntries(): TeamBandBonusTableEntry[] {
  return (Object.keys(TEAM_BAND_RANGES) as TeamVoteBand[]).flatMap(teamBand => {
    const band = TEAM_BAND_RANGES[teamBand];
    return INDIVIDUAL_VOTES.map(individualVote => ({
      ...band,
      individualVote,
      bonusMalusPct: interpretedBonusMalusPct(teamBand, individualVote),
    }));
  });
}

export const DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG: TeamBandBonusTableConfig = {
  id: 'FANTATRADING_INTERPRETED_ORIGINAL_V1',
  description: 'Tabella bonus/malus strutturale per fascia squadra e voto individuale.',
  source: 'docs/regolamento_originale.md non contiene valori numerici; tabella interpretata per rendere configurabile e testabile il motore.',
  isOfficial: false,
  assumptions: [
    'Il voto 6 e neutro in tutte le fasce.',
    'I voti sotto 6 generano malus percentuale, i voti sopra 6 generano bonus percentuale.',
    'Le fasce peggiori amplificano il malus; la fascia migliore amplifica il bonus/malus tramite moltiplicatore dedicato.',
    'La tabella deve essere sostituita con valori ufficiali appena disponibili.',
  ],
  rosterSize: 25,
  bands: TEAM_BAND_RANGES,
  entries: buildEntries(),
};

export const DEFAULT_TEAM_BAND_BONUS_TABLE = DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG.entries;
