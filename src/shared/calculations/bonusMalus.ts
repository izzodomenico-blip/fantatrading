/**
 * Calcolo bonus/malus fantasy per giocatore.
 *
 * Il valore è determinato dalla combinazione:
 *   fascia squadra (FASCIA_0..4) × voto individuale del giocatore
 * secondo la tabella ufficiale FantaTrading.
 *
 * Il fantasyMultiplier si accumula per prodotto composto:
 *   newMultiplier = currentMultiplier × (1 + bonusPct / 100)
 */

import {
  getBonusMalusPct,
  getNoVoteBonusMalusPct,
} from '../../engine/fantaTradingBonusTableEngine';
import { DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG } from '../../config/teamBandBonusTables';
import type { TeamVoteBand, NoVotePolicyConfig } from '../../engine/teamVoteBandEngine';
import type { TeamBandBonusTableConfig } from '../../config/teamBandBonusTables';

export { getBonusMalusPct, getNoVoteBonusMalusPct };
export type { BonusLookupResult } from '../../engine/fantaTradingBonusTableEngine';

/**
 * Restituisce il bonus/malus percentuale per un giocatore.
 *
 * @param teamBand       Fascia squadra calcolata per la giornata.
 * @param individualVote Voto del giocatore (null se SV).
 * @param noVotePolicy   Policy per giocatori senza voto (V1: PLAYER_ZERO_TEAM_EXCLUDE → 0%).
 * @param tableConfig    Tabella ufficiale (default: tabella ufficiale FantaTrading V1).
 * @returns              Bonus/malus in punti percentuali. Es: 1.5 = +1.5%.
 */
export function calculateFantasyBonusMalus(
  teamBand: TeamVoteBand,
  individualVote: number | null,
  noVotePolicy: NoVotePolicyConfig = { policy: 'PLAYER_ZERO_TEAM_EXCLUDE' },
  tableConfig: TeamBandBonusTableConfig = DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG,
): number {
  if (individualVote === null) {
    return getNoVoteBonusMalusPct(noVotePolicy);
  }
  return getBonusMalusPct(teamBand, individualVote, tableConfig).bonusMalusPct;
}

/**
 * Aggiorna il fantasyMultiplier applicando il bonus/malus della giornata.
 * Il moltiplicatore si accumula per prodotto composto su 38 giornate.
 *
 * @param fantasyMultiplier  Moltiplicatore corrente (default 1.0 a inizio stagione).
 * @param bonusPct           Bonus/malus in punti percentuali. Es: 1.5 = +1.5%.
 * @returns                  Nuovo moltiplicatore aggiornato.
 */
export function applyBonusToMultiplier(
  fantasyMultiplier: number,
  bonusPct: number,
): number {
  return fantasyMultiplier * (1 + bonusPct / 100);
}
