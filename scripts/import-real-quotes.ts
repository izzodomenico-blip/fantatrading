import * as fs from 'fs';
import * as path from 'path';
import { importAllFromDirectory, NormalizedQuoteRow, ImportResult } from '../src/importers/realQuotesImporter';
import { validateRows } from '../src/importers/realQuotesValidator';

const RAW_DIR = path.resolve(__dirname, '../data/real/raw/quotazioni');
const OUT_DIR = path.resolve(__dirname, '../data/real/processed');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rowsToCsv(rows: NormalizedQuoteRow[]): string {
  if (rows.length === 0) return '';
  const headers: Array<keyof NormalizedQuoteRow> = [
    'season', 'seasonStatus', 'playerId', 'role', 'roleExtended',
    'playerName', 'club', 'initialQuote', 'currentOrFinalQuote',
    'quoteDiff', 'quoteRawReturnPct', 'quoteTradingReturnPct', 'initialQuoteMantra',
    'currentOrFinalQuoteMantra', 'quoteDiffMantra', 'fvm', 'fvmMantra', 'sourceFile',
  ];
  const escape = (v: unknown): string => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

function seasonSummaryCsv(results: ImportResult[]): string {
  const headers = ['season', 'status', 'sourceFile', 'importedRows', 'skippedRows'];
  const lines = [headers.join(',')];
  for (const r of results) {
    const status = r.rows[0]?.seasonStatus ?? 'unknown';
    lines.push([r.season, status, r.sourceFile, r.rows.length, r.skippedRowCount].join(','));
  }
  return lines.join('\n');
}

function main(): void {
  console.log('── FantaTrading: Import Quotazioni Reali ──────────────────────────');

  if (!fs.existsSync(RAW_DIR)) {
    console.log(`\nCartella sorgente non trovata:\n  ${RAW_DIR}`);
    console.log('\nAzioni da eseguire:');
    console.log('  1. La cartella è già stata creata da questo script.');
    console.log('  2. Copia i file Excel delle quotazioni Fantacalcio in:');
    console.log(`     ${RAW_DIR}`);
    console.log('  3. Naming atteso:  quotazioni_2019_20.xlsx, quotazioni_2020_21.xlsx, ...');
    console.log('  4. Riesegui: npm run import:real-quotes\n');
    fs.mkdirSync(RAW_DIR, { recursive: true });
    return;
  }

  const xlsxFiles = fs.readdirSync(RAW_DIR).filter(f => /\.(xlsx|xls)$/i.test(f));
  if (xlsxFiles.length === 0) {
    console.log(`\nNessun file .xlsx/.xls trovato in:\n  ${RAW_DIR}`);
    console.log('Copia i file Excel delle quotazioni e riesegui npm run import:real-quotes.\n');
    return;
  }

  console.log(`\nFile trovati: ${xlsxFiles.length}`);
  xlsxFiles.forEach(f => console.log(`  • ${f}`));

  const results = importAllFromDirectory(RAW_DIR);
  const allRows: NormalizedQuoteRow[] = results.flatMap(r => r.rows);

  console.log(`\nRighe importate totali: ${allRows.length}`);
  results.forEach(r =>
    console.log(`  ${r.season} (${r.rows[0]?.seasonStatus ?? '?'}): ${r.rows.length} righe — ${r.sourceFile}`)
  );

  // Validazione
  const validation = validateRows(allRows);
  if (validation.errors.length > 0) {
    console.error(`\n⚠ ${validation.errors.length} errori di validazione:`);
    validation.errors.slice(0, 15).forEach(e =>
      console.error(`  [riga ${e.rowIndex}] ${e.season} / ${e.playerName}: ${e.message}`)
    );
    if (validation.errors.length > 15)
      console.error(`  ... e altri ${validation.errors.length - 15} errori`);
  } else {
    console.log('\n✓ Validazione superata — nessun errore');
  }
  if (validation.warnings.length > 0) {
    console.warn(`⚠ ${validation.warnings.length} avvertimenti (es. duplicati)`);
  }

  ensureDir(OUT_DIR);

  const csvPath = path.join(OUT_DIR, 'fantacalcio_quotes_history.csv');
  const jsonPath = path.join(OUT_DIR, 'fantacalcio_quotes_history.json');
  const summaryPath = path.join(OUT_DIR, 'season_summary.csv');

  fs.writeFileSync(csvPath, rowsToCsv(allRows), 'utf-8');
  fs.writeFileSync(jsonPath, JSON.stringify(
    { generatedAt: new Date().toISOString(), totalRows: allRows.length, rows: allRows },
    null, 2
  ), 'utf-8');
  fs.writeFileSync(summaryPath, seasonSummaryCsv(results), 'utf-8');

  console.log(`\nOutput scritti in ${OUT_DIR}:`);
  console.log(`  fantacalcio_quotes_history.csv  (${allRows.length} righe)`);
  console.log(`  fantacalcio_quotes_history.json`);
  console.log(`  season_summary.csv`);
  console.log('\nEsegui npm run analyze:real-quotes per generare l\'analisi storica.\n');
}

main();
