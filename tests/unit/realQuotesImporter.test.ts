import {
  detectSeason,
  getSeasonStatus,
  normalizeRow,
  toNum,
  NormalizedQuoteRow,
} from '../../src/importers/realQuotesImporter';

// ─── detectSeason ─────────────────────────────────────────────────────────────

describe('detectSeason', () => {
  test('riconosce pattern YYYY_YY (es. quotazioni_2019_20.xlsx)', () => {
    expect(detectSeason('quotazioni_2019_20.xlsx')).toBe('2019/20');
  });

  test('riconosce pattern YYYY-YY', () => {
    expect(detectSeason('fantacalcio-2020-21.xlsx')).toBe('2020/21');
  });

  test('riconosce pattern YYYY_YYYY', () => {
    expect(detectSeason('quotes_2021_2022.xlsx')).toBe('2021/22');
  });

  test('riconosce pattern YYYY-YYYY', () => {
    expect(detectSeason('Fantacalcio-2022-2023.xlsx')).toBe('2022/23');
  });

  test('funziona senza estensione', () => {
    expect(detectSeason('quotazioni_2023_24')).toBe('2023/24');
  });

  test('stagione 2024/25', () => {
    expect(detectSeason('quotazioni_2024_25.xlsx')).toBe('2024/25');
  });

  test('stagione 2025/26 (in_progress)', () => {
    expect(detectSeason('quotazioni_2025_26.xlsx')).toBe('2025/26');
  });

  test('restituisce null per file senza anno riconoscibile', () => {
    expect(detectSeason('dati.xlsx')).toBeNull();
    expect(detectSeason('report.xlsx')).toBeNull();
  });

  test('ignora anni non consecutivi (non una stagione calcistica)', () => {
    // 2019_21 non è una stagione valida (anno non consecutivo)
    expect(detectSeason('dati_2019_21.xlsx')).toBeNull();
  });
});

// ─── getSeasonStatus ──────────────────────────────────────────────────────────

describe('getSeasonStatus', () => {
  const completed = ['2019/20', '2020/21', '2021/22', '2022/23', '2023/24', '2024/25'];
  test.each(completed)('stagione %s è completed', (season) => {
    expect(getSeasonStatus(season)).toBe('completed');
  });

  test('2025/26 è in_progress', () => {
    expect(getSeasonStatus('2025/26')).toBe('in_progress');
  });

  test('stagione futura sconosciuta → in_progress (default)', () => {
    expect(getSeasonStatus('2026/27')).toBe('in_progress');
  });
});

// ─── toNum ────────────────────────────────────────────────────────────────────

describe('toNum', () => {
  test('converte numero intero', () => {
    expect(toNum(42)).toBe(42);
  });

  test('converte stringa numerica', () => {
    expect(toNum('15')).toBe(15);
  });

  test('converte stringa con virgola decimale', () => {
    expect(toNum('10,5')).toBeCloseTo(10.5);
  });

  test('restituisce 0 per stringa vuota', () => {
    expect(toNum('')).toBe(0);
  });

  test('restituisce 0 per null/undefined', () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
  });

  test('restituisce 0 per NaN', () => {
    expect(toNum('abc')).toBe(0);
  });
});

// ─── normalizeRow ─────────────────────────────────────────────────────────────

describe('normalizeRow', () => {
  const season = '2022/23';
  const sourceFile = 'quotazioni_2022_23.xlsx';

  function makeRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      Id: '123',
      R: 'A',
      RM: 'W',
      Nome: 'Mario Rossi',
      Squadra: 'Inter',
      'Qt.I': '25',
      'Qt.A': '30',
      'Diff.': '5',
      'Qt.I M': '28',
      'Qt.A M': '32',
      'Diff.M': '4',
      FVM: '31',
      'FVM M': '33',
      ...overrides,
    };
  }

  test('normalizza correttamente una riga valida', () => {
    const row = normalizeRow(makeRaw(), season, sourceFile);
    expect(row.season).toBe('2022/23');
    expect(row.seasonStatus).toBe('completed');
    expect(row.playerId).toBe(123);
    expect(row.role).toBe('A');
    expect(row.roleExtended).toBe('W');
    expect(row.playerName).toBe('Mario Rossi');
    expect(row.club).toBe('Inter');
    expect(row.initialQuote).toBe(25);
    expect(row.currentOrFinalQuote).toBe(30);
    expect(row.quoteDiff).toBe(5);
    expect(row.sourceFile).toBe(sourceFile);
  });

  test('quoteRawReturnPct = (Qt.A - Qt.I) / Qt.I * 100', () => {
    const row = normalizeRow(makeRaw({ 'Qt.I': '20', 'Qt.A': '25' }), season, sourceFile);
    expect(row.quoteRawReturnPct).toBeCloseTo(25.0, 5);
  });

  test('quoteRawReturnPct negativo quando Qt.A < Qt.I', () => {
    const row = normalizeRow(makeRaw({ 'Qt.I': '40', 'Qt.A': '30' }), season, sourceFile);
    expect(row.quoteRawReturnPct).toBeCloseTo(-25.0, 5);
  });

  test('quoteRawReturnPct = 0 quando Qt.I = 0 (evita divisione per zero)', () => {
    const row = normalizeRow(makeRaw({ 'Qt.I': '0', 'Qt.A': '15' }), season, sourceFile);
    expect(row.quoteRawReturnPct).toBe(0);
  });

  // ── Rendimento FantaTrading: ogni punto quotazione = 5% ────────────────────

  test('quoteTradingReturnPct: Qt.I 34 → Qt.A 35 = +5%', () => {
    const row = normalizeRow(makeRaw({ 'Qt.I': '34', 'Qt.A': '35' }), season, sourceFile);
    expect(row.quoteTradingReturnPct).toBeCloseTo(5, 5);
  });

  test('quoteTradingReturnPct: Qt.I 34 → Qt.A 33 = −5%', () => {
    const row = normalizeRow(makeRaw({ 'Qt.I': '34', 'Qt.A': '33' }), season, sourceFile);
    expect(row.quoteTradingReturnPct).toBeCloseTo(-5, 5);
  });

  test('quoteTradingReturnPct: Qt.I 1 → Qt.A 2 = +5% (non +100%)', () => {
    const row = normalizeRow(makeRaw({ 'Qt.I': '1', 'Qt.A': '2' }), season, sourceFile);
    expect(row.quoteTradingReturnPct).toBeCloseTo(5, 5);
    // Verifica che NON sia il valore classico +100%
    expect(row.quoteTradingReturnPct).not.toBeCloseTo(100, 1);
  });

  test('quoteTradingReturnPct: Qt.I 1 → Qt.A 3 = +10% (non +200%)', () => {
    const row = normalizeRow(makeRaw({ 'Qt.I': '1', 'Qt.A': '3' }), season, sourceFile);
    expect(row.quoteTradingReturnPct).toBeCloseTo(10, 5);
    expect(row.quoteTradingReturnPct).not.toBeCloseTo(200, 1);
  });

  test('quoteTradingReturnPct: Qt.I 20 → Qt.A 25 = +25%', () => {
    const row = normalizeRow(makeRaw({ 'Qt.I': '20', 'Qt.A': '25' }), season, sourceFile);
    expect(row.quoteTradingReturnPct).toBeCloseTo(25, 5);
  });

  test('quoteTradingReturnPct = 0 quando Qt.A = Qt.I (nessuna variazione)', () => {
    const row = normalizeRow(makeRaw({ 'Qt.I': '20', 'Qt.A': '20' }), season, sourceFile);
    expect(row.quoteTradingReturnPct).toBe(0);
  });

  test('normalizza tutti i ruoli P/D/C/A', () => {
    for (const role of ['P', 'D', 'C', 'A']) {
      const row = normalizeRow(makeRaw({ R: role }), season, sourceFile);
      expect(row.role).toBe(role);
    }
  });

  test('season 2025/26 → seasonStatus in_progress', () => {
    const row = normalizeRow(makeRaw(), '2025/26', sourceFile);
    expect(row.seasonStatus).toBe('in_progress');
  });

  test('campi Mantra e FVM correttamente mappati', () => {
    const row = normalizeRow(makeRaw(), season, sourceFile);
    expect(row.initialQuoteMantra).toBe(28);
    expect(row.currentOrFinalQuoteMantra).toBe(32);
    expect(row.quoteDiffMantra).toBe(4);
    expect(row.fvm).toBe(31);
    expect(row.fvmMantra).toBe(33);
  });

  test('stringhe vuote per campi testuali mancanti diventano stringa vuota', () => {
    const row = normalizeRow(makeRaw({ Nome: '', Squadra: '' }), season, sourceFile);
    expect(row.playerName).toBe('');
    expect(row.club).toBe('');
  });
});

// ─── Invarianti del risultato ─────────────────────────────────────────────────

describe('normalizeRow — invarianti', () => {
  test('sourceFile è il basename del file sorgente', () => {
    const row = normalizeRow({ Id: 1, R: 'D', RM: 'Dc', Nome: 'Test', Squadra: 'AC Milan', 'Qt.I': 10, 'Qt.A': 10, 'Diff.': 0, 'Qt.I M': 10, 'Qt.A M': 10, 'Diff.M': 0, FVM: 10, 'FVM M': 10 }, '2021/22', 'myfile.xlsx');
    expect(row.sourceFile).toBe('myfile.xlsx');
  });

  test('tipo ritorno è NormalizedQuoteRow con tutti i campi', () => {
    const row: NormalizedQuoteRow = normalizeRow({ Id: 5, R: 'C', RM: 'T', Nome: 'X', Squadra: 'Y', 'Qt.I': 8, 'Qt.A': 8, 'Diff.': 0, 'Qt.I M': 8, 'Qt.A M': 8, 'Diff.M': 0, FVM: 8, 'FVM M': 8 }, '2023/24', 'f.xlsx');
    const keys: Array<keyof NormalizedQuoteRow> = ['season', 'seasonStatus', 'playerId', 'role', 'roleExtended', 'playerName', 'club', 'initialQuote', 'currentOrFinalQuote', 'quoteDiff', 'quoteRawReturnPct', 'quoteTradingReturnPct', 'initialQuoteMantra', 'currentOrFinalQuoteMantra', 'quoteDiffMantra', 'fvm', 'fvmMantra', 'sourceFile'];
    for (const key of keys) {
      expect(row).toHaveProperty(key);
    }
  });
});
