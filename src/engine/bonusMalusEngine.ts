import { PlayerStats, PlayerRole } from '../domain/Player';

export interface BonusMalusRules {
  goalBonus: Record<PlayerRole, number>;
  assistBonus: number;
  yellowCardMalus: number;
  redCardMalus: number;
  cleanSheetBonus: Record<PlayerRole, number>;
  minuteThreshold: number;
  noPlayMalus: number;
  ratingBonusThreshold: number;
  ratingMalusThreshold: number;
  ratingBonusValue: number;
  ratingMalusValue: number;
}

export const DEFAULT_BONUS_MALUS_RULES: BonusMalusRules = {
  goalBonus: { GK: 20, DEF: 15, MID: 10, FWD: 7 },
  assistBonus: 5,
  yellowCardMalus: -2,
  redCardMalus: -10,
  cleanSheetBonus: { GK: 10, DEF: 7, MID: 3, FWD: 0 },
  minuteThreshold: 60,
  noPlayMalus: -3,
  ratingBonusThreshold: 7.5,
  ratingMalusThreshold: 5.0,
  ratingBonusValue: 3,
  ratingMalusValue: -3,
};

export interface BonusMalusBreakdown {
  fromGoals: number;
  fromAssists: number;
  fromYellowCards: number;
  fromRedCards: number;
  fromCleanSheet: number;
  fromNoPlay: number;
  fromRating: number;
  total: number;
}

export function calculateBonusMalus(
  stats: PlayerStats,
  role: PlayerRole,
  rules: BonusMalusRules = DEFAULT_BONUS_MALUS_RULES,
): BonusMalusBreakdown {
  const fromGoals = stats.goals * rules.goalBonus[role];
  const fromAssists = stats.assists * rules.assistBonus;
  const fromYellowCards = stats.yellowCards * rules.yellowCardMalus;
  const fromRedCards = stats.redCards * rules.redCardMalus;
  const fromCleanSheet = stats.cleanSheet ? rules.cleanSheetBonus[role] : 0;
  const fromNoPlay = stats.minutesPlayed < rules.minuteThreshold ? rules.noPlayMalus : 0;

  let fromRating = 0;
  if (stats.minutesPlayed >= rules.minuteThreshold) {
    if (stats.rating >= rules.ratingBonusThreshold) fromRating = rules.ratingBonusValue;
    else if (stats.rating <= rules.ratingMalusThreshold) fromRating = rules.ratingMalusValue;
  }

  const total = fromGoals + fromAssists + fromYellowCards + fromRedCards
    + fromCleanSheet + fromNoPlay + fromRating;

  return { fromGoals, fromAssists, fromYellowCards, fromRedCards, fromCleanSheet, fromNoPlay, fromRating, total };
}

export function applyBonusMalusToValue(
  currentValue: number,
  bonusMalusTotal: number,
  minValue: number = 1,
  maxValue: number = Infinity,
): number {
  return Math.min(maxValue, Math.max(minValue, currentValue + bonusMalusTotal));
}
