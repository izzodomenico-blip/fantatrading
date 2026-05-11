import {
  calculateBreakEven,
  isAboveBreakEven,
} from '../../src/analysis/breakEvenAnalysis';
import { DEFAULT_RULES, TradingRules } from '../../src/config/defaultRules';

// Regole con margine esplicito per testare il break-even (10% comm, 20% piattaforma)
const rules: TradingRules = {
  ...DEFAULT_RULES,
  buyCommissionRate: 0.10,
  sellCommissionRate: 0.10,
  prizePoolContributionRate: 0.80,
  platformFeeRate: 0.20,
};

describe('calculateBreakEven', () => {
  test('con costi fissi 0 il break-even è 0 operazioni', () => {
    const result = calculateBreakEven(0, rules, 20, 15);
    expect(result.minOperations).toBe(0);
    expect(result.platformRevenueAtBreakEven).toBe(0);
  });

  test('calcola minOperations correttamente', () => {
    // avgOpValue=15, avgCommRate=10%, platformRate=20%
    // pricePerOp = 15 * 0.10 * 0.20 = 0.30
    // fixedCosts=300 → minOps = ceil(300/0.30) = 1000
    const result = calculateBreakEven(300, rules, 20, 15);
    expect(result.minOperations).toBe(1000);
  });

  test('minOpsPerTeamPerRound è minOperations / (numTeams * rounds)', () => {
    const result = calculateBreakEven(300, rules, 20, 15);
    const expected = result.minOperations / (20 * rules.roundsPerSeason);
    expect(result.minOpsPerTeamPerRound).toBeCloseTo(expected);
  });

  test('minTradingVolume = minOperations * avgOperationValue', () => {
    const result = calculateBreakEven(300, rules, 20, 15);
    expect(result.minTradingVolume).toBeCloseTo(result.minOperations * 15);
  });

  test('prizePool atteso a break-even è positivo', () => {
    const result = calculateBreakEven(300, rules, 20, 15);
    expect(result.expectedPrizePool).toBeGreaterThan(0);
  });

  test('lancia errore con avgOperationValue 0', () => {
    expect(() => calculateBreakEven(100, rules, 20, 0)).toThrow();
  });

  test('lancia errore con commissioni a zero', () => {
    const zeroRules: TradingRules = { ...rules, buyCommissionRate: 0, sellCommissionRate: 0 };
    expect(() => calculateBreakEven(100, zeroRules, 20, 15)).toThrow();
  });

  test('costi elevati richiedono molte più operazioni', () => {
    const low = calculateBreakEven(100, rules, 20, 15);
    const high = calculateBreakEven(1000, rules, 20, 15);
    expect(high.minOperations).toBeGreaterThan(low.minOperations * 5);
  });

  test('più squadre riducono minOpsPerTeamPerRound', () => {
    const small = calculateBreakEven(300, rules, 10, 15);
    const large = calculateBreakEven(300, rules, 50, 15);
    expect(large.minOpsPerTeamPerRound).toBeLessThan(small.minOpsPerTeamPerRound);
  });
});

describe('isAboveBreakEven', () => {
  test('ritorna true quando le operazioni superano il break-even', () => {
    // Usiamo i valori del test precedente: 1000 ops per costi=300
    expect(isAboveBreakEven(1001, 300, rules, 15)).toBe(true);
  });

  test('ritorna false quando le operazioni sono insufficienti', () => {
    expect(isAboveBreakEven(500, 300, rules, 15)).toBe(false);
  });

  test('con costi 0 è sempre sopra break-even', () => {
    expect(isAboveBreakEven(1, 0, rules, 15)).toBe(true);
  });

  test('esattamente al break-even restituisce true', () => {
    // 1000 ops × 15 × 0.10 × 0.20 = 300 = fixedCosts
    expect(isAboveBreakEven(1000, 300, rules, 15)).toBe(true);
  });
});
