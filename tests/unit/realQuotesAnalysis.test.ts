import {
  computeSeasonStats,
  computeRoleStats,
  analyzeHistory,
  avg,
  median,
} from '../../src/analysis/realQuotesAnalysis';
import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';

function makeRow(overrides: Partial<NormalizedQuoteRow> = {}): NormalizedQuoteRow {
  return {
    season: '2022/23',
    seasonStatus: 'completed',
    playerId: 1,
    role: 'A',
    roleExtended: 'W',
    playerName: 'Test Player',
    club: 'Inter',
    initialQuote: 20,
    currentOrFinalQuote: 25,
    quoteDiff: 5,
    quoteReturnPct: 25,
    initialQuoteMantra: 20,
    currentOrFinalQuoteMantra: 25,
    quoteDiffMantra: 5,
    fvm: 26,
    fvmMantra: 27,
    sourceFile: 'test.xlsx',
    ...overrides,
  };
}

// ─── avg / median ─────────────────────────────────────────────────────────────

describe('avg', () => {
  test('media di [10, 20, 30] = 20', () => {
    expect(avg([10, 20, 30])).toBe(20);
  });

  test('media di array vuoto = 0', () => {
    expect(avg([])).toBe(0);
  });

  test('media di un singolo valore = quel valore', () => {
    expect(avg([42])).toBe(42);
  });
});

describe('median', () => {
  test('mediana di [1, 2, 3] = 2', () => {
    expect(median([1, 2, 3])).toBe(2);
  });

  test('mediana di [1, 3, 2, 4] = 2.5', () => {
    expect(median([1, 3, 2, 4])).toBe(2.5);
  });

  test('mediana di array vuoto = 0', () => {
    expect(median([])).toBe(0);
  });
});

// ─── computeSeasonStats ───────────────────────────────────────────────────────

describe('computeSeasonStats', () => {
  const rows = [
    makeRow({ playerId: 1, role: 'A', initialQuote: 10, currentOrFinalQuote: 15, quoteReturnPct: 50 }),
    makeRow({ playerId: 2, role: 'D', initialQuote: 20, currentOrFinalQuote: 18, quoteReturnPct: -10 }),
    makeRow({ playerId: 3, role: 'C', initialQuote: 30, currentOrFinalQuote: 30, quoteReturnPct: 0 }),
    makeRow({ playerId: 4, role: 'P', initialQuote: 8, currentOrFinalQuote: 10, quoteReturnPct: 25 }),
  ];

  let stats: ReturnType<typeof computeSeasonStats>;
  beforeAll(() => { stats = computeSeasonStats(rows); });

  test('season e status corretti', () => {
    expect(stats.season).toBe('2022/23');
    expect(stats.status).toBe('completed');
  });

  test('totalPlayers = numero righe', () => {
    expect(stats.totalPlayers).toBe(4);
  });

  test('avgReturnPct = media dei rendimenti', () => {
    // (50 + -10 + 0 + 25) / 4 = 16.25
    expect(stats.avgReturnPct).toBeCloseTo(16.25, 5);
  });

  test('pctPositive = % righe con return > 0', () => {
    // 2 su 4 → 50%
    expect(stats.pctPositive).toBeCloseTo(50, 5);
  });

  test('pctAbove5 = % righe con return > 5%', () => {
    // 50 e 25 → 2/4 = 50%
    expect(stats.pctAbove5).toBeCloseTo(50, 5);
  });

  test('pctBelow0 = % righe con return < 0', () => {
    // solo -10 → 1/4 = 25%
    expect(stats.pctBelow0).toBeCloseTo(25, 5);
  });

  test('topGainer ha il rendimento più alto', () => {
    expect(stats.topGainer?.quoteReturnPct).toBe(50);
  });

  test('topLoser ha il rendimento più basso', () => {
    expect(stats.topLoser?.quoteReturnPct).toBe(-10);
  });

  test('avgReturnByRole calcolato per ogni ruolo', () => {
    expect(stats.avgReturnByRole['A']).toBeCloseTo(50);
    expect(stats.avgReturnByRole['D']).toBeCloseTo(-10);
    expect(stats.avgReturnByRole['C']).toBeCloseTo(0);
    expect(stats.avgReturnByRole['P']).toBeCloseTo(25);
  });

  test('avgInitialQuote e avgFinalQuote corretti', () => {
    expect(stats.avgInitialQuote).toBeCloseTo((10 + 20 + 30 + 8) / 4, 5);
    expect(stats.avgFinalQuote).toBeCloseTo((15 + 18 + 30 + 10) / 4, 5);
  });
});

// ─── computeSeasonStats — stagione in_progress ────────────────────────────────

describe('computeSeasonStats — stagione in_progress', () => {
  test('status in_progress riportato correttamente', () => {
    const rows = [makeRow({ season: '2025/26', seasonStatus: 'in_progress', quoteReturnPct: 10 })];
    const stats = computeSeasonStats(rows);
    expect(stats.status).toBe('in_progress');
    expect(stats.season).toBe('2025/26');
  });
});

// ─── computeRoleStats ─────────────────────────────────────────────────────────

describe('computeRoleStats', () => {
  const rows = [
    makeRow({ playerId: 1, role: 'P', quoteReturnPct: 10, initialQuote: 10, currentOrFinalQuote: 11 }),
    makeRow({ playerId: 2, role: 'D', quoteReturnPct: 20, initialQuote: 20, currentOrFinalQuote: 24 }),
    makeRow({ playerId: 3, role: 'D', quoteReturnPct: -5, initialQuote: 20, currentOrFinalQuote: 19 }),
    makeRow({ playerId: 4, role: 'C', quoteReturnPct: 0 }),
    makeRow({ playerId: 5, role: 'A', quoteReturnPct: 30 }),
    makeRow({ playerId: 6, role: 'A', quoteReturnPct: -15 }),
  ];

  let roleStats: ReturnType<typeof computeRoleStats>;
  beforeAll(() => { roleStats = computeRoleStats(rows); });

  test('restituisce 4 ruoli: P, D, C, A', () => {
    expect(roleStats.map(r => r.role)).toEqual(['P', 'D', 'C', 'A']);
  });

  test('totalPlayers per ruolo corretto', () => {
    expect(roleStats.find(r => r.role === 'P')?.totalPlayers).toBe(1);
    expect(roleStats.find(r => r.role === 'D')?.totalPlayers).toBe(2);
    expect(roleStats.find(r => r.role === 'A')?.totalPlayers).toBe(2);
  });

  test('avgReturnPct per D = (20 + -5) / 2 = 7.5', () => {
    expect(roleStats.find(r => r.role === 'D')?.avgReturnPct).toBeCloseTo(7.5, 5);
  });

  test('pctPositive per A = 50% (1 positivo su 2)', () => {
    expect(roleStats.find(r => r.role === 'A')?.pctPositive).toBeCloseTo(50, 5);
  });

  test('pctPositive per C = 0% (solo zero, non positivo)', () => {
    expect(roleStats.find(r => r.role === 'C')?.pctPositive).toBe(0);
  });
});

// ─── analyzeHistory ───────────────────────────────────────────────────────────

describe('analyzeHistory', () => {
  const rows2122 = [
    makeRow({ season: '2021/22', seasonStatus: 'completed', playerId: 1, quoteReturnPct: 10 }),
    makeRow({ season: '2021/22', seasonStatus: 'completed', playerId: 2, quoteReturnPct: -5 }),
  ];
  const rows2223 = [
    makeRow({ season: '2022/23', seasonStatus: 'completed', playerId: 3, quoteReturnPct: 20 }),
    makeRow({ season: '2022/23', seasonStatus: 'completed', playerId: 4, quoteReturnPct: 0 }),
    makeRow({ season: '2022/23', seasonStatus: 'completed', playerId: 5, quoteReturnPct: 8 }),
  ];
  const allRows = [...rows2122, ...rows2223];

  let analysis: ReturnType<typeof analyzeHistory>;
  beforeAll(() => { analysis = analyzeHistory(allRows); });

  test('seasons contiene tutte le stagioni uniche ordinate', () => {
    expect(analysis.seasons).toEqual(['2021/22', '2022/23']);
  });

  test('seasonStats ha una voce per stagione', () => {
    expect(analysis.seasonStats).toHaveLength(2);
  });

  test('totalRows = numero totale righe', () => {
    expect(analysis.totalRows).toBe(5);
  });

  test('overallAvgReturnPct = media su tutte le stagioni', () => {
    // (10 + -5 + 20 + 0 + 8) / 5 = 6.6
    expect(analysis.overallAvgReturnPct).toBeCloseTo(6.6, 5);
  });

  test('overallPctPositive = % righe con return > 0', () => {
    // 10, 20, 8 → 3/5 = 60%
    expect(analysis.overallPctPositive).toBeCloseTo(60, 5);
  });

  test('overallPctAbove5 = % righe con return > 5%', () => {
    // 10, 20, 8 → 3/5 = 60%
    expect(analysis.overallPctAbove5).toBeCloseTo(60, 5);
  });

  test('topGainers[0] ha il rendimento massimo', () => {
    expect(analysis.topGainers[0].quoteReturnPct).toBe(20);
  });

  test('topLosers[0] ha il rendimento minimo', () => {
    expect(analysis.topLosers[0].quoteReturnPct).toBe(-5);
  });

  test('topGainers ha al massimo 20 elementi', () => {
    expect(analysis.topGainers.length).toBeLessThanOrEqual(20);
  });

  test('topLosers ha al massimo 20 elementi', () => {
    expect(analysis.topLosers.length).toBeLessThanOrEqual(20);
  });

  test('roleStats ha 4 elementi (P/D/C/A)', () => {
    expect(analysis.roleStats).toHaveLength(4);
  });

  test('generatedAt è una stringa ISO valida', () => {
    expect(() => new Date(analysis.generatedAt)).not.toThrow();
    expect(new Date(analysis.generatedAt).getFullYear()).toBeGreaterThan(2020);
  });
});

// ─── analyzeHistory — dataset vuoto ──────────────────────────────────────────

describe('analyzeHistory — dataset vuoto', () => {
  test('gestisce array vuoto senza eccezioni', () => {
    const analysis = analyzeHistory([]);
    expect(analysis.totalRows).toBe(0);
    expect(analysis.seasons).toHaveLength(0);
    expect(analysis.overallAvgReturnPct).toBe(0);
    expect(analysis.topGainers).toHaveLength(0);
    expect(analysis.topLosers).toHaveLength(0);
  });
});
