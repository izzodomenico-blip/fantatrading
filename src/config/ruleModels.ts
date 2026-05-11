import { TradingRules, DEFAULT_RULES } from './defaultRules';
import { FullSeasonConfig } from '../services/fullSeasonSimulator';
import { DEFAULT_PRIZE_TABLE } from './prizeTables';

export interface RuleModel {
  id: string;
  name: string;
  description: string;
  rules: TradingRules;
  /**
   * Quota della registration fee che va alla piattaforma.
   * undefined = usa rules.platformFeeRate (retrocompatibile).
   */
  registrationFeePlatformRate?: number;
}

// ─── 5 modelli regolamento ────────────────────────────────────────────────────

/** Modello 1: commissioni originali basse (2%/1.25%), zero margine piattaforma */
export const MODEL_1_PURE: RuleModel = {
  id: 'M1',
  name: 'Originale Puro',
  description: 'Commissione acquisto 2%, vendita 1.25%, nessun margine fisso piattaforma. Tutto in montepremi.',
  rules: {
    ...DEFAULT_RULES,
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.0125,
    prizePoolContributionRate: 1.0,
    platformFeeRate: 0.0,
  },
  registrationFeePlatformRate: 0.0,
};

/** Modello 2: commissioni originali + 10% margine piattaforma */
export const MODEL_2_MARGIN_10: RuleModel = {
  id: 'M2',
  name: 'Originale + 10% Margine',
  description: 'Commissione acquisto 2%, vendita 1.25%, margine piattaforma 10% su commissioni e quote.',
  rules: {
    ...DEFAULT_RULES,
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.0125,
    prizePoolContributionRate: 0.9,
    platformFeeRate: 0.1,
  },
  // registrationFeePlatformRate undefined → usa platformFeeRate (10%)
};

/** Modello 3: commissioni originali + 20% margine piattaforma */
export const MODEL_3_MARGIN_20: RuleModel = {
  id: 'M3',
  name: 'Originale + 20% Margine',
  description: 'Commissione acquisto 2%, vendita 1.25%, margine piattaforma 20% su commissioni e quote.',
  rules: {
    ...DEFAULT_RULES,
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.0125,
    prizePoolContributionRate: 0.8,
    platformFeeRate: 0.2,
  },
  // registrationFeePlatformRate undefined → usa platformFeeRate (20%)
};

/** Modello 4: quota iscrizione 10€ + commissioni originali, zero margine su trading */
export const MODEL_4_REG_FEE_10: RuleModel = {
  id: 'M4',
  name: 'Quota 10 + Commissioni',
  description: 'Quota iscrizione 10 crediti (100% piattaforma), commissioni originali 2%/1.25% tutte a montepremi.',
  rules: {
    ...DEFAULT_RULES,
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.0125,
    prizePoolContributionRate: 1.0,
    platformFeeRate: 0.0,
  },
  registrationFeePlatformRate: 1.0,
};

/** Modello 5: quota iscrizione 10€ + 10% margine + commissioni originali */
export const MODEL_5_REG_FEE_10_MARGIN_10: RuleModel = {
  id: 'M5',
  name: 'Quota 10 + 10% Margine',
  description: 'Quota iscrizione 10 crediti (100% piattaforma), commissioni originali 2%/1.25% con 10% a piattaforma.',
  rules: {
    ...DEFAULT_RULES,
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.0125,
    prizePoolContributionRate: 0.9,
    platformFeeRate: 0.1,
  },
  registrationFeePlatformRate: 1.0,
};

export const ALL_RULE_MODELS: RuleModel[] = [
  MODEL_1_PURE,
  MODEL_2_MARGIN_10,
  MODEL_3_MARGIN_20,
  MODEL_4_REG_FEE_10,
  MODEL_5_REG_FEE_10_MARGIN_10,
];

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Costruisce una FullSeasonConfig da un RuleModel + parametri lega */
export function buildConfig(
  model: RuleModel,
  numTeams: number,
  numSimulations: number,
  registrationFeePerTeam: number,
  operationsPerTeamPerRound: number,
  randomSeed: number,
): FullSeasonConfig {
  return {
    numTeams,
    numSimulations,
    operationsPerTeamPerRound,
    registrationFeePerTeam,
    rules: model.rules,
    prizeTable: DEFAULT_PRIZE_TABLE,
    randomSeed,
    registrationFeePlatformRate: model.registrationFeePlatformRate,
  };
}
