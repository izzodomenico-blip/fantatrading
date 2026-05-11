import {
  ALL_RULE_MODELS,
  MODEL_1_PURE,
  MODEL_2_MARGIN_10,
  MODEL_3_MARGIN_20,
  MODEL_4_REG_FEE_10,
  MODEL_5_REG_FEE_10_MARGIN_10,
  buildConfig,
} from '../../src/config/ruleModels';

describe('ALL_RULE_MODELS', () => {
  test('contiene esattamente 5 modelli', () => {
    expect(ALL_RULE_MODELS).toHaveLength(5);
  });

  test('tutti i modelli hanno id univoci', () => {
    const ids = ALL_RULE_MODELS.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('tutti i modelli hanno name e description non vuoti', () => {
    for (const m of ALL_RULE_MODELS) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });

  test('prizePoolContributionRate + platformFeeRate = 1 per ogni modello', () => {
    for (const m of ALL_RULE_MODELS) {
      expect(m.rules.prizePoolContributionRate + m.rules.platformFeeRate).toBeCloseTo(1.0, 10);
    }
  });
});

describe('MODEL_1_PURE', () => {
  test('platformFeeRate = 0', () => {
    expect(MODEL_1_PURE.rules.platformFeeRate).toBe(0);
  });

  test('registrationFeePlatformRate = 0 (tutto a montepremi)', () => {
    expect(MODEL_1_PURE.registrationFeePlatformRate).toBe(0);
  });

  test('buyCommissionRate = 2%', () => {
    expect(MODEL_1_PURE.rules.buyCommissionRate).toBeCloseTo(0.02);
  });

  test('sellCommissionRate = 1.25%', () => {
    expect(MODEL_1_PURE.rules.sellCommissionRate).toBeCloseTo(0.0125);
  });
});

describe('MODEL_4_REG_FEE_10 e MODEL_5_REG_FEE_10_MARGIN_10', () => {
  test('M4: registrationFeePlatformRate = 1 (100% quota a piattaforma)', () => {
    expect(MODEL_4_REG_FEE_10.registrationFeePlatformRate).toBe(1.0);
  });

  test('M4: platformFeeRate = 0 (nessun margine sul trading)', () => {
    expect(MODEL_4_REG_FEE_10.rules.platformFeeRate).toBe(0);
  });

  test('M5: registrationFeePlatformRate = 1', () => {
    expect(MODEL_5_REG_FEE_10_MARGIN_10.registrationFeePlatformRate).toBe(1.0);
  });

  test('M5: platformFeeRate = 10%', () => {
    expect(MODEL_5_REG_FEE_10_MARGIN_10.rules.platformFeeRate).toBeCloseTo(0.1);
  });
});

describe('MODEL_2 e MODEL_3', () => {
  test('M2: platformFeeRate = 10%', () => {
    expect(MODEL_2_MARGIN_10.rules.platformFeeRate).toBeCloseTo(0.1);
  });

  test('M2: registrationFeePlatformRate undefined (usa platformFeeRate)', () => {
    expect(MODEL_2_MARGIN_10.registrationFeePlatformRate).toBeUndefined();
  });

  test('M3: platformFeeRate = 20%', () => {
    expect(MODEL_3_MARGIN_20.rules.platformFeeRate).toBeCloseTo(0.2);
  });
});

describe('buildConfig', () => {
  test('costruisce config con parametri corretti', () => {
    const config = buildConfig(MODEL_3_MARGIN_20, 50, 10, 50, 3.0, 42);
    expect(config.numTeams).toBe(50);
    expect(config.numSimulations).toBe(10);
    expect(config.registrationFeePerTeam).toBe(50);
    expect(config.operationsPerTeamPerRound).toBe(3.0);
    expect(config.randomSeed).toBe(42);
    expect(config.rules.platformFeeRate).toBeCloseTo(0.2);
    expect(config.registrationFeePlatformRate).toBeUndefined();
  });

  test('propaga registrationFeePlatformRate da M4', () => {
    const config = buildConfig(MODEL_4_REG_FEE_10, 20, 5, 10, 3.0, 1);
    expect(config.registrationFeePlatformRate).toBe(1.0);
  });
});
