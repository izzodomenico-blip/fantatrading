import * as fs from 'fs';
import * as path from 'path';

export type RealVoteRole = 'P' | 'D' | 'C' | 'A';

export interface NormalizedVoteRow {
  season: string;
  round: number;
  playerId: number;
  playerName: string;
  club: string;
  role: RealVoteRole;
  vote: number | null;
  fantasyVote: number | null;
  minutesPlayed: number | null;
  played: boolean;
  starter: boolean;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  penaltiesMissed: number;
  ownGoals: number;
  sourceFile: string;
}

export interface VoteImportResult {
  sourceFile: string;
  rows: NormalizedVoteRow[];
  rawRowCount: number;
  skippedRowCount: number;
}

export const VOTE_REQUIRED_COLUMNS = [
  'season',
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
  const n = Number(String(value).replace(',', '.'));
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

export function normalizeVoteRow(raw: Record<string, string>, sourceFile: string): NormalizedVoteRow {
  const played = toBoolean(raw.played);
  return {
    season: String(raw.season ?? '').trim(),
    round: toNumber(raw.round),
    playerId: toNumber(raw.playerId),
    playerName: String(raw.playerName ?? '').trim(),
    club: String(raw.club ?? '').trim(),
    role: String(raw.role ?? '').trim().toUpperCase() as RealVoteRole,
    vote: played ? toOptionalNumber(raw.vote) : null,
    fantasyVote: played ? toOptionalNumber(raw.fantasyVote) : null,
    minutesPlayed: toOptionalNumber(raw.minutesPlayed),
    played,
    starter: toBoolean(raw.starter),
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

export function importAllVotesFromDirectory(dirPath: string): VoteImportResult[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter(file => /\.csv$/i.test(file))
    .sort()
    .map(file => importVotesCsvFile(path.join(dirPath, file)));
}

