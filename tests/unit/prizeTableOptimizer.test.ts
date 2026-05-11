import {
  generateGeometricTable,
  computePrizeGini,
  runPrizeTableGridSearch,
  DEFAULT_PRIZE_TABLE_OPTIMIZER_CONFIG,
  PrizeTableOptimizerConfig,
} from '../../src/analysis/prizeTableOptimizer';
import { MockPlayer } from '../../src/services/dataLoader';

function makePlayers(n: number): MockPlayer[] {
  const roles: MockPlayer['role'][] = ['GK', 'DEF', 'MID', 'FWD'];
  return Array.from({ length: n }, (_, i) => ({
    id: `tp${i}`, name: `Player ${i}`,
    role: roles[i % 4], club: 'TestFC',
    baseValue: 10 + (i % 10) * 3,
  }));
}

const PLAYERS = makePlayers(20);

const FAST_CFG: PrizeTableOptimizerConfig = {
  ...DEFAULT_PRIZE_TABLE_OPTIMIZER_CONFIG,
  numParticipants: 10,
  numSimulations: 5,
  roundsPerSeason: 5,
  numPrizesValues: [1, 3, 5],
  firstPrizePctValues: [0.50, 0.60],
};

// ─── generateGeometricTable ───────────────────────────────────────────────────

describe('generateGeometricTable', () => {
  test('n=1 → winner-takes-all 100%', () => {
    const t = generateGeometricTable(1, 1.0);
    expect(t).toHaveLength(1);
    expect(t[0].percentageOfPool).toBeCloseTo(1.0, 9);
  });

  test('somma sempre 1.0 per varie combinazioni', () => {
    for (const n of [2, 3, 5, 8]) {
      for (const p of [0.30, 0.50, 0.70]) {
        if (p < 1 / n) continue;
        const t = generateGeometricTable(n, p);
        const total = t.reduce((s, e) => s + e.percentageOfPool, 0);
        expect(total).toBeCloseTo(1.0, 8);
      }
    }
  });

  test('primo posto ≈ firstPrizePct', () => {
    const t = generateGeometricTable(5, 0.50);
    expect(t[0].percentageOfPool).toBeCloseTo(0.50, 5);
  });

  test('decrescente: ogni rank ha percentuale >= rank successivo', () => {
    const t = generateGeometricTable(6, 0.40);
    for (let i = 0; i < t.length - 1; i++) {
      expect(t[i].percentageOfPool).toBeGreaterThanOrEqual(t[i + 1].percentageOfPool);
    }
  });

  test('n=3 piatto (p=1/3) → distribuzione uniforme', () => {
    const t = generateGeometricTable(3, 1 / 3);
    for (const e of t) {
      expect(e.percentageOfPool).toBeCloseTo(1 / 3, 5);
    }
  });

  test('rank label corretto', () => {
    const t = generateGeometricTable(3, 0.60);
    expect(t[0].rank).toBe(1);
    expect(t[1].rank).toBe(2);
    expect(t[2].rank).toBe(3);
  });
});

// ─── computePrizeGini ─────────────────────────────────────────────────────────

describe('computePrizeGini', () => {
  test('winner-takes-all → Gini = (N-1)/N (max)', () => {
    const N = 10;
    const t = generateGeometricTable(1, 1.0);
    const gini = computePrizeGini(t, N);
    expect(gini).toBeCloseTo((N - 1) / N, 5);
  });

  test('distribuzione piatta tra tutti → Gini ≈ 0', () => {
    const N = 4;
    const t = [
      { rank: 1, percentageOfPool: 0.25, label: '1°' },
      { rank: 2, percentageOfPool: 0.25, label: '2°' },
      { rank: 3, percentageOfPool: 0.25, label: '3°' },
      { rank: 4, percentageOfPool: 0.25, label: '4°' },
    ];
    expect(computePrizeGini(t, N)).toBeCloseTo(0, 5);
  });

  test('più premi → Gini minore (meno concentrazione)', () => {
    const N = 10;
    const fewPrizes = generateGeometricTable(2, 0.70);
    const manyPrizes = generateGeometricTable(8, 0.40);
    expect(computePrizeGini(fewPrizes, N)).toBeGreaterThan(computePrizeGini(manyPrizes, N));
  });

  test('Gini è tra 0 e 1', () => {
    for (const n of [1, 3, 6]) {
      const t = generateGeometricTable(n, 0.50);
      const g = computePrizeGini(t, 10);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
    }
  });
});

// ─── runPrizeTableGridSearch ──────────────────────────────────────────────────

describe('runPrizeTableGridSearch — struttura', () => {
  let result: ReturnType<typeof runPrizeTableGridSearch>;

  beforeAll(() => {
    result = runPrizeTableGridSearch(PLAYERS, FAST_CFG);
  });

  test('candidatesEvaluated > 0', () => {
    expect(result.candidatesEvaluated).toBeGreaterThan(0);
  });

  test('paretoFrontier non è vuota', () => {
    expect(result.paretoFrontier.length).toBeGreaterThan(0);
  });

  test('candidati Pareto sono marcati isParetoOptimal=true', () => {
    for (const p of result.paretoFrontier) {
      const found = result.allCandidates.find(c =>
        c.numPrizes === p.numPrizes && c.firstPrizePct === p.firstPrizePct,
      );
      expect(found?.isParetoOptimal).toBe(true);
    }
  });

  test('nessuna soluzione Pareto è dominata da un\'altra (assi: pctAbove0, avgFirstPrize)', () => {
    const pareto = result.paretoFrontier;
    for (const a of pareto) {
      for (const b of pareto) {
        if (a === b) continue;
        const dom = b.pctAbove0 >= a.pctAbove0 && b.avgFirstPrize >= a.avgFirstPrize &&
          (b.pctAbove0 > a.pctAbove0 || b.avgFirstPrize > a.avgFirstPrize);
        expect(dom).toBe(false);
      }
    }
  });

  test('recommendations non è vuoto', () => {
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

describe('runPrizeTableGridSearch — economics', () => {
  test('più premi → pctAbove0 più alta (a parità di top%)', () => {
    const cfg: PrizeTableOptimizerConfig = {
      ...FAST_CFG,
      numPrizesValues: [2, 6],
      firstPrizePctValues: [0.50],
    };
    const result = runPrizeTableGridSearch(PLAYERS, cfg);
    const c2 = result.allCandidates.find(c => c.numPrizes === 2)!;
    const c6 = result.allCandidates.find(c => c.numPrizes === 6)!;
    expect(c6.pctAbove0).toBeGreaterThanOrEqual(c2.pctAbove0);
  });

  let result2: ReturnType<typeof runPrizeTableGridSearch>;
  beforeAll(() => { result2 = runPrizeTableGridSearch(PLAYERS, FAST_CFG); });

  test('premio 1° è sempre > premio ultimo', () => {
    for (const c of result2.allCandidates) {
      if (c.numPrizes > 1) {
        expect(c.avgFirstPrize).toBeGreaterThan(c.avgLastPrize);
      }
    }
  });
});
