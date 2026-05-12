import { SyntheticQuoteParams } from '../engine/syntheticRoundQuoteEngine';

export const SYNTHETIC_QUOTE_OPERATIONAL_MODEL_NAME = 'ROLE_BONUS_SENSITIVE' as const;

export interface SyntheticQuoteOperationalMetrics {
  mae: number;
  rmse: number;
  within1Pct: number;
  within2Pct: number;
  within3Pct: number;
  attackerMae: number;
}

export interface SyntheticQuoteOperationalModelConfig {
  modelName: typeof SYNTHETIC_QUOTE_OPERATIONAL_MODEL_NAME;
  isOfficialFantacalcio: false;
  purpose: 'exploratory_intraseason_trading_simulation';
  sourceStudy: string;
  metrics: SyntheticQuoteOperationalMetrics;
  params: SyntheticQuoteParams;
  forbiddenOperationalModels: string[];
}

export const SYNTHETIC_QUOTE_OPERATIONAL_MODEL: SyntheticQuoteOperationalModelConfig = {
  modelName: SYNTHETIC_QUOTE_OPERATIONAL_MODEL_NAME,
  isOfficialFantacalcio: false,
  purpose: 'exploratory_intraseason_trading_simulation',
  sourceStudy: 'reports/real-data/synthetic_quote_deep_optimizer.md',
  metrics: {
    mae: 1.4623552123552124,
    rmse: 2.049814004181221,
    within1Pct: 62.16216216216216,
    within2Pct: 82.33590733590734,
    within3Pct: 92.47104247104248,
    attackerMae: 1.6666666666666667,
  },
  params: {
    lastPerformanceWeight: 0.5189789803370318,
    fantasyAverageWeight: 0.5485423259550106,
    presenceWeight: 0.5073771534388366,
    adjustmentRate: 0.8158537921020421,
    expectedStrength: 1.3263474321985496,
    absencePenalty: -0.09396198070001835,
    roleOverrides: {
      P: {
        presenceWeight: 0.65,
      },
      D: {
        offensiveBonusWeight: 0.08,
        recentOffensiveBonusWeight: 0.04,
      },
      C: {
        offensiveBonusWeight: 0.16,
        recentOffensiveBonusWeight: 0.08,
      },
      A: {
        offensiveBonusWeight: 0.34,
        recentOffensiveBonusWeight: 0.14,
        drySpellPenalty: 0.2,
        expectedStrength: 1.5,
      },
    },
    offensiveBonusWeight: 0.26542507900517087,
    recentOffensiveBonusWeight: 0.04218894534329626,
    recentOffensiveBonusLast5Weight: 0.0518770821885851,
    recentOffensiveBonusLast10Weight: 0.049434554600025195,
    drySpellPenalty: 0.07716714372792448,
    lowCostBreakoutWeight: 0.03770448547734518,
    maxDailyMove: 1.7644544119398238,
  },
  forbiddenOperationalModels: ['ORACLE_FINAL_ANCHOR'],
};

export function isOracleOperationalModel(modelName: string): boolean {
  return SYNTHETIC_QUOTE_OPERATIONAL_MODEL.forbiddenOperationalModels.includes(modelName);
}
