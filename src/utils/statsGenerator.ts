import { PlayerStats, PlayerRole } from '../domain/Player';
import { normalSample, poissonSample } from './randomUtils';
import { clamp } from './mathUtils';

/** Probabilità di marcare un gol per ruolo, per partita */
export const GOAL_LAMBDA: Record<PlayerRole, number> = {
  GK: 0.01,
  DEF: 0.03,
  MID: 0.12,
  FWD: 0.35,
};

/** Probabilità di fornire un assist per ruolo, per partita */
export const ASSIST_LAMBDA: Record<PlayerRole, number> = {
  GK: 0.01,
  DEF: 0.05,
  MID: 0.18,
  FWD: 0.15,
};

/** Probabilità di clean sheet per ruolo */
export const CLEAN_SHEET_PROB: Record<PlayerRole, number> = {
  GK: 0.35,
  DEF: 0.35,
  MID: 0.20,
  FWD: 0.10,
};

/** P(cartellino giallo) per partita */
export const YELLOW_CARD_PROB = 0.08;

/** P(cartellino rosso) per partita — condizionato a non esser stato espulso */
export const RED_CARD_PROB = 0.02;

/** P(titolare/schierato) — contribuisce minutesPlayed ≥ 60 */
export const STARTER_PROB = 0.65;

/** P(entrato a gara in corso) — 60 > minutesPlayed > 0 */
export const SUB_PROB = 0.15;

export function generatePlayerStats(role: PlayerRole, rng: () => number): PlayerStats {
  const roll = rng();
  let minutesPlayed: number;

  if (roll < STARTER_PROB) {
    minutesPlayed = 75 + Math.floor(rng() * 20); // 75-94 minuti
  } else if (roll < STARTER_PROB + SUB_PROB) {
    minutesPlayed = 10 + Math.floor(rng() * 45); // 10-54 minuti
  } else {
    minutesPlayed = 0;
  }

  if (minutesPlayed === 0) {
    return { goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheet: false, minutesPlayed: 0, rating: 0 };
  }

  const playingFactor = minutesPlayed >= 60 ? 1 : 0.4;

  const goals = poissonSample(GOAL_LAMBDA[role] * playingFactor, rng);
  const assists = poissonSample(ASSIST_LAMBDA[role] * playingFactor, rng);
  const yellowCards = rng() < YELLOW_CARD_PROB * playingFactor ? 1 : 0;
  const redCards = yellowCards === 0 && rng() < RED_CARD_PROB ? 1 : 0;
  const cleanSheet = rng() < CLEAN_SHEET_PROB[role] * playingFactor;
  const rating = clamp(normalSample(6.5, 1.0, rng), 3.0, 10.0);

  return { goals, assists, yellowCards, redCards, cleanSheet, minutesPlayed, rating };
}
