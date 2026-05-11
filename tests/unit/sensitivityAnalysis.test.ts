import {
  runSensitivitySweep,
  runAllSensitivitySweeps,
  buildSensitivityReport,
  DEFAULT_SENSITIVITY_BASELINE,
  SENSITIVITY_PARAMS,
  SensitivityParam,
  SensitivityBaselineConfig,
} from '../../src/analysis/sensitivityAnalysis';
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

const FAST_BASELINE: SensitivityBaselineConfig = {
  ...DEFAULT_SENSITIVITY_BASELINE,
  numParticipants: 8,
  numSimulations: 10,
  roundsPerSeason: 5,
};

const PLATFORM_FEE_PARAM: SensitivityParam = {
  name: 'platformFeeRate',
  displayName: 'Margine Piattaforma',
  unit: '%',
  values: [0.0, 0.10, 0.20],
  baselineValue: 0.10,
  applyToConfig: (v) => ({ platformFeeRate: v }),
};

const OPS_PARAM: SensitivityParam = {
  name: 'operationsPerTeamPerRound',
  displayName: 'Operazioni/Squadra/Giornata',
  unit: 'ops',
  values: [1.0, 3.0, 6.0],
  baselineValue: 3.0,
  applyToConfig: (v) => ({ operationsPerTeamPerRound: v }),
};

describe('runSensitivitySweep — struttura', () => {
  let sweep: ReturnType<typeof runSensitivitySweep>;

  beforeAll(() => {
    sweep = runSensitivitySweep(PLATFORM_FEE_PARAM, FAST_BASELINE, PLAYERS);
  });

  test('produce un punto per ogni valore', () => {
    expect(sweep.points).toHaveLength(PLATFORM_FEE_PARAM.values.length);
  });

  test('ogni punto ha paramValue corrispondente al valore del parametro', () => {
    sweep.points.forEach((p, i) => {
      expect(p.paramValue).toBe(PLATFORM_FEE_PARAM.values[i]);
    });
  });

  test('avgPrizePool è positivo in ogni punto', () => {
    for (const p of sweep.points) {
      expect(p.avgPrizePool).toBeGreaterThan(0);
    }
  });

  test('pctAbove0 è nel range [0,100]', () => {
    for (const p of sweep.points) {
      expect(p.pctAbove0).toBeGreaterThanOrEqual(0);
      expect(p.pctAbove0).toBeLessThanOrEqual(100);
    }
  });
});

describe('runSensitivitySweep — economics', () => {
  test('platformFeeRate=0 → platformLossRisk=100%', () => {
    const sweep = runSensitivitySweep(PLATFORM_FEE_PARAM, FAST_BASELINE, PLAYERS);
    const zeroPoint = sweep.points.find(p => p.paramValue === 0);
    expect(zeroPoint).toBeDefined();
    expect(zeroPoint!.platformLossRisk).toBeCloseTo(100, 0);
    expect(zeroPoint!.isSustainable).toBe(false);
  });

  test('platformFeeRate=0.20 → margine ~20%', () => {
    const sweep = runSensitivitySweep(PLATFORM_FEE_PARAM, FAST_BASELINE, PLAYERS);
    const p20 = sweep.points.find(p => p.paramValue === 0.20);
    expect(p20).toBeDefined();
    expect(p20!.avgOrganizerMarginPct).toBeCloseTo(20, 0);
  });

  test('più operazioni → montepremi più grande', () => {
    const sweep = runSensitivitySweep(OPS_PARAM, FAST_BASELINE, PLAYERS);
    const low = sweep.points.find(p => p.paramValue === 1.0)!;
    const high = sweep.points.find(p => p.paramValue === 6.0)!;
    expect(high.avgPrizePool).toBeGreaterThan(low.avgPrizePool);
  });

  test('più operazioni → ricavo piattaforma più alto', () => {
    const sweep = runSensitivitySweep(OPS_PARAM, FAST_BASELINE, PLAYERS);
    const low = sweep.points.find(p => p.paramValue === 1.0)!;
    const high = sweep.points.find(p => p.paramValue === 6.0)!;
    expect(high.avgPlatformRevenue).toBeGreaterThan(low.avgPlatformRevenue);
  });
});

describe('runAllSensitivitySweeps', () => {
  const MINI_PARAMS: SensitivityParam[] = [PLATFORM_FEE_PARAM, OPS_PARAM];
  let sweeps: ReturnType<typeof runAllSensitivitySweeps>;

  beforeAll(() => {
    sweeps = runAllSensitivitySweeps(PLAYERS, FAST_BASELINE, MINI_PARAMS);
  });

  test('produce un sweep per ogni parametro', () => {
    expect(sweeps).toHaveLength(MINI_PARAMS.length);
  });

  test('paramName corrisponde al parametro', () => {
    expect(sweeps[0].paramName).toBe(PLATFORM_FEE_PARAM.name);
    expect(sweeps[1].paramName).toBe(OPS_PARAM.name);
  });
});

describe('buildSensitivityReport', () => {
  let report: ReturnType<typeof buildSensitivityReport>;

  beforeAll(() => {
    const sweeps = runAllSensitivitySweeps(PLAYERS, FAST_BASELINE, [PLATFORM_FEE_PARAM, OPS_PARAM]);
    report = buildSensitivityReport(sweeps, FAST_BASELINE);
  });

  test('generatedAt è una data ISO valida', () => {
    expect(() => new Date(report.generatedAt)).not.toThrow();
  });

  test('baselineDescription non è vuota', () => {
    expect(report.baselineDescription.length).toBeGreaterThan(0);
  });

  test('numParticipants corrisponde alla baseline', () => {
    expect(report.numParticipants).toBe(FAST_BASELINE.numParticipants);
  });

  test('sweeps nel report corrispondono a quelli input', () => {
    expect(report.sweeps).toHaveLength(2);
  });

  test('keyFindings non è vuoto', () => {
    expect(report.keyFindings.length).toBeGreaterThan(0);
  });
});

describe('SENSITIVITY_PARAMS — costanti esportate', () => {
  test('contiene 7 parametri', () => {
    expect(SENSITIVITY_PARAMS).toHaveLength(7);
  });

  test('ogni parametro ha almeno 3 valori', () => {
    for (const p of SENSITIVITY_PARAMS) {
      expect(p.values.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('applyToConfig ritorna un oggetto non vuoto', () => {
    for (const p of SENSITIVITY_PARAMS) {
      const result = p.applyToConfig(p.baselineValue, DEFAULT_SENSITIVITY_BASELINE);
      expect(Object.keys(result).length).toBeGreaterThan(0);
    }
  });
});
