import {
  buildPortfolio,
  calculateEffectiveTradingReturnPct,
  runSeasonBacktest,
  runHistoricalBacktest,
  BACKTEST_MODELS,
  DEFAULT_BACKTEST_CONFIG,
  BacktestModel,
  BacktestConfig,
} from '../../src/analysis/historicalPortfolioSimulator';
import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';
import { createSeededRng } from '../../src/utils/randomUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    quoteRawReturnPct: 25,
    quoteTradingReturnPct: 25,
    initialQuoteMantra: 20,
    currentOrFinalQuoteMantra: 25,
    quoteDiffMantra: 5,
    fvm: 26,
    fvmMantra: 27,
    sourceFile: 'test.xlsx',
    ...overrides,
  };
}

/** Genera un set minimo di calciatori per ruolo: 3P + 8D + 8C + 6A = 25 */
function makeMinimalPlayerPool(season = '2022/23', seasonStatus: 'completed' | 'in_progress' = 'completed'): NormalizedQuoteRow[] {
  const rows: NormalizedQuoteRow[] = [];
  let id = 1;
  const add = (role: 'P' | 'D' | 'C' | 'A', count: number, initQ = 10, finalQ = 12) => {
    for (let i = 0; i < count; i++) {
      rows.push(makeRow({ playerId: id++, role, season, seasonStatus, initialQuote: initQ, currentOrFinalQuote: finalQ }));
    }
  };
  add('P', 5,  10, 12);
  add('D', 12, 15, 16);
  add('C', 12, 20, 22);
  add('A', 8,  25, 28);
  return rows;
}

const TEST_COMPOSITION = { P: 3, D: 8, C: 8, A: 6 };
const SMALL_CONFIG: BacktestConfig = {
  numParticipants: 4,
  numSimulations: 5,
  randomSeed: 123,
  rosterComposition: TEST_COMPOSITION,
};

// ─── BACKTEST_MODELS ──────────────────────────────────────────────────────────

describe('BACKTEST_MODELS', () => {
  test('contiene esattamente 5 modelli', () => {
    expect(BACKTEST_MODELS).toHaveLength(5);
  });

  test('ids sono M1–M5', () => {
    expect(BACKTEST_MODELS.map(m => m.id)).toEqual(['M1', 'M2', 'M3', 'M4', 'M5']);
  });

  test('tutti i modelli hanno buyCommissionRate 2%', () => {
    BACKTEST_MODELS.forEach(m => expect(m.buyCommissionRate).toBe(0.02));
  });

  test('tutti i modelli hanno sellCommissionRate 1.25%', () => {
    BACKTEST_MODELS.forEach(m => expect(m.sellCommissionRate).toBe(0.0125));
  });

  test('M1 ha platformFeeRate=0 e prizePoolContributionRate=1', () => {
    const m1 = BACKTEST_MODELS.find(m => m.id === 'M1')!;
    expect(m1.platformFeeRate).toBe(0.0);
    expect(m1.prizePoolContributionRate).toBe(1.0);
    expect(m1.registrationFeePerTeam).toBe(50);
  });

  test('M5 ha platformFeeRate=0.1 e registrationFeePerTeam=10', () => {
    const m5 = BACKTEST_MODELS.find(m => m.id === 'M5')!;
    expect(m5.platformFeeRate).toBe(0.1);
    expect(m5.registrationFeePerTeam).toBe(10);
    expect(m5.registrationFeePlatformRate).toBe(1.0);
  });
});

// ─── DEFAULT_BACKTEST_CONFIG ──────────────────────────────────────────────────

describe('DEFAULT_BACKTEST_CONFIG', () => {
  test('numParticipants=20, numSimulations=200', () => {
    expect(DEFAULT_BACKTEST_CONFIG.numParticipants).toBe(20);
    expect(DEFAULT_BACKTEST_CONFIG.numSimulations).toBe(200);
  });

  test('composizione rosa 3P+8D+8C+6A', () => {
    expect(DEFAULT_BACKTEST_CONFIG.rosterComposition).toEqual({ P: 3, D: 8, C: 8, A: 6 });
  });
});

// ─── buildPortfolio ───────────────────────────────────────────────────────────

describe('buildPortfolio', () => {
  const players = makeMinimalPlayerPool();
  const playersByRole: Record<string, NormalizedQuoteRow[]> = {};
  for (const p of players) {
    if (!playersByRole[p.role]) playersByRole[p.role] = [];
    playersByRole[p.role].push(p);
  }
  const rng = createSeededRng(42);

  let portfolio: ReturnType<typeof buildPortfolio>;
  beforeAll(() => { portfolio = buildPortfolio(playersByRole, TEST_COMPOSITION, rng); });

  test('selezione esattamente 25 calciatori (3+8+8+6)', () => {
    expect(portfolio.playerIds).toHaveLength(25);
  });

  test('nessun calciatore selezionato due volte', () => {
    const ids = portfolio.playerIds;
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('buyCost > 0', () => {
    expect(portfolio.buyCost).toBeGreaterThan(0);
  });

  test('sellProceeds > 0', () => {
    expect(portfolio.sellProceeds).toBeGreaterThan(0);
  });

  test('buyCommissions = initialQuote × 2% × 25', () => {
    // Tutti hanno initialQuote=10/15/20/25 a seconda del ruolo
    expect(portfolio.buyCommissions).toBeGreaterThan(0);
  });

  test('tradingPnL = sellProceeds − buyCost', () => {
    expect(portfolio.tradingPnL).toBeCloseTo(portfolio.sellProceeds - portfolio.buyCost, 5);
  });

  test('tradingROI = tradingPnL / buyCost × 100', () => {
    const expectedROI = (portfolio.tradingPnL / portfolio.buyCost) * 100;
    expect(portfolio.tradingROI).toBeCloseTo(expectedROI, 5);
  });

  test('commissioni acquisto = initialQuote × 2% per ogni calciatore', () => {
    // Con initialQuotes noti, possiamo verificare che le commissioni siano nel range atteso
    expect(portfolio.buyCommissions).toBeGreaterThan(0);
    expect(portfolio.sellCommissions).toBeGreaterThan(0);
  });

  test('giocatori con finalQuote > initialQuote danno tradingPnL > 0 (se tutti', () => {
    // Tutti i giocatori in makeMinimalPlayerPool hanno finalQuote > initialQuote
    // Quindi tradingPnL deve essere > 0
    expect(portfolio.tradingPnL).toBeGreaterThan(0);
  });
});

// ─── buildPortfolio — commissioni esatte ─────────────────────────────────────

describe('buildPortfolio — commissioni esatte con un solo calciatore per ruolo', () => {
  test.each([
    [1, 2, 5],
    [1, 3, 10],
    [34, 35, 5],
    [34, 33, -5],
    [20, 25, 25],
  ])('rendimento FantaTrading effettivo: %s -> %s = %s%%', (initialQuote, finalQuote, expected) => {
    expect(calculateEffectiveTradingReturnPct(finalQuote, initialQuote)).toEqual({
      raw: expected,
      effective: expected,
    });
  });

  test('26 -> 1: rendimento teorico -125%, rendimento applicato -100%, sellValue = 0', () => {
    const result = calculateEffectiveTradingReturnPct(1, 26);
    expect(result.raw).toBe(-125);
    expect(result.effective).toBe(-100);

    const pool: Record<string, NormalizedQuoteRow[]> = {
      A: [makeRow({ playerId: 1, role: 'A', initialQuote: 26, currentOrFinalQuote: 1 })],
    };
    const p = buildPortfolio(pool, { A: 1 }, createSeededRng(1));
    expect(p.sellProceeds).toBe(0);
    expect(p.sellCommissions).toBe(0);
  });

  test.each([
    [26, 1],
    [50, 1],
    [100, 0],
  ])('nessun caso produce sellValue negativo: %s -> %s', (initialQuote, finalQuote) => {
    const pool: Record<string, NormalizedQuoteRow[]> = {
      A: [makeRow({ playerId: 1, role: 'A', initialQuote, currentOrFinalQuote: finalQuote })],
    };
    const p = buildPortfolio(pool, { A: 1 }, createSeededRng(1));
    expect(p.sellProceeds).toBeGreaterThanOrEqual(0);
    expect(p.sellCommissions).toBeGreaterThanOrEqual(0);
  });

  test('commissioni calcolate correttamente con formula FantaTrading (1 punto = 5%)', () => {
    // P:  Qt.I=100, Qt.A=120 → tradingRetPct=(120-100)*5=100% → sellValue=100*(1+1.00)=200
    // D:  Qt.I=50,  Qt.A=60  → tradingRetPct=(60-50)*5=50%   → sellValue=50*(1+0.50)=75
    // C:  Qt.I=80,  Qt.A=80  → tradingRetPct=0%               → sellValue=80
    // A:  Qt.I=40,  Qt.A=30  → tradingRetPct=(30-40)*5=-50%  → sellValue=40*(1-0.50)=20
    const singlePlayerPool: Record<string, NormalizedQuoteRow[]> = {
      P: [makeRow({ playerId: 1, role: 'P', initialQuote: 100, currentOrFinalQuote: 120 })],
      D: [makeRow({ playerId: 2, role: 'D', initialQuote: 50, currentOrFinalQuote: 60 })],
      C: [makeRow({ playerId: 3, role: 'C', initialQuote: 80, currentOrFinalQuote: 80 })],
      A: [makeRow({ playerId: 4, role: 'A', initialQuote: 40, currentOrFinalQuote: 30 })],
    };
    const singleComposition = { P: 1, D: 1, C: 1, A: 1 };
    const rng = createSeededRng(1);
    const p = buildPortfolio(singlePlayerPool, singleComposition, rng);

    // buyComms = 100×0.02 + 50×0.02 + 80×0.02 + 40×0.02 = 2+1+1.6+0.8 = 5.4 (invariato)
    expect(p.buyCommissions).toBeCloseTo(5.4, 5);

    // buyCost = (100+2) + (50+1) + (80+1.6) + (40+0.8) = 275.4 (invariato)
    expect(p.buyCost).toBeCloseTo(275.4, 5);

    // sellComms su sellValue (non su Qt.A): 200×0.0125 + 75×0.0125 + 80×0.0125 + 20×0.0125
    //   = 2.5 + 0.9375 + 1.0 + 0.25 = 4.6875
    expect(p.sellCommissions).toBeCloseTo(4.6875, 5);

    // sellProceeds = (200-2.5) + (75-0.9375) + (80-1) + (20-0.25) = 370.3125
    expect(p.sellProceeds).toBeCloseTo(370.3125, 5);
  });

  // ── Verifica regola FantaTrading con esempi obbligatori ───────────────────

  test('regola FantaTrading: Qt.I 34 → Qt.A 35 = sellValue aumenta del 5%', () => {
    const pool: Record<string, NormalizedQuoteRow[]> = {
      P: [makeRow({ playerId: 1, role: 'P', initialQuote: 34, currentOrFinalQuote: 35 })],
      D: Array.from({ length: 8 }, (_, i) => makeRow({ playerId: 10 + i, role: 'D', initialQuote: 20, currentOrFinalQuote: 20 })),
      C: Array.from({ length: 8 }, (_, i) => makeRow({ playerId: 20 + i, role: 'C', initialQuote: 20, currentOrFinalQuote: 20 })),
      A: Array.from({ length: 6 }, (_, i) => makeRow({ playerId: 30 + i, role: 'A', initialQuote: 20, currentOrFinalQuote: 20 })),
    };
    const comp = { P: 1, D: 8, C: 8, A: 6 };
    const p = buildPortfolio(pool, comp, createSeededRng(1));
    // P: sellValue = 34*(1+0.05) = 35.7; altri: sellValue = 20 (invariato)
    // Il sellProceeds del portiere riflette +5% rispetto al 34 iniziale
    const pSell = 34 * 1.05 * (1 - 0.0125); // 34*1.05*(1-1.25%)
    const restSell = (8 + 8 + 6) * 20 * (1 - 0.0125);
    expect(p.sellProceeds).toBeCloseTo(pSell + restSell, 3);
  });

  test('regola FantaTrading: Qt.I 1 → Qt.A 2 = sellValue aumenta del 5% (non del 100%)', () => {
    const pool: Record<string, NormalizedQuoteRow[]> = {
      P: [makeRow({ playerId: 1, role: 'P', initialQuote: 1, currentOrFinalQuote: 2 })],
      D: Array.from({ length: 8 }, (_, i) => makeRow({ playerId: 10 + i, role: 'D', initialQuote: 20, currentOrFinalQuote: 20 })),
      C: Array.from({ length: 8 }, (_, i) => makeRow({ playerId: 20 + i, role: 'C', initialQuote: 20, currentOrFinalQuote: 20 })),
      A: Array.from({ length: 6 }, (_, i) => makeRow({ playerId: 30 + i, role: 'A', initialQuote: 20, currentOrFinalQuote: 20 })),
    };
    const comp = { P: 1, D: 8, C: 8, A: 6 };
    const p = buildPortfolio(pool, comp, createSeededRng(1));
    // P: sellValue = 1*(1+0.05) = 1.05 (NON 2, che sarebbe il 100%)
    const pSell = 1 * 1.05 * (1 - 0.0125);
    const restSell = (8 + 8 + 6) * 20 * (1 - 0.0125);
    expect(p.sellProceeds).toBeCloseTo(pSell + restSell, 3);
  });
});

// ─── buildPortfolio — errori ──────────────────────────────────────────────────

describe('buildPortfolio — errori', () => {
  test('lancia errore se calciatori insufficienti per un ruolo', () => {
    const tooFew: Record<string, NormalizedQuoteRow[]> = {
      P: [makeRow({ role: 'P', playerId: 1 })],  // solo 1, richiede 3
      D: Array.from({ length: 8 }, (_, i) => makeRow({ role: 'D', playerId: 100 + i })),
      C: Array.from({ length: 8 }, (_, i) => makeRow({ role: 'C', playerId: 200 + i })),
      A: Array.from({ length: 6 }, (_, i) => makeRow({ role: 'A', playerId: 300 + i })),
    };
    expect(() => buildPortfolio(tooFew, TEST_COMPOSITION, createSeededRng(1))).toThrow();
  });
});

// ─── runSeasonBacktest ────────────────────────────────────────────────────────

describe('runSeasonBacktest', () => {
  const seasonRows = makeMinimalPlayerPool('2022/23', 'completed');
  let results: ReturnType<typeof runSeasonBacktest>;
  beforeAll(() => { results = runSeasonBacktest(seasonRows, BACKTEST_MODELS, SMALL_CONFIG); });

  test('restituisce un risultato per ogni modello', () => {
    expect(results).toHaveLength(BACKTEST_MODELS.length);
  });

  test('tutti i risultati hanno season e seasonStatus corretti', () => {
    results.forEach(r => {
      expect(r.season).toBe('2022/23');
      expect(r.seasonStatus).toBe('completed');
    });
  });

  test('numParticipants e numSimulations rispecchiano la config', () => {
    results.forEach(r => {
      expect(r.numParticipants).toBe(SMALL_CONFIG.numParticipants);
      expect(r.numSimulations).toBe(SMALL_CONFIG.numSimulations);
    });
  });

  test('ROI di trading è identico per tutti i modelli (stesse commissioni)', () => {
    const rois = results.map(r => r.avgTradingROI);
    const first = rois[0];
    rois.forEach(roi => expect(roi).toBeCloseTo(first, 5));
  });

  test('avgBuyCost > 0 per tutti i modelli', () => {
    results.forEach(r => expect(r.avgBuyCost).toBeGreaterThan(0));
  });

  test('M1 ha avgPlatformRevenue = 0 (nessun margine)', () => {
    const m1 = results.find(r => r.modelId === 'M1')!;
    expect(m1.avgPlatformRevenue).toBeCloseTo(0, 1);
  });

  test('M2 ha avgPlatformRevenue > M1', () => {
    const m1 = results.find(r => r.modelId === 'M1')!;
    const m2 = results.find(r => r.modelId === 'M2')!;
    expect(m2.avgPlatformRevenue).toBeGreaterThan(m1.avgPlatformRevenue);
  });

  test('avgPrizePool è maggiore per M1 che per M3 (M1 ha tutto al montepremi)', () => {
    const m1 = results.find(r => r.modelId === 'M1')!;
    const m3 = results.find(r => r.modelId === 'M3')!;
    expect(m1.avgPrizePool).toBeGreaterThan(m3.avgPrizePool);
  });

  test('pctPositiveTradingROI è in [0, 100]', () => {
    results.forEach(r => {
      expect(r.pctPositiveTradingROI).toBeGreaterThanOrEqual(0);
      expect(r.pctPositiveTradingROI).toBeLessThanOrEqual(100);
    });
  });

  test('avgWinnerTotalROI > avgTotalROI (il vincitore guadagna più della media)', () => {
    results.forEach(r => {
      expect(r.avgWinnerTotalROI).toBeGreaterThan(r.avgTotalROI);
    });
  });
});

// ─── runSeasonBacktest — playersByRole con initialQuote=0 ─────────────────────

describe('runSeasonBacktest — esclude giocatori con initialQuote=0', () => {
  test('righe con initialQuote=0 vengono ignorate senza errori', () => {
    const rows = makeMinimalPlayerPool();
    // Aggiunge righe invalide con initialQuote=0
    rows.push(makeRow({ playerId: 999, role: 'A', initialQuote: 0, currentOrFinalQuote: 10 }));
    expect(() => runSeasonBacktest(rows, BACKTEST_MODELS, SMALL_CONFIG)).not.toThrow();
  });
});

// ─── runSeasonBacktest — stagione in_progress ─────────────────────────────────

describe('runSeasonBacktest — stagione in_progress', () => {
  test('funziona anche con stagione in_progress', () => {
    const rows = makeMinimalPlayerPool('2025/26', 'in_progress');
    const results = runSeasonBacktest(rows, BACKTEST_MODELS, SMALL_CONFIG);
    expect(results[0].seasonStatus).toBe('in_progress');
    expect(results[0].season).toBe('2025/26');
  });
});

// ─── runHistoricalBacktest ────────────────────────────────────────────────────

describe('runHistoricalBacktest', () => {
  const season1 = makeMinimalPlayerPool('2021/22', 'completed');
  const season2 = makeMinimalPlayerPool('2022/23', 'completed');
  const allRows = [...season1, ...season2];

  let report: ReturnType<typeof runHistoricalBacktest>;
  beforeAll(() => { report = runHistoricalBacktest(allRows, SMALL_CONFIG); });

  test('completedSeasons ha (numSeasons × numModels) elementi', () => {
    expect(report.completedSeasons).toHaveLength(2 * BACKTEST_MODELS.length);
  });

  test('inProgressStats è null se nessuna stagione in corso', () => {
    expect(report.inProgressStats).toBeNull();
  });

  test('aggregateByModel ha un elemento per modello', () => {
    expect(report.aggregateByModel).toHaveLength(BACKTEST_MODELS.length);
  });

  test('aggregateByModel.numSeasons = 2 per ogni modello', () => {
    report.aggregateByModel.forEach(agg => expect(agg.numSeasons).toBe(2));
  });

  test('config salvata nel report', () => {
    expect(report.config).toEqual(SMALL_CONFIG);
  });

  test('generatedAt è una data ISO valida', () => {
    expect(new Date(report.generatedAt).getFullYear()).toBeGreaterThan(2020);
  });

  test('seasonAvgTradingROIs contiene entrambe le stagioni per ogni modello', () => {
    report.aggregateByModel.forEach(agg => {
      expect(Object.keys(agg.seasonAvgTradingROIs)).toContain('2021/22');
      expect(Object.keys(agg.seasonAvgTradingROIs)).toContain('2022/23');
    });
  });
});

// ─── runHistoricalBacktest — con stagione in_progress ─────────────────────────

describe('runHistoricalBacktest — con stagione in_progress', () => {
  test('inProgressStats non è null se ci sono righe in_progress', () => {
    const completed = makeMinimalPlayerPool('2022/23', 'completed');
    const inProgress = makeMinimalPlayerPool('2025/26', 'in_progress');
    const report = runHistoricalBacktest([...completed, ...inProgress], SMALL_CONFIG);
    expect(report.inProgressStats).not.toBeNull();
    expect(report.inProgressStats!.length).toBeGreaterThan(0);
    expect(report.inProgressStats![0].season).toBe('2025/26');
  });

  test('aggregateByModel usa solo stagioni completed', () => {
    const completed = makeMinimalPlayerPool('2022/23', 'completed');
    const inProgress = makeMinimalPlayerPool('2025/26', 'in_progress');
    const report = runHistoricalBacktest([...completed, ...inProgress], SMALL_CONFIG);
    report.aggregateByModel.forEach(agg => {
      expect(agg.numSeasons).toBe(1);
      expect(Object.keys(agg.seasonAvgTradingROIs)).toContain('2022/23');
      expect(Object.keys(agg.seasonAvgTradingROIs)).not.toContain('2025/26');
    });
  });
});

// ─── runHistoricalBacktest — dataset vuoto ────────────────────────────────────

describe('runHistoricalBacktest — dataset vuoto', () => {
  test('restituisce report vuoto senza eccezioni', () => {
    const report = runHistoricalBacktest([], SMALL_CONFIG);
    expect(report.completedSeasons).toHaveLength(0);
    expect(report.inProgressStats).toBeNull();
    expect(report.aggregateByModel.every(agg => agg.numSeasons === 0)).toBe(true);
  });
});

// ─── runHistoricalBacktest — callback onProgress ──────────────────────────────

describe('runHistoricalBacktest — callback onProgress', () => {
  test('chiama onProgress una volta per stagione completata', () => {
    const season1 = makeMinimalPlayerPool('2020/21', 'completed');
    const season2 = makeMinimalPlayerPool('2021/22', 'completed');
    const calls: string[] = [];
    runHistoricalBacktest([...season1, ...season2], SMALL_CONFIG, BACKTEST_MODELS, (s) => {
      calls.push(s);
    });
    expect(calls).toContain('2020/21');
    expect(calls).toContain('2021/22');
    expect(calls).toHaveLength(2);
  });
});

// ─── Determinismo con stesso seed ─────────────────────────────────────────────

describe('determinismo', () => {
  test('due run con stesso seed producono risultati identici', () => {
    const rows = makeMinimalPlayerPool('2022/23', 'completed');
    const r1 = runSeasonBacktest(rows, [BACKTEST_MODELS[0]], { ...SMALL_CONFIG, numSimulations: 3 });
    const r2 = runSeasonBacktest(rows, [BACKTEST_MODELS[0]], { ...SMALL_CONFIG, numSimulations: 3 });
    expect(r1[0].avgTradingROI).toBe(r2[0].avgTradingROI);
    expect(r1[0].avgPrizePool).toBe(r2[0].avgPrizePool);
  });

  test('seed diversi producono risultati diversi (pool con prezzi variati)', () => {
    // Crea pool con prezzi diversi per ogni giocatore così i seed producono ROI diversi
    let id = 1;
    const variedRows: NormalizedQuoteRow[] = [];
    for (let i = 0; i < 5; i++)
      variedRows.push(makeRow({ playerId: id++, role: 'P', initialQuote: 5 + i * 3, currentOrFinalQuote: 6 + i * 4 }));
    for (let i = 0; i < 12; i++)
      variedRows.push(makeRow({ playerId: id++, role: 'D', initialQuote: 10 + i * 2, currentOrFinalQuote: 8 + i * 3 }));
    for (let i = 0; i < 12; i++)
      variedRows.push(makeRow({ playerId: id++, role: 'C', initialQuote: 15 + i * 3, currentOrFinalQuote: 20 + i * 2 }));
    for (let i = 0; i < 8; i++)
      variedRows.push(makeRow({ playerId: id++, role: 'A', initialQuote: 20 + i * 5, currentOrFinalQuote: 25 + i * 3 }));
    const r1 = runSeasonBacktest(variedRows, [BACKTEST_MODELS[0]], { ...SMALL_CONFIG, randomSeed: 1, numSimulations: 20 });
    const r2 = runSeasonBacktest(variedRows, [BACKTEST_MODELS[0]], { ...SMALL_CONFIG, randomSeed: 9999, numSimulations: 20 });
    expect(r1[0].avgTradingROI).not.toBe(r2[0].avgTradingROI);
  });
});
