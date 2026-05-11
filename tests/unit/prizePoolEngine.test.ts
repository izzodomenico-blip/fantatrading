import {
  splitCommission,
  aggregateCommissions,
  calculatePrizeDistribution,
  minPrizePoolForPositiveROI,
  minOperationsForTargetPool,
} from '../../src/engine/prizePoolEngine';
import { DEFAULT_RULES, TradingRules } from '../../src/config/defaultRules';
import { DEFAULT_PRIZE_TABLE, SMALL_LEAGUE_PRIZE_TABLE, PrizeDistribution } from '../../src/config/prizeTables';
import { validatePrizeTable } from '../../src/config/prizeTables';

const rules = DEFAULT_RULES; // prizePoolContributionRate=0.80, platformFeeRate=0.20

// ─── splitCommission ─────────────────────────────────────────────────────────

describe('splitCommission', () => {
  test('commissione 100: 80 a montepremi, 20 a piattaforma', () => {
    const { toPrizePool, toPlatform } = splitCommission(100, rules);
    expect(toPrizePool).toBeCloseTo(80);
    expect(toPlatform).toBeCloseTo(20);
  });

  test('la somma è sempre uguale alla commissione originale', () => {
    const commission = 137.5;
    const { toPrizePool, toPlatform } = splitCommission(commission, rules);
    expect(toPrizePool + toPlatform).toBeCloseTo(commission);
  });

  test('split 70/30 funziona correttamente', () => {
    const splitRules: TradingRules = { ...rules, prizePoolContributionRate: 0.70, platformFeeRate: 0.30 };
    const { toPrizePool, toPlatform } = splitCommission(100, splitRules);
    expect(toPrizePool).toBeCloseTo(70);
    expect(toPlatform).toBeCloseTo(30);
  });

  test('commissione zero → entrambi zero', () => {
    const { toPrizePool, toPlatform } = splitCommission(0, rules);
    expect(toPrizePool).toBe(0);
    expect(toPlatform).toBe(0);
  });
});

// ─── aggregateCommissions ────────────────────────────────────────────────────

describe('aggregateCommissions', () => {
  test('somma commissioni correttamente', () => {
    const result = aggregateCommissions([10, 20, 30], rules);
    expect(result.totalCommissions).toBe(60);
    expect(result.totalPrizePool).toBeCloseTo(48);
    expect(result.totalPlatformRevenue).toBeCloseTo(12);
  });

  test('lista vuota → tutti zero', () => {
    const result = aggregateCommissions([], rules);
    expect(result.totalCommissions).toBe(0);
    expect(result.totalPrizePool).toBe(0);
    expect(result.totalPlatformRevenue).toBe(0);
  });

  test('totalPrizePool + totalPlatformRevenue = totalCommissions', () => {
    const result = aggregateCommissions([15, 25, 10], rules);
    expect(result.totalPrizePool + result.totalPlatformRevenue).toBeCloseTo(result.totalCommissions);
  });
});

// ─── calculatePrizeDistribution ─────────────────────────────────────────────

describe('calculatePrizeDistribution', () => {
  test('distribuisce correttamente con DEFAULT_PRIZE_TABLE', () => {
    const awards = calculatePrizeDistribution(1000, DEFAULT_PRIZE_TABLE);

    const first = awards.find(a => a.rank === 1);
    const second = awards.find(a => a.rank === 2);

    expect(first?.amount).toBeCloseTo(400); // 40% di 1000
    expect(second?.amount).toBeCloseTo(250); // 25% di 1000
  });

  test('la somma dei premi eguaglia il montepremi totale', () => {
    const total = 750;
    const awards = calculatePrizeDistribution(total, DEFAULT_PRIZE_TABLE);
    const sum = awards.reduce((s, a) => s + a.amount, 0);
    expect(sum).toBeCloseTo(total);
  });

  test('montepremi zero → tutti i premi sono zero', () => {
    const awards = calculatePrizeDistribution(0, DEFAULT_PRIZE_TABLE);
    awards.forEach(a => expect(a.amount).toBe(0));
  });

  test('SMALL_LEAGUE_PRIZE_TABLE: 3 premi totali', () => {
    const awards = calculatePrizeDistribution(300, SMALL_LEAGUE_PRIZE_TABLE);
    expect(awards.length).toBe(3);
    expect(awards.find(a => a.rank === 1)?.amount).toBeCloseTo(180); // 60%
    expect(awards.find(a => a.rank === 3)?.amount).toBeCloseTo(30);  // 10%
  });

  test('il label viene riportato correttamente', () => {
    const awards = calculatePrizeDistribution(100, SMALL_LEAGUE_PRIZE_TABLE);
    expect(awards[0].label).toBe('1° posto');
  });
});

// ─── validatePrizeTable ──────────────────────────────────────────────────────

describe('validatePrizeTable', () => {
  test('DEFAULT_PRIZE_TABLE è valida', () => {
    expect(validatePrizeTable(DEFAULT_PRIZE_TABLE)).toHaveLength(0);
  });

  test('tabella con somma ≠ 1 non è valida', () => {
    const badTable: PrizeDistribution[] = [
      { rank: 1, percentageOfPool: 0.50, label: '1°' },
      { rank: 2, percentageOfPool: 0.30, label: '2°' },
      // totale = 0.80, manca 0.20
    ];
    const errors = validatePrizeTable(badTable);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('tabella con rank duplicati non è valida', () => {
    const dupTable: PrizeDistribution[] = [
      { rank: 1, percentageOfPool: 0.50, label: '1°' },
      { rank: 1, percentageOfPool: 0.50, label: '1° dup' },
    ];
    const errors = validatePrizeTable(dupTable);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── minOperationsForTargetPool ──────────────────────────────────────────────

describe('minOperationsForTargetPool', () => {
  test('calcola correttamente il numero minimo di operazioni', () => {
    // target=1000, avgOp=100, commRate=0.10, prizePoolRate=0.80
    // prizePerOp = 100 * 0.10 * 0.80 = 8
    // minOps = ceil(1000 / 8) = 125
    const minOps = minOperationsForTargetPool(1000, 100, 0.10, 0.80);
    expect(minOps).toBe(125);
  });

  test('target zero → 0 operazioni', () => {
    expect(minOperationsForTargetPool(0, 100, 0.10, 0.80)).toBe(0);
  });

  test('lancia errore con prizePerOp = 0', () => {
    expect(() => minOperationsForTargetPool(1000, 100, 0, 0.80)).toThrow();
  });
});
