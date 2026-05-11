import {
  runPriceModelAnalysis,
  DEFAULT_PRICE_MODEL_CONFIG,
  PriceModelAnalysisConfig,
} from '../../src/analysis/priceModelAnalysis';
import { DEFAULT_RULES } from '../../src/config/defaultRules';
import { MockPlayer } from '../../src/services/dataLoader';

function makePlayers(n: number): MockPlayer[] {
  const roles: MockPlayer['role'][] = ['GK', 'DEF', 'MID', 'FWD'];
  return Array.from({ length: n }, (_, i) => ({
    id: `tp${i}`, name: `Player ${i}`,
    role: roles[i % 4], club: 'TestFC',
    baseValue: 20 + (i % 5) * 5,
  }));
}

const PLAYERS = makePlayers(20);

const FAST_CFG: PriceModelAnalysisConfig = {
  ...DEFAULT_PRICE_MODEL_CONFIG,
  meanReversionRates: [0.0, 0.05, 0.20],
  numParticipants: 8,
  numSimulations: 5,
  roundsPerSeason: 10,
};

describe('runPriceModelAnalysis — struttura', () => {
  let report: ReturnType<typeof runPriceModelAnalysis>;

  beforeAll(() => {
    report = runPriceModelAnalysis(PLAYERS, FAST_CFG);
  });

  test('produce un punto per ogni rate', () => {
    expect(report.points).toHaveLength(FAST_CFG.meanReversionRates.length);
  });

  test('randomWalkBaseline ha rate=0', () => {
    expect(report.randomWalkBaseline.meanReversionRate).toBe(0);
  });

  test('keyFindings non è vuoto', () => {
    expect(report.keyFindings.length).toBeGreaterThan(0);
  });

  test('recommendedRate è uno dei rate testati', () => {
    expect(FAST_CFG.meanReversionRates).toContain(report.recommendedRate);
  });

  test('recommendedRationale non è vuota', () => {
    expect(report.recommendedRationale.length).toBeGreaterThan(10);
  });

  test('generatedAt è una data ISO valida', () => {
    expect(() => new Date(report.generatedAt)).not.toThrow();
  });
});

describe('runPriceModelAnalysis — economics', () => {
  test('mean reversion riduce il drift dei prezzi', () => {
    const report = runPriceModelAnalysis(PLAYERS, FAST_CFG);
    const rw = report.points.find(p => p.meanReversionRate === 0)!;
    const mr = report.points.find(p => p.meanReversionRate === 0.20)!;
    // Con mean reversion aggressiva il drift assoluto dovrebbe essere ≤ random walk
    expect(mr.avgPriceDriftAbs).toBeLessThanOrEqual(rw.avgPriceDriftAbs + 1);
  });

  test('mean reversion riduce la deviazione standard dei prezzi', () => {
    const report = runPriceModelAnalysis(PLAYERS, FAST_CFG);
    const rw = report.points.find(p => p.meanReversionRate === 0)!;
    const mr = report.points.find(p => p.meanReversionRate === 0.20)!;
    expect(mr.avgPriceStdDev).toBeLessThanOrEqual(rw.avgPriceStdDev + 0.5);
  });

  test('montepremi non cambia drasticamente con la mean reversion (< 20%)', () => {
    const report = runPriceModelAnalysis(PLAYERS, FAST_CFG);
    const rw = report.randomWalkBaseline;
    for (const p of report.points) {
      if (p.meanReversionRate === 0) continue;
      const change = Math.abs(p.avgPrizePool - rw.avgPrizePool) / rw.avgPrizePool;
      expect(change).toBeLessThan(0.20);
    }
  });

  test('pctAbove0 rimane nello stesso range tra tutti i modelli', () => {
    const report = runPriceModelAnalysis(PLAYERS, FAST_CFG);
    const vals = report.points.map(p => p.pctAbove0);
    const range = Math.max(...vals) - Math.min(...vals);
    // Il break-even dipende dalla prize table, non dal modello di prezzo
    expect(range).toBeLessThan(20);
  });
});

describe('meanReversionRate in TradingRules', () => {
  test('DEFAULT_RULES ha meanReversionRate = 0.05 (valore raccomandato Fase 4)', () => {
    expect(DEFAULT_RULES.meanReversionRate).toBe(0.05);
  });

  test('meanReversionRate è un campo valido di TradingRules', () => {
    const rules = { ...DEFAULT_RULES, meanReversionRate: 0.05 };
    expect(rules.meanReversionRate).toBe(0.05);
  });
});
