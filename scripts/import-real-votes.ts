import * as fs from 'fs';
import * as path from 'path';
import {
  ExcelSheetSummary,
  importAllVotesFromDirectory,
  NormalizedVoteRow,
  summarizeExcelImport,
} from '../src/importers/realVotesImporter';
import { analyzeRealVotes, buildVotesQualityCsvRows } from '../src/analysis/realVotesAnalysis';
import { validateVoteRows } from '../src/importers/realVotesValidator';
import { ensureDir, writeCSV, writeJSON } from '../src/services/reportWriter';

const RAW_DIR = path.resolve(__dirname, '../data/real/raw/votes');
const OUT_DIR = path.resolve(__dirname, '../data/real/processed/votes');
const REPORT_DIR = path.resolve(__dirname, '../reports/real-data');

const HEADERS: Array<keyof NormalizedVoteRow> = [
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
  'sourceFile',
];

const QUALITY_HEADERS = [
  'season',
  'seasonStatus',
  'roundCount',
  'rounds',
  'recordCount',
  'playedRows',
  'notPlayedRows',
  'missingRoleRows',
  'missingClubRows',
  'missingFantasyVoteRows',
  'isComplete',
];

function cell(value: unknown): string | number | boolean {
  return value === null || value === undefined ? '' : value as string | number | boolean;
}

function groupSheetsBySignature(sheets: ExcelSheetSummary[]): ExcelSheetSummary[] {
  const seen = new Set<string>();
  const grouped: ExcelSheetSummary[] = [];
  for (const sheet of sheets) {
    const key = `${sheet.sheetName}|${sheet.headers.join('|')}|${sheet.missingColumns.join('|')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    grouped.push(sheet);
  }
  return grouped;
}

function expectedRoundsForSeason(season: string): number {
  return season === '2025/26' ? 36 : 38;
}

function buildRoundCoverageIssues(rows: NormalizedVoteRow[]): string[] {
  const seasons = [...new Set(rows.map(row => row.season))].sort();
  const issues: string[] = [];
  for (const season of seasons) {
    const rounds = new Set(rows.filter(row => row.season === season).map(row => row.round));
    const expected = expectedRoundsForSeason(season);
    const missing: number[] = [];
    for (let round = 1; round <= expected; round++) {
      if (!rounds.has(round)) missing.push(round);
    }
    if (missing.length > 0) {
      issues.push(`${season}: giornate mancanti rispetto all'intervallo 1-${expected}: ${missing.join(', ')}.`);
    }
  }
  return issues;
}

function buildMappingMarkdown(sheets: ExcelSheetSummary[], mappingIssues: string[]): string {
  const grouped = groupSheetsBySignature(sheets);
  const lines: string[] = [];
  lines.push('# FantaTrading - Mapping Excel Voti');
  lines.push('');
  lines.push(`**Generato il:** ${new Date().toLocaleString('it-IT')}`);
  lines.push('');
  lines.push('## Strategia di mapping');
  lines.push('');
  lines.push('- I file Excel vengono letti ricorsivamente da `data/real/raw/votes/`.');
  lines.push('- Stagione e giornata vengono riconosciute automaticamente dal percorso o dal nome file.');
  lines.push('- Il foglio primario normalizzato e `Fantacalcio`.');
  lines.push('- `Cod.` viene usato come `playerId`; se mancante viene generata una chiave temporanea normalizzata basata su stagione, nome, squadra e ruolo.');
  lines.push('- `Voto` viene mappato su `vote`; non esiste una colonna esplicita `fantasyVote`, quindi il campo resta vuoto.');
  lines.push('- Non vengono inventati minuti giocati o titolarita: `minutesPlayed` resta vuoto e `starter` resta vuoto quando non presente.');
  lines.push('- `SV` o voto vuoto vengono normalizzati con `played=false` e `vote`/`fantasyVote` vuoti.');
  lines.push('');
  lines.push('## Colonne mappate');
  lines.push('');
  lines.push('| Excel | Normalizzato | Nota |');
  lines.push('|-------|--------------|------|');
  lines.push('| Percorso/nome file | season, round, seasonStatus, sourceFile | 2023/24 e 2024/25 completed; 2025/26 in_progress |');
  lines.push('| Riga squadra | club | Valida fino alla squadra successiva |');
  lines.push('| Cod. | playerId | Chiave temporanea solo se assente |');
  lines.push('| Ruolo | role | P/D/C/A |');
  lines.push('| Nome | playerName | Nome dalla fonte |');
  lines.push('| Voto | vote | Valore numerico disponibile nel file |');
  lines.push('| Gf | goals | Gol segnati |');
  lines.push('| Ass | assists | Assist |');
  lines.push('| Amm | yellowCards | Ammonizioni |');
  lines.push('| Esp | redCards | Espulsioni |');
  lines.push('| Rs | penaltiesMissed | Rigori sbagliati |');
  lines.push('| Au | ownGoals | Autogol |');
  lines.push('');
  lines.push('## Struttura fogli rilevata');
  lines.push('');
  lines.push('| Foglio | Header rilevate | Colonne utili | Colonne mancanti utili |');
  lines.push('|--------|-----------------|---------------|------------------------|');
  for (const sheet of grouped) {
    lines.push(`| ${sheet.sheetName} | ${sheet.headers.join(', ')} | ${sheet.usefulColumns.join(', ')} | ${sheet.missingColumns.join(', ') || '-'} |`);
  }
  lines.push('');
  lines.push('## Problemi di mapping');
  lines.push('');
  if (mappingIssues.length === 0) {
    lines.push('Nessun problema bloccante di mapping rilevato.');
  } else {
    for (const issue of mappingIssues) {
      lines.push(`- ${issue}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  console.log('=== FantaTrading - Import Voti Reali ===\n');
  ensureDir(RAW_DIR);
  ensureDir(OUT_DIR);
  ensureDir(REPORT_DIR);

  const sourceFiles = fs.readdirSync(RAW_DIR, { recursive: true })
    .filter(file => /\.(csv|xlsx)$/i.test(String(file)));
  if (sourceFiles.length === 0) {
    console.log(`Nessun file voti trovato in ${RAW_DIR}`);
    writeJSON(path.join(OUT_DIR, 'fantacalcio_votes_history.json'), {
      generatedAt: new Date().toISOString(),
      totalRows: 0,
      rows: [],
      note: 'Nessun dato reale voti disponibile.',
    });
    return;
  }

  const results = importAllVotesFromDirectory(RAW_DIR);
  const rows = results.flatMap(r => r.rows);
  const validation = validateVoteRows(rows);
  const excelSummary = summarizeExcelImport(results);
  const mappingIssues = [...excelSummary.mappingIssues, ...buildRoundCoverageIssues(rows)];
  const quality = analyzeRealVotes(rows);

  writeJSON(path.join(OUT_DIR, 'fantacalcio_votes_history.json'), {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    rows,
    validation,
    mapping: {
      ...excelSummary,
      mappingIssues,
    },
  });

  writeCSV(
    path.join(OUT_DIR, 'fantacalcio_votes_history.csv'),
    HEADERS,
    rows.map(row => HEADERS.map(header => cell(row[header]))),
  );

  writeCSV(
    path.join(OUT_DIR, 'votes_quality_report.csv'),
    QUALITY_HEADERS,
    buildVotesQualityCsvRows(quality),
  );

  fs.writeFileSync(
    path.join(REPORT_DIR, 'votes_excel_mapping_report.md'),
    buildMappingMarkdown(excelSummary.sheets, mappingIssues),
    'utf8',
  );

  console.log(`File importati: ${results.length}`);
  console.log(`Righe importate: ${rows.length}`);
  console.log(`Errori validazione: ${validation.errors.length}`);
  console.log(`Warning validazione: ${validation.warnings.length}`);
}

main();
