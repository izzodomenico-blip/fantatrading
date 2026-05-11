import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';
import { createSeededRng } from '../../src/utils/randomUtils';
import { calculateEffectiveTradingReturnPct } from '../../src/analysis/historicalPortfolioSimulator';
import {
  buildHistoricalProfileScores,
  buildHistoricalStrategyCsv,
  buildHistoricalStrategyMarkdown,
  buildStrategyPortfolio,
  evaluatePortfolio,
  runHistoricalStrategyBacktest,
  STRATEGIES,
  StrategyId,
} from '../../src/analysis/historicalStrategyBacktest';

function makeRow(overrides: Partial<NormalizedQuoteRow> = {}): NormalizedQuoteRow {
  return {
    season: '2021/22',
    seasonStatus: 'completed',
    playerId: 1,
    role: 'A',
    roleExtended: 'W',
    playerName: 'Player',
    club: 'Club',
    initialQuote: 10,
    currentOrFinalQuote: 10,
    quoteDiff: 0,
    quoteRawReturnPct: 0,
    quoteTradingReturnPct: 0,
    initialQuoteMantra: 10,
    currentOrFinalQuoteMantra: 10,
    quoteDiffMantra: 0,
    fvm: 10,
    fvmMantra: 10,
    sourceFile: 'test.xlsx',
    ...overrides,
  };
}

function makeSeason(season: string, startId: number, delta = 0): NormalizedQuoteRow[] {
  const rows: NormalizedQuoteRow[] = [];
  let id = startId;
  const add = (role: 'P' | 'D' | 'C' | 'A', count: number, baseQuote: number) => {
    for (let i = 0; i < count; i++) {
      rows.push(makeRow({
        season,
        playerId: id++,
        role,
        playerName: `${role}${i}`,
        initialQuote: baseQuote + i,
        currentOrFinalQuote: Math.max(0, baseQuote + i + delta + (i % 3) - 1),
      }));
    }
  };
  add('P', 6, 4);
  add('D', 14, 5);
  add('C', 14, 8);
  add('A', 10, 12);
  return rows;
}

function countRoles(rows: NormalizedQuoteRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.role] = (acc[row.role] ?? 0) + 1;
    return acc;
  }, {});
}

describe('historicalStrategyBacktest — generazione rose', () => {
  const seasonRows = makeSeason('2021/22', 1, 1);

  test.each(STRATEGIES)('%s genera rosa valida 3P/8D/8C/6A', (strategy: StrategyId) => {
    const portfolio = buildStrategyPortfolio(seasonRows, strategy, createSeededRng(42), seasonRows);
    expect(portfolio).toHaveLength(25);
    expect(countRoles(portfolio)).toMatchObject({ P: 3, D: 8, C: 8, A: 6 });
    expect(new Set(portfolio.map(p => p.playerId)).size).toBe(25);
  });
});

describe('historicalStrategyBacktest — no future leakage', () => {
  test('HISTORICAL_MOMENTUM non usa dati futuri della stagione target', () => {
    const previous = [
      makeRow({ season: '2019/20', playerId: 1, playerName: 'Known', role: 'A', initialQuote: 10, currentOrFinalQuote: 12 }),
    ];
    const future = [
      makeRow({ season: '2022/23', playerId: 2, playerName: 'FutureOnly', role: 'A', initialQuote: 10, currentOrFinalQuote: 30 }),
    ];
    const scores = buildHistoricalProfileScores([...previous, ...future], '2021/22');
    expect(scores.has('player:known')).toBe(true);
    expect(scores.has('player:futureonly')).toBe(false);
  });
});

describe('historicalStrategyBacktest — formula FantaTrading', () => {
  test.each([
    [1, 2, 5],
    [1, 3, 10],
    [34, 35, 5],
    [34, 33, -5],
    [20, 25, 25],
  ])('quote step return: %s -> %s = %s%%', (initialQuote, finalQuote, expected) => {
    expect(calculateEffectiveTradingReturnPct(finalQuote, initialQuote)).toEqual({
      raw: expected,
      effective: expected,
    });
  });

  test('sellValue mai negativo con rendimento sotto -100%', () => {
    const portfolio = [makeRow({ playerId: 1, role: 'A', initialQuote: 26, currentOrFinalQuote: 1 })];
    const result = evaluatePortfolio(portfolio, 'VALUE', '2021/22');
    expect(calculateEffectiveTradingReturnPct(1, 26)).toEqual({ raw: -125, effective: -100 });
    expect(result.finalValue).toBe(0);
    expect(result.roiPct).toBeGreaterThanOrEqual(-100);
  });
});

describe('historicalStrategyBacktest — report output', () => {
  test('genera report markdown, csv e json serializzabile', () => {
    const rows = [
      ...makeSeason('2019/20', 1, 0),
      ...makeSeason('2020/21', 1000, 1),
    ];
    const report = runHistoricalStrategyBacktest(rows, { numSimulations: 5, randomSeed: 7 });
    const markdown = buildHistoricalStrategyMarkdown(report);
    const csv = buildHistoricalStrategyCsv(report);
    const json = JSON.stringify(report);

    expect(markdown).toContain('Classifica strategie per ROI medio');
    expect(markdown).toContain('Analisi per ruolo');
    expect(csv.headers).toContain('randomDeltaROI');
    expect(csv.rows.length).toBeGreaterThan(0);
    expect(json).toContain('aggregateStats');
  });
});
