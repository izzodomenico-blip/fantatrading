/**
 * Re-export delle funzioni di calcolo fascia squadra dal motore esistente.
 * Nessuna duplicazione: questo file è un adapter thin che espone l'API
 * del motore tramite il barrel della shared library.
 *
 * Fascia squadra V1:
 *   FASCIA_0: media < 5
 *   FASCIA_1: media ≥ 5 e < 5.5
 *   FASCIA_2: media ≥ 5.5 e < 6
 *   FASCIA_3: media ≥ 6 e < 6.5
 *   FASCIA_4: media ≥ 6.5
 *
 * Policy SV V1: PLAYER_ZERO_TEAM_EXCLUDE
 *   - il giocatore SV non entra nella media squadra;
 *   - il giocatore SV riceve effetto fantasy 0%.
 */
export {
  calculateTeamVoteBand,
  getTeamVoteBand,
} from '../../engine/teamVoteBandEngine';

export type {
  TeamVoteInput,
  TeamVoteBandResult,
  TeamVoteBand,
  NoVotePolicy,
  NoVotePolicyConfig,
} from '../../engine/teamVoteBandEngine';
