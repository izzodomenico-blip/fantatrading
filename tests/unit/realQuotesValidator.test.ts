import { validateRows } from '../../src/importers/realQuotesValidator';
import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';

function makeRow(overrides: Partial<NormalizedQuoteRow> = {}): NormalizedQuoteRow {
  return {
    season: '2022/23',
    seasonStatus: 'completed',
    playerId: 100,
    role: 'A',
    roleExtended: 'W',
    playerName: 'Mario Rossi',
    club: 'Inter',
    initialQuote: 25,
    currentOrFinalQuote: 30,
    quoteDiff: 5,
    quoteReturnPct: 20,
    initialQuoteMantra: 28,
    currentOrFinalQuoteMantra: 32,
    quoteDiffMantra: 4,
    fvm: 31,
    fvmMantra: 33,
    sourceFile: 'test.xlsx',
    ...overrides,
  };
}

// ─── Dataset valido ───────────────────────────────────────────────────────────

describe('validateRows — dataset valido', () => {
  test('nessun errore su dati corretti', () => {
    const rows = [makeRow(), makeRow({ playerId: 101, playerName: 'Luigi Bianchi' })];
    const result = validateRows(rows);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('totalRows e validRows concordano per dataset pulito', () => {
    const rows = Array.from({ length: 5 }, (_, i) => makeRow({ playerId: i + 1 }));
    const result = validateRows(rows);
    expect(result.totalRows).toBe(5);
    expect(result.validRows).toBe(5);
  });

  test('lista vuota → valida, zero righe', () => {
    const result = validateRows([]);
    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(0);
    expect(result.validRows).toBe(0);
  });
});

// ─── Colonne obbligatorie ─────────────────────────────────────────────────────

describe('validateRows — campi obbligatori', () => {
  test('season vuota → errore', () => {
    const result = validateRows([makeRow({ season: '' })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'season')).toBe(true);
  });

  test('playerName vuoto → errore', () => {
    const result = validateRows([makeRow({ playerName: '' })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'playerName')).toBe(true);
  });

  test('club vuoto → errore', () => {
    const result = validateRows([makeRow({ club: '' })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'club')).toBe(true);
  });
});

// ─── Ruoli ────────────────────────────────────────────────────────────────────

describe('validateRows — ruoli', () => {
  test.each(['P', 'D', 'C', 'A'] as const)('ruolo %s valido → nessun errore ruolo', (role) => {
    const result = validateRows([makeRow({ role })]);
    expect(result.errors.filter(e => e.field === 'role')).toHaveLength(0);
  });

  test('ruolo non valido "X" → errore', () => {
    const result = validateRows([makeRow({ role: 'X' as never })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'role')).toBe(true);
  });

  test('ruolo minuscolo "p" → errore (ruoli case-sensitive nel validatore)', () => {
    const result = validateRows([makeRow({ role: 'p' as never })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'role')).toBe(true);
  });
});

// ─── Valori numerici ──────────────────────────────────────────────────────────

describe('validateRows — valori numerici', () => {
  test('initialQuote NaN → errore', () => {
    const result = validateRows([makeRow({ initialQuote: NaN })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'initialQuote')).toBe(true);
  });

  test('initialQuote Infinity → errore', () => {
    const result = validateRows([makeRow({ initialQuote: Infinity })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'initialQuote')).toBe(true);
  });

  test('initialQuote zero → errore (deve essere > 0)', () => {
    const result = validateRows([makeRow({ initialQuote: 0 })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'initialQuote')).toBe(true);
  });

  test('initialQuote negativa → errore', () => {
    const result = validateRows([makeRow({ initialQuote: -5 })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'initialQuote')).toBe(true);
  });

  test('currentOrFinalQuote zero è ammesso (giocatore svincolato/ritirato)', () => {
    const result = validateRows([makeRow({ currentOrFinalQuote: 0 })]);
    // currentOrFinalQuote=0 non genera errore (il giocatore potrebbe essere stato svincolato)
    expect(result.errors.filter(e => e.field === 'currentOrFinalQuote')).toHaveLength(0);
  });
});

// ─── Duplicati ────────────────────────────────────────────────────────────────

describe('validateRows — duplicati', () => {
  test('due righe con stesso season + playerId → warning', () => {
    const rows = [
      makeRow({ playerId: 10, season: '2022/23' }),
      makeRow({ playerId: 10, season: '2022/23', playerName: 'Duplicato' }),
    ];
    const result = validateRows(rows);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.duplicateKeys).toContain('2022/23|10');
  });

  test('stesso playerId in stagioni diverse non è duplicato', () => {
    const rows = [
      makeRow({ playerId: 10, season: '2022/23' }),
      makeRow({ playerId: 10, season: '2023/24' }),
    ];
    const result = validateRows(rows);
    expect(result.duplicateKeys).toHaveLength(0);
  });

  test('duplicateKeys contiene solo le chiavi effettivamente duplicate', () => {
    const rows = [
      makeRow({ playerId: 1, season: '2021/22' }),
      makeRow({ playerId: 2, season: '2021/22' }),
      makeRow({ playerId: 2, season: '2021/22', playerName: 'Dup' }),
    ];
    const result = validateRows(rows);
    expect(result.duplicateKeys).toContain('2021/22|2');
    expect(result.duplicateKeys).not.toContain('2021/22|1');
  });
});

// ─── Conteggi ─────────────────────────────────────────────────────────────────

describe('validateRows — conteggi', () => {
  test('validRows < totalRows quando ci sono errori', () => {
    const rows = [
      makeRow({ playerId: 1 }),
      makeRow({ playerId: 2, playerName: '' }),     // errore
      makeRow({ playerId: 3, initialQuote: -1 }), // errore
    ];
    const result = validateRows(rows);
    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBeLessThan(result.totalRows);
  });

  test('errors e warnings sono separati', () => {
    const rows = [
      makeRow({ initialQuote: 0 }),                           // errore
      makeRow({ playerId: 100, season: '2022/23' }),         // prima istanza OK
      makeRow({ playerId: 100, season: '2022/23' }),         // warning duplicato
    ];
    const result = validateRows(rows);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
