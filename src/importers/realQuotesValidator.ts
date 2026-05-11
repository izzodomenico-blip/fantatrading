import { NormalizedQuoteRow, PlayerRole } from './realQuotesImporter';

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface ValidationIssue {
  rowIndex: number;
  season: string;
  playerId: number;
  playerName: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  duplicateKeys: string[];
}

// ─── Costanti ─────────────────────────────────────────────────────────────────

const VALID_ROLES: Set<string> = new Set<PlayerRole>(['P', 'D', 'C', 'A']);

// ─── Validatore ───────────────────────────────────────────────────────────────

export function validateRows(rows: NormalizedQuoteRow[]): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const seen = new Map<string, number>(); // "season|playerId" → primo indice

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Colonne obbligatorie non vuote
    const requiredStrings: Array<keyof NormalizedQuoteRow> = ['season', 'playerName', 'club'];
    for (const field of requiredStrings) {
      const val = row[field];
      if (!val || String(val).trim() === '') {
        errors.push({ rowIndex: i, season: row.season, playerId: row.playerId, playerName: row.playerName, field: String(field), message: `Campo obbligatorio mancante: ${field}`, severity: 'error' });
      }
    }

    // Ruolo valido (P/D/C/A)
    if (!VALID_ROLES.has(row.role)) {
      errors.push({ rowIndex: i, season: row.season, playerId: row.playerId, playerName: row.playerName, field: 'role', message: `Ruolo non valido: "${row.role}" (ammessi: P/D/C/A)`, severity: 'error' });
    }

    // Valori numerici validi
    const numericFields: Array<keyof NormalizedQuoteRow> = ['playerId', 'initialQuote', 'currentOrFinalQuote', 'quoteRawReturnPct', 'quoteTradingReturnPct'];
    for (const field of numericFields) {
      const val = row[field];
      if (typeof val !== 'number' || !isFinite(val)) {
        errors.push({ rowIndex: i, season: row.season, playerId: row.playerId, playerName: row.playerName, field: String(field), message: `Valore numerico non valido: ${field} = ${val}`, severity: 'error' });
      }
    }

    // Quota iniziale > 0
    if (isFinite(row.initialQuote) && row.initialQuote <= 0) {
      errors.push({ rowIndex: i, season: row.season, playerId: row.playerId, playerName: row.playerName, field: 'initialQuote', message: `Quota iniziale deve essere > 0 (trovato: ${row.initialQuote})`, severity: 'error' });
    }

    // Duplicati season + playerId
    const key = `${row.season}|${row.playerId}`;
    if (seen.has(key)) {
      warnings.push({ rowIndex: i, season: row.season, playerId: row.playerId, playerName: row.playerName, field: 'playerId', message: `Duplicato: season=${row.season}, playerId=${row.playerId} (prima riga: ${seen.get(key)})`, severity: 'warning' });
    } else {
      seen.set(key, i);
    }

    // playerId deve essere positivo
    if (typeof row.playerId === 'number' && row.playerId <= 0) {
      warnings.push({ rowIndex: i, season: row.season, playerId: row.playerId, playerName: row.playerName, field: 'playerId', message: `playerId non positivo: ${row.playerId}`, severity: 'warning' });
    }
  }

  const errorRowIndices = new Set(errors.map(e => e.rowIndex));
  const duplicateKeys = [...new Set(
    warnings.filter(w => w.message.startsWith('Duplicato')).map(w => `${w.season}|${w.playerId}`)
  )];

  return {
    valid: errors.length === 0,
    totalRows: rows.length,
    validRows: rows.length - errorRowIndices.size,
    errors,
    warnings,
    duplicateKeys,
  };
}
