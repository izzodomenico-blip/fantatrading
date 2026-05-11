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
  FASCIA_0: { teamBand: 'FASCIA_0', minAverage: -Infinity, maxAverage: 5, minTeamVoteSum: -Infinity, maxTeamVoteSum: 124.999 },
  FASCIA_1: { teamBand: 'FASCIA_1', minAverage: 5, maxAverage: 5.5, minTeamVoteSum: 125, maxTeamVoteSum: 137.499 },
  FASCIA_2: { teamBand: 'FASCIA_2', minAverage: 5.5, maxAverage: 6, minTeamVoteSum: 137.5, maxTeamVoteSum: 149.999 },
  FASCIA_3: { teamBand: 'FASCIA_3', minAverage: 6, maxAverage: 6.5, minTeamVoteSum: 150, maxTeamVoteSum: 162.499 },
  FASCIA_4: { teamBand: 'FASCIA_4', minAverage: 6.5, maxAverage: Infinity, minTeamVoteSum: 162.5, maxTeamVoteSum: Infinity },
};

const FASCIA_0_GENERAL_BONUS = -2.5;

const OFFICIAL_BONUS_BY_BAND: Record<Exclude<TeamVoteBand, 'FASCIA_0'>, Record<number, number>> = {
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

function buildEntries(): TeamBandBonusTableEntry[] {
  return (Object.keys(TEAM_BAND_RANGES) as TeamVoteBand[]).flatMap(teamBand => {
    const band = TEAM_BAND_RANGES[teamBand];
    return INDIVIDUAL_VOTES.map(individualVote => ({
      ...band,
      individualVote,
      bonusMalusPct: teamBand === 'FASCIA_0'
        ? FASCIA_0_GENERAL_BONUS
        : OFFICIAL_BONUS_BY_BAND[teamBand][individualVote],
    }));
  });
}

export const DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG: TeamBandBonusTableConfig = {
  id: 'FANTATRADING_ORIGINAL_OFFICIAL_V1',
  description: 'Tabella ufficiale bonus/malus FantaTrading per fascia squadra e voto individuale.',
  source: 'Regolamento FantaTrading originale',
  isOfficial: true,
  assumptions: [
    'FASCIA_0 applica bonus/malus generale -2.50% a tutti i giocatori.',
    'Il voto 6 e neutro nelle fasce FASCIA_1-FASCIA_4.',
    'I voti intermedi non presenti vengono arrotondati al valore tabellare piu vicino dal motore di lookup.',
    'I voti sotto 3 o sopra 9 vengono gestiti con clamp controllato al valore tabellare piu vicino.',
    'La gestione SV resta configurabile tramite NoVotePolicy e non e dichiarata ufficiale.',
  ],
  rosterSize: 25,
  bands: TEAM_BAND_RANGES,
  entries: buildEntries(),
};

export const DEFAULT_TEAM_BAND_BONUS_TABLE = DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG.entries;
