import {
  runRuleComparison,
  buildComparisonReport,
  ComparisonRow,
} from '../../src/services/ruleComparisonEngine';
import {
  ALL_RULE_MODELS,
  MODEL_1_PURE,
  MODEL_2_MARGIN_10,
  MODEL_3_MARGIN_20,
  MODEL_4_REG_FEE_10,
} from '../../src/config/ruleModels';
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
const SMALL_N = [4, 8];

describe('runRuleComparison — struttura output', () => {
  let rows: ComparisonRow[];

  beforeAll(() => {
    rows = runRuleComparison(PLAYERS, ALL_RULE_MODELS, SMALL_N);
  });

  test('produce numModels × numN righe', () => {
    expect(rows).toHaveLength(ALL_RULE_MODELS.length * SMALL_N.length);
  });

  test('ogni riga ha modelId valido', () => {
    const validIds = ALL_RULE_MODELS.map(m => m.id);
    for (const r of rows) {
      expect(validIds).toContain(r.modelId);
    }
  });

  test('avgPrizePool è positivo in tutte le righe', () => {
    for (const r of rows) {
      expect(r.avgPrizePool).toBeGreaterThan(0);
    }
  });

  test('avgGrossInflow >= avgPrizePool + avgPlatformRevenue (approssimato)', () => {
    for (const r of rows) {
      // grossInflow = commissioni + reg fee; prizePool + platformRevenue ≤ grossInflow
      expect(r.avgGrossInflow).toBeGreaterThanOrEqual(r.avgPrizePool + r.avgPlatformRevenue - 1);
    }
  });

  test('pctAbove0 e pctAbove5 nel range [0,100]', () => {
    for (const r of rows) {
      expect(r.pctAbove0).toBeGreaterThanOrEqual(0);
      expect(r.pctAbove0).toBeLessThanOrEqual(100);
      expect(r.pctAbove5).toBeLessThanOrEqual(r.pctAbove0);
    }
  });

  test('platformLossRisk è 100% per M1 (nessun margine)', () => {
    const m1Rows = rows.filter(r => r.modelId === 'M1');
    for (const r of m1Rows) {
      // M1 ha platformFeeRate=0 e registrationFeePlatformRate=0, quindi platformRevenue=0 sempre
      expect(r.platformLossRisk).toBeCloseTo(100, 0);
    }
  });

  test('M1 isSustainable = false (nessun ricavo piattaforma)', () => {
    const m1Rows = rows.filter(r => r.modelId === 'M1');
    for (const r of m1Rows) {
      expect(r.isSustainable).toBe(false);
    }
  });

  test('M3 avgOrganizerMarginPct ≈ 20%', () => {
    const m3Row = rows.find(r => r.modelId === 'M3' && r.numParticipants === SMALL_N[0]);
    expect(m3Row).toBeDefined();
    expect(m3Row!.avgOrganizerMarginPct).toBeCloseTo(20, 0);
  });
});

describe('runRuleComparison — economics comparativi', () => {
  test('M3 ha margine % più alto di M2 (stesso schema, 20% vs 10%)', () => {
    const rows = runRuleComparison(PLAYERS, [MODEL_2_MARGIN_10, MODEL_3_MARGIN_20], [8]);
    const m2 = rows.find(r => r.modelId === 'M2')!;
    const m3 = rows.find(r => r.modelId === 'M3')!;
    expect(m3.avgOrganizerMarginPct).toBeGreaterThan(m2.avgOrganizerMarginPct);
  });

  test('M1 ha montepremi più alto di M3 a parità di N (tutto a montepremi)', () => {
    const rows = runRuleComparison(PLAYERS, [MODEL_1_PURE, MODEL_3_MARGIN_20], [8]);
    const m1 = rows.find(r => r.modelId === 'M1')!;
    const m3 = rows.find(r => r.modelId === 'M3')!;
    expect(m1.avgPrizePool).toBeGreaterThan(m3.avgPrizePool);
  });

  test('M4 ha quota iscrizione 10, avgPlatformRevenue > 0 (quota 100% a piattaforma)', () => {
    const rows = runRuleComparison(PLAYERS, [MODEL_4_REG_FEE_10], [8]);
    const r = rows[0];
    expect(r.registrationFeePerTeam).toBe(10);
    expect(r.avgPlatformRevenue).toBeGreaterThan(0);
    expect(r.isSustainable).toBe(true);
  });

  test('N più alto → montepremi più alto (stesso modello)', () => {
    const rows = runRuleComparison(PLAYERS, [MODEL_2_MARGIN_10], SMALL_N);
    const small = rows.find(r => r.numParticipants === SMALL_N[0])!;
    const large = rows.find(r => r.numParticipants === SMALL_N[1])!;
    expect(large.avgPrizePool).toBeGreaterThan(small.avgPrizePool);
  });
});

describe('buildComparisonReport', () => {
  let rows: ComparisonRow[];

  beforeAll(() => {
    rows = runRuleComparison(PLAYERS, ALL_RULE_MODELS, SMALL_N);
  });

  test('report contiene participantCounts ordinati', () => {
    const report = buildComparisonReport(rows);
    const sorted = [...report.participantCounts].sort((a, b) => a - b);
    expect(report.participantCounts).toEqual(sorted);
  });

  test('report contiene 5 modelli', () => {
    const report = buildComparisonReport(rows);
    expect(report.models).toHaveLength(5);
  });

  test('recommendations non è vuoto', () => {
    const report = buildComparisonReport(rows);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  test('generatedAt è una data ISO valida', () => {
    const report = buildComparisonReport(rows);
    expect(() => new Date(report.generatedAt)).not.toThrow();
    expect(new Date(report.generatedAt).getFullYear()).toBeGreaterThan(2020);
  });
});
