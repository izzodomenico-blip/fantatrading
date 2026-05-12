import type { NoVotePolicyConfig } from '../../engine/teamVoteBandEngine';
import type { RosterCount } from '../domain';

// ─── Commissioni ─────────────────────────────────────────────────────────────

/** Commissione di acquisto V1: 2% del valore lordo del giocatore. */
export const V1_BUY_COMMISSION_RATE = 0.02;

/** Commissione di vendita V1: 2% del valore lordo del giocatore. */
export const V1_SELL_COMMISSION_RATE = 0.02;

/** Platform fee V1: 10% delle commissioni generate (acquisto + vendita). */
export const V1_PLATFORM_FEE_RATE = 0.10;

// ─── Soglie ROI ───────────────────────────────────────────────────────────────

/** Soglia sopravvivenza: ROI ≥ 0% per non perdere valore. */
export const V1_SURVIVAL_THRESHOLD = 0;

/** Soglia premio: ROI ≥ 7% per accedere ai premi. Espresso in punti percentuali. */
export const V1_PRIZE_THRESHOLD = 7;

// ─── Quotazioni ──────────────────────────────────────────────────────────────

/**
 * Ogni 1 punto di variazione quotazione = 5% del valore del giocatore.
 * Formula: returnPct = (Qt.A − Qt.I) × QUOTE_STEP_PCT
 */
export const V1_QUOTE_STEP_PCT = 5;

/** Il valore di vendita non può scendere sotto zero: perdita massima -100%. */
export const V1_MAX_LOSS_PCT = -100;

// ─── Composizione rosa ────────────────────────────────────────────────────────

/** Composizione obbligatoria V1: 3P + 8D + 8C + 6A = 25 giocatori. */
export const V1_ROSTER_COMPOSITION = {
  GK: 3,
  DEF: 8,
  MID: 8,
  FWD: 6,
  total: 25,
} as const satisfies RosterCount & { total: number };

// ─── NoVotePolicy ────────────────────────────────────────────────────────────

/** Policy SV V1: il giocatore assente è escluso dalla media squadra; effetto individuale 0%. */
export const V1_NO_VOTE_POLICY: NoVotePolicyConfig = {
  policy: 'PLAYER_ZERO_TEAM_EXCLUDE',
};

// ─── Riepilogo configurazione V1 ─────────────────────────────────────────────

/** Oggetto di riepilogo leggibile della configurazione V1 — utile per log e documentazione. */
export const V1_RULES_SUMMARY = {
  buyCommissionRate: V1_BUY_COMMISSION_RATE,
  sellCommissionRate: V1_SELL_COMMISSION_RATE,
  platformFeeRate: V1_PLATFORM_FEE_RATE,
  survivalThreshold: V1_SURVIVAL_THRESHOLD,
  prizeThreshold: V1_PRIZE_THRESHOLD,
  quoteStepPctPerPoint: V1_QUOTE_STEP_PCT,
  maxLossPct: V1_MAX_LOSS_PCT,
  rosterComposition: V1_ROSTER_COMPOSITION,
  noVotePolicy: V1_NO_VOTE_POLICY.policy,
} as const;
