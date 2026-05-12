import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export type RealVoteRole = 'P' | 'D' | 'C' | 'A';
export type SeasonStatus = 'completed' | 'in_progress';

export interface NormalizedVoteRow {
  season: string;
  seasonStatus: SeasonStatus;
  round: number;
  playerId: number | string;
  playerName: string;
  club: string;
  role: RealVoteRole;
  vote: number | null;
  fantasyVote: number | null;
  minutesPlayed: number | null;
  played: boolean;
  starter: boolean | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  penaltiesMissed: number;
  ownGoals: number;
  sourceFile: string;
}

export interface ExcelSheetSummary {
  file: string;
  sheetName: string;
  rowCount: number;
  headerRowIndex: number | null;
  headers: string[];
  usefulColumns: string[];
  missingColumns: string[];
}

export interface VoteImportResult {
  sourceFile: string;
  rows: NormalizedVoteRow[];
  rawRowCount: number;
  skippedRowCount: number;
  mappingIssues?: string[];
  sheets?: ExcelSheetSummary[];
}

export interface VotesExcelImportSummary {
  filesRead: number;
  rowsImported: number;
  sheets: ExcelSheetSummary[];
  mappingIssues: string[];
}

export const VOTE_REQUIRED_COLUMNS = [
  'season',
  'seasonStatus',
  'round',
  'playerId',
  'playerName',
  'club',
  'role',
  'vote',
  'fantasyVote',
  'minutesPlayed',
  'played',
  'starter',
  'goals',
  'assists',
  'yellowCards',
  'redCards',
  'penaltiesMissed',
  'ownGoals',
];

const PRIMARY_EXCEL_SHEET = 'Fantacalcio';
const EXCEL_USEFUL_COLUMNS = ['Cod.', 'Ruolo', 'Nome', 'Voto', 'Gf', 'Rs', 'Au', 'Amm', 'Esp', 'Ass'];

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeKey(value: unknown): string {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeSeason(rawSeason: string): string {
  return rawSeason.replace('_', '/');
}

export function getSeasonStatus(season: string): SeasonStatus {
  return season === '2025/26' || season === '2025_26' ? 'in_progress' : 'completed';
}

export function inferSeasonAndRound(filePath: string): { season: string; seasonStatus: SeasonStatus; round: number } {
  const normalized = filePath.replace(/\\/g, '/');
  const seasonMatch = normalized.match(/(?:^|\/)(20\d{2}[_/]\d{2})(?:\/|_)/) ?? normalized.match(/Stagione[_\s-]+(20\d{2}[_/]\d{2})/i);
  const roundMatch = normalized.match(/Giornata[_\s-]*(\d+)/i);
  const season = normalizeSeason(seasonMatch?.[1] ?? '');
  return {
    season,
    seasonStatus: getSeasonStatus(season),
    round: roundMatch ? toNumber(roundMatch[1]) : 0,
  };
}

export function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    return row;
  });
}

export function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const cleaned = String(value).trim().replace(',', '.').replace(/[^\d.+-]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export function toNumber(value: unknown): number {
  const n = toOptionalNumber(value);
  return n === null ? 0 : n;
}

export function toBoolean(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'si', 's'].includes(normalized);
}

function buildTemporaryPlayerId(raw: Record<string, string>): string {
  return [
    normalizeText(raw.season),
    normalizeText(raw.playerName),
    normalizeText(raw.club),
    normalizeText(raw.role).toUpperCase(),
  ].map(normalizeKey).join('|');
}

export function normalizeVoteRow(raw: Record<string, string>, sourceFile: string): NormalizedVoteRow {
  const played = toBoolean(raw.played);
  return {
    season: String(raw.season ?? '').trim(),
    seasonStatus: (String(raw.seasonStatus ?? '').trim() || getSeasonStatus(String(raw.season ?? '').trim())) as SeasonStatus,
    round: toNumber(raw.round),
    playerId: normalizeText(raw.playerId) || buildTemporaryPlayerId(raw),
    playerName: String(raw.playerName ?? '').trim(),
    club: String(raw.club ?? '').trim(),
    role: String(raw.role ?? '').trim().toUpperCase() as RealVoteRole,
    vote: played ? toOptionalNumber(raw.vote) : null,
    fantasyVote: played ? toOptionalNumber(raw.fantasyVote) : null,
    minutesPlayed: toOptionalNumber(raw.minutesPlayed),
    played,
    starter: normalizeText(raw.starter) === '' ? null : toBoolean(raw.starter),
    goals: toNumber(raw.goals),
    assists: toNumber(raw.assists),
    yellowCards: toNumber(raw.yellowCards),
    redCards: toNumber(raw.redCards),
    penaltiesMissed: toNumber(raw.penaltiesMissed),
    ownGoals: toNumber(raw.ownGoals),
    sourceFile,
  };
}

export function importVotesCsvFile(filePath: string): VoteImportResult {
  const sourceFile = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const rawRows = parseCsv(content);
  const rows: NormalizedVoteRow[] = [];
  let skippedRowCount = 0;

  for (const raw of rawRows) {
    const isEmpty = Object.values(raw).every(v => String(v ?? '').trim() === '');
    if (isEmpty) {
      skippedRowCount++;
      continue;
    }
    rows.push(normalizeVoteRow(raw, sourceFile));
  }

  return { sourceFile, rows, rawRowCount: rawRows.length, skippedRowCount };
}

function listVoteFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .flatMap(entry => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return listVoteFiles(fullPath);
      return /\.(csv|xlsx)$/i.test(entry.name) ? [fullPath] : [];
    })
    .sort((a, b) => a.localeCompare(b));
}

function rowValues(row: unknown[]): string[] {
  return row.map(cell => normalizeText(cell));
}

function isHeaderRow(values: string[]): boolean {
  const keys = values.map(normalizeKey);
  return keys.includes('cod') && keys.includes('ruolo') && keys.includes('nome') && keys.includes('voto');
}

function isPlayerRow(values: string[]): boolean {
  return normalizeText(values[0]) !== '' && normalizeText(values[1]) !== '' && normalizeText(values[2]) !== '' && normalizeKey(values[0]) !== 'cod';
}

function isClubRow(values: string[]): boolean {
  return values[0] !== '' && values.slice(1).every(v => v === '');
}

function mapHeaders(headers: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  headers.forEach((header, idx) => {
    out[normalizeKey(header)] = idx;
  });
  return out;
}

function getCell(values: string[], indexes: Record<string, number>, key: string): string {
  const idx = indexes[normalizeKey(key)];
  return idx === undefined ? '' : normalizeText(values[idx]);
}

function isNoVoteValue(value: string): boolean {
  return value === '' || /^s\.?v\.?$/i.test(value);
}

function inferPlayed(voteValue: string): boolean {
  const vote = toOptionalNumber(voteValue);
  return !isNoVoteValue(voteValue) && vote !== null && Number.isFinite(vote);
}

function makeExcelSheetSummary(file: string, sheetName: string, rows: unknown[][]): ExcelSheetSummary {
  const headerRowIndex = rows.findIndex(row => isHeaderRow(rowValues(row)));
  const headers = headerRowIndex >= 0 ? rowValues(rows[headerRowIndex]) : [];
  return {
    file,
    sheetName,
    rowCount: rows.length,
    headerRowIndex: headerRowIndex >= 0 ? headerRowIndex : null,
    headers,
    usefulColumns: EXCEL_USEFUL_COLUMNS.filter(col => headers.some(header => normalizeKey(header) === normalizeKey(col))),
    missingColumns: EXCEL_USEFUL_COLUMNS.filter(col => !headers.some(header => normalizeKey(header) === normalizeKey(col))),
  };
}

export function importVotesExcelFile(filePath: string, rootDir = path.dirname(filePath)): VoteImportResult {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const relativeSourceFile = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const { season, seasonStatus, round } = inferSeasonAndRound(filePath);
  const mappingIssues: string[] = [];
  const sheets = workbook.SheetNames.map(sheetName => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null, raw: false, blankrows: false }) as unknown[][];
    return makeExcelSheetSummary(relativeSourceFile, sheetName, rows);
  });

  const sheetName = workbook.SheetNames.includes(PRIMARY_EXCEL_SHEET) ? PRIMARY_EXCEL_SHEET : workbook.SheetNames[0];
  if (sheetName !== PRIMARY_EXCEL_SHEET) {
    mappingIssues.push(`${relativeSourceFile}: foglio "${PRIMARY_EXCEL_SHEET}" assente, usato "${sheetName}".`);
  }
  if (!season) mappingIssues.push(`${relativeSourceFile}: stagione non riconosciuta dal percorso/nome file.`);
  if (!round) mappingIssues.push(`${relativeSourceFile}: giornata non riconosciuta dal percorso/nome file.`);

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null, raw: false, blankrows: false }) as unknown[][];
  const normalizedRows: NormalizedVoteRow[] = [];
  let skippedRowCount = 0;
  let skippedUnsupportedRoleCount = 0;
  let currentClub = '';
  let currentHeaders: string[] = [];
  let currentIndexes: Record<string, number> = {};

  for (const rawRow of rows) {
    const values = rowValues(rawRow);
    if (values.every(v => v === '')) {
      skippedRowCount++;
      continue;
    }
    if (isClubRow(values) && !isHeaderRow(values) && !/^voti|solo su|questo file|e' da/i.test(values[0])) {
      currentClub = values[0];
      continue;
    }
    if (isHeaderRow(values)) {
      currentHeaders = values;
      currentIndexes = mapHeaders(values);
      continue;
    }
    if (!currentHeaders.length || !isPlayerRow(values)) {
      skippedRowCount++;
      continue;
    }

    const voteRaw = getCell(values, currentIndexes, 'Voto');
    const role = getCell(values, currentIndexes, 'Ruolo').toUpperCase();
    if (!['P', 'D', 'C', 'A'].includes(role)) {
      skippedUnsupportedRoleCount++;
      continue;
    }
    const played = inferPlayed(voteRaw);
    const raw: Record<string, string> = {
      season,
      seasonStatus,
      round: String(round),
      playerId: getCell(values, currentIndexes, 'Cod.'),
      playerName: getCell(values, currentIndexes, 'Nome'),
      club: currentClub,
      role,
      vote: voteRaw,
      fantasyVote: '',
      minutesPlayed: '',
      played: String(played),
      starter: '',
      goals: getCell(values, currentIndexes, 'Gf'),
      assists: getCell(values, currentIndexes, 'Ass'),
      yellowCards: getCell(values, currentIndexes, 'Amm'),
      redCards: getCell(values, currentIndexes, 'Esp'),
      penaltiesMissed: getCell(values, currentIndexes, 'Rs'),
      ownGoals: getCell(values, currentIndexes, 'Au'),
    };
    normalizedRows.push(normalizeVoteRow(raw, relativeSourceFile));
  }

  if (skippedUnsupportedRoleCount > 0) {
    mappingIssues.push(`${relativeSourceFile}: escluse ${skippedUnsupportedRoleCount} righe non giocatore con ruolo diverso da P/D/C/A.`);
  }

  return {
    sourceFile: relativeSourceFile,
    rows: normalizedRows,
    rawRowCount: rows.length,
    skippedRowCount,
    mappingIssues,
    sheets,
  };
}

export function importAllVotesFromDirectory(dirPath: string): VoteImportResult[] {
  return listVoteFiles(dirPath).map(file => {
    if (/\.xlsx$/i.test(file)) return importVotesExcelFile(file, dirPath);
    return importVotesCsvFile(file);
  });
}

export function summarizeExcelImport(results: VoteImportResult[]): VotesExcelImportSummary {
  return {
    filesRead: results.length,
    rowsImported: results.reduce((sum, result) => sum + result.rows.length, 0),
    sheets: results.flatMap(result => result.sheets ?? []),
    mappingIssues: results.flatMap(result => result.mappingIssues ?? []),
  };
}
