import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';

// ─── Tipi pubblici ────────────────────────────────────────────────────────────

export type SeasonStatus = 'completed' | 'in_progress';
export type PlayerRole = 'P' | 'D' | 'C' | 'A';

export interface NormalizedQuoteRow {
  season: string;
  seasonStatus: SeasonStatus;
  playerId: number;
  role: PlayerRole;
  roleExtended: string;
  playerName: string;
  club: string;
  /** Qt.I — quotazione inizio stagione (base asta) */
  initialQuote: number;
  /** Qt.A — quotazione attuale / fine stagione */
  currentOrFinalQuote: number;
  quoteDiff: number;
  /** Rendimento % statistico classico: (Qt.A − Qt.I) / Qt.I × 100 */
  quoteRawReturnPct: number;
  /** Rendimento % FantaTrading: (Qt.A − Qt.I) × 5 — ogni punto quotazione = 5% */
  quoteTradingReturnPct: number;
  initialQuoteMantra: number;
  currentOrFinalQuoteMantra: number;
  quoteDiffMantra: number;
  fvm: number;
  fvmMantra: number;
  sourceFile: string;
}

export interface ImportResult {
  season: string;
  sourceFile: string;
  rows: NormalizedQuoteRow[];
  rawRowCount: number;
  skippedRowCount: number;
}

// ─── Stagioni note ────────────────────────────────────────────────────────────

const COMPLETED_SEASONS = new Set([
  '2019/20', '2020/21', '2021/22', '2022/23', '2023/24', '2024/25',
]);

export function getSeasonStatus(season: string): SeasonStatus {
  return COMPLETED_SEASONS.has(season) ? 'completed' : 'in_progress';
}

// ─── Rilevamento stagione dal nome file ───────────────────────────────────────

/**
 * Estrae la stagione nel formato "YYYY/YY" dal nome del file.
 * Gestisce pattern: 2019_20, 2019-20, 201920, 2019_2020, 2019-2020.
 */
export function detectSeason(filename: string): string | null {
  const base = path.basename(filename, path.extname(filename));

  // 4 cifre + separatore + 2 cifre (es. 2019_20, 2019-20)
  const m1 = base.match(/(\d{4})[_\-\s/](\d{2})(?!\d)/);
  if (m1) {
    const y1 = parseInt(m1[1]);
    const y2 = Math.floor(y1 / 100) * 100 + parseInt(m1[2]);
    if (y2 === y1 + 1) return `${y1}/${m1[2]}`;
  }

  // 4 cifre + separatore opzionale + 4 cifre (es. 2019_2020, 20192020)
  const m2 = base.match(/(\d{4})[_\-\s]?(\d{4})/);
  if (m2) {
    const y1 = parseInt(m2[1]);
    const y2 = parseInt(m2[2]);
    if (y2 === y1 + 1) return `${y1}/${String(y2).slice(2)}`;
  }

  return null;
}

// ─── Conversione valori ───────────────────────────────────────────────────────

export function toNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function toRole(val: unknown): PlayerRole {
  const s = String(val ?? '').trim().toUpperCase();
  if (s === 'P' || s === 'D' || s === 'C' || s === 'A') return s as PlayerRole;
  // Ruolo non valido: il validatore lo segnalerà; qui usa 'P' come placeholder
  return s as PlayerRole;
}

// ─── Normalizzazione riga ─────────────────────────────────────────────────────

/**
 * Normalizza una riga grezza dell'Excel (chiavi = intestazioni colonna).
 * Mapping colonne:
 *   Qt.I → initialQuote        (quotazione inizio stagione)
 *   Qt.A → currentOrFinalQuote (quotazione attuale / fine stagione)
 *   Diff. → quoteDiff          (Qt.A - Qt.I)
 */
export function normalizeRow(
  raw: Record<string, unknown>,
  season: string,
  sourceFile: string,
): NormalizedQuoteRow {
  const initialQuote = toNum(raw['Qt.I']);
  const currentOrFinalQuote = toNum(raw['Qt.A']);
  const quoteDiff = toNum(raw['Diff.']);
  const quoteRawReturnPct = initialQuote > 0
    ? ((currentOrFinalQuote - initialQuote) / initialQuote) * 100
    : 0;
  const quoteTradingReturnPct = (currentOrFinalQuote - initialQuote) * 5;

  return {
    season,
    seasonStatus: getSeasonStatus(season),
    playerId: toNum(raw['Id']),
    role: toRole(raw['R']),
    roleExtended: String(raw['RM'] ?? '').trim(),
    playerName: String(raw['Nome'] ?? '').trim(),
    club: String(raw['Squadra'] ?? '').trim(),
    initialQuote,
    currentOrFinalQuote,
    quoteDiff,
    quoteRawReturnPct,
    quoteTradingReturnPct,
    initialQuoteMantra: toNum(raw['Qt.I M']),
    currentOrFinalQuoteMantra: toNum(raw['Qt.A M']),
    quoteDiffMantra: toNum(raw['Diff.M']),
    fvm: toNum(raw['FVM']),
    fvmMantra: toNum(raw['FVM M']),
    sourceFile,
  };
}

// ─── Import singolo file ──────────────────────────────────────────────────────

/**
 * Legge un singolo file Excel e restituisce le righe normalizzate.
 * Cerca il foglio "Tutti"; in caso contrario usa il primo foglio.
 */
export function importExcelFile(filePath: string, seasonOverride?: string): ImportResult {
  const filename = path.basename(filePath);
  const season = seasonOverride ?? detectSeason(filename) ?? 'unknown';

  const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });

  const sheetName = workbook.SheetNames.includes('Tutti')
    ? 'Tutti'
    : workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  // range: 1 — salta la riga di titolo (A1) e usa la seconda riga come intestazione colonne
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
    range: 1,
  });

  let skippedRowCount = 0;
  const rows: NormalizedQuoteRow[] = [];

  for (const raw of rawRows) {
    const idVal = raw['Id'];
    // Salta righe vuote o intestazioni duplicate
    if (idVal === '' || idVal === 'Id' || idVal === undefined || idVal === null) {
      skippedRowCount++;
      continue;
    }
    rows.push(normalizeRow(raw, season, filename));
  }

  return { season, sourceFile: filename, rows, rawRowCount: rawRows.length, skippedRowCount };
}

// ─── Import da directory ──────────────────────────────────────────────────────

/**
 * Scansiona una directory e importa tutti i file .xlsx/.xls trovati.
 * Restituisce array vuoto se la directory non esiste.
 */
export function importAllFromDirectory(dirPath: string): ImportResult[] {
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath)
    .filter(f => /\.(xlsx|xls)$/i.test(f))
    .sort();

  return files.map(f => importExcelFile(path.join(dirPath, f)));
}
