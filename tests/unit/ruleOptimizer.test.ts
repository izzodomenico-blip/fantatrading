import {
  runGridSearch,
  DEFAULT_SEARCH_SPACE,
  DEFAULT_OPTIMIZER_RUN_CONFIG,
  OptimizerSearchSpace,
  OptimizerRunConfig,
  OptimizerCandidate,
} from '../../src/analysis/ruleOptimizer';
import { MockPlayer } from '../../src/services/dataLoader';

function makePlayers(n: number): MockPlayer[] {
  const roles: MockPlayer['role'][] = ['GK', 'DEF', 'MID', 'FWD'];
  return Array.from({ length: n }, (_, i) => ({
    id: `tp${i}`,
    name: `Player ${i}`,
    role: roles[i % 4],
    club: 'TestFC',
    baseValue: 10 + (i % 10) * 3,
  }));
}

const PLAYERS = makePlayers(20);

const TINY_SPACE: OptimizerSearchSpace = {
  buyCommissionRates: [0.02, 0.05],
  sellCommissionRates: [0.0125, 0.03],
  platformFeeRates: [0.10, 0.20],
};

const FAST_RUN: OptimizerRunConfig = {
  ...DEFAULT_OPTIMIZER_RUN_CONFIG,
  numParticipants: 8,
  numSimulations: 5,
  roundsPerSeason: 5,
};

describe('runGridSearch — struttura', () => {
  let result: ReturnType<typeof runGridSearch>;

  beforeAll(() => {
    result = runGridSearch(PLAYERS, TINY_SPACE, FAST_RUN);
  });

  test('valuta il numero corretto di candidati', () => {
    const expected =
      TINY_SPACE.buyCommissionRates.length *
      TINY_SPACE.sellCommissionRates.length *
      TINY_SPACE.platformFeeRates.length;
    expect(result.totalCandidatesEvaluated).toBe(expected);
    expect(result.allCandidates).toHaveLength(expected);
  });

  test('bestPerObjective contiene 4 obiettivi', () => {
    const keys = Object.keys(result.bestPerObjective);
    expect(keys).toContain('maxOrganizerRevenue');
    expect(keys).toContain('maxParticipantWelfare');
    expect(keys).toContain('maxWinnerAttractiveness');
    expect(keys).toContain('balanced');
  });

  test('paretoFrontier non è vuota', () => {
    expect(result.paretoFrontier.length).toBeGreaterThan(0);
  });

  test('ogni candidato Pareto è marcato isParetoOptimal=true', () => {
    for (const p of result.paretoFrontier) {
      const found = result.allCandidates.find(c =>
        c.buyCommissionRate === p.buyCommissionRate &&
        c.sellCommissionRate === p.sellCommissionRate &&
        c.platformFeeRate === p.platformFeeRate,
      );
      expect(found?.isParetoOptimal).toBe(true);
    }
  });

  test('recommendations non è vuoto', () => {
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  test('generatedAt è una data ISO valida', () => {
    expect(() => new Date(result.generatedAt)).not.toThrow();
  });
});

describe('runGridSearch — economics', () => {
  test('platform=0.05 ha margine ~5%, platform=0.20 ha margine ~20%', () => {
    const space: OptimizerSearchSpace = {
      buyCommissionRates: [0.02],
      sellCommissionRates: [0.0125],
      platformFeeRates: [0.05, 0.20],
    };
    const res = runGridSearch(PLAYERS, space, FAST_RUN);
    const c5 = res.allCandidates.find(c => c.platformFeeRate === 0.05)!;
    const c20 = res.allCandidates.find(c => c.platformFeeRate === 0.20)!;
    expect(c5.avgOrganizerMarginPct).toBeCloseTo(5, 0);
    expect(c20.avgOrganizerMarginPct).toBeCloseTo(20, 0);
  });

  test('commissioni più alte → montepremi più grande', () => {
    const space: OptimizerSearchSpace = {
      buyCommissionRates: [0.01, 0.10],
      sellCommissionRates: [0.0125],
      platformFeeRates: [0.10],
    };
    const res = runGridSearch(PLAYERS, space, FAST_RUN);
    const low = res.allCandidates.find(c => c.buyCommissionRate === 0.01)!;
    const high = res.allCandidates.find(c => c.buyCommissionRate === 0.10)!;
    expect(high.avgPrizePool).toBeGreaterThan(low.avgPrizePool);
  });

  test('maxOrganizerRevenue best ha ricavo >= tutti gli altri candidati', () => {
    const res = runGridSearch(PLAYERS, TINY_SPACE, FAST_RUN);
    const best = res.bestPerObjective.maxOrganizerRevenue;
    for (const c of res.allCandidates) {
      expect(best.avgPlatformRevenue).toBeGreaterThanOrEqual(c.avgPlatformRevenue - 0.01);
    }
  });

  test('nessuna soluzione Pareto è dominata da un\'altra (assi: ricavo piattaforma, premio 1°)', () => {
    const res = runGridSearch(PLAYERS, TINY_SPACE, FAST_RUN);
    const pareto = res.paretoFrontier;
    for (const a of pareto) {
      for (const b of pareto) {
        if (a === b) continue;
        const bDominatesA =
          b.avgPlatformRevenue >= a.avgPlatformRevenue &&
          b.avgFirstPrize >= a.avgFirstPrize &&
          (b.avgPlatformRevenue > a.avgPlatformRevenue || b.avgFirstPrize > a.avgFirstPrize);
        expect(bDominatesA).toBe(false);
      }
    }
  });
});

describe('runGridSearch — scores', () => {
  test('tutti i candidati hanno i 4 score calcolati', () => {
    const res = runGridSearch(PLAYERS, TINY_SPACE, FAST_RUN);
    for (const c of res.allCandidates) {
      expect(typeof c.scores.maxOrganizerRevenue).toBe('number');
      expect(typeof c.scores.maxParticipantWelfare).toBe('number');
      expect(typeof c.scores.maxWinnerAttractiveness).toBe('number');
      expect(typeof c.scores.balanced).toBe('number');
    }
  });
});
