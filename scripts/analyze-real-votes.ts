import * as fs from 'fs';
import * as path from 'path';
import { buildVotesQualityMarkdown, analyzeRealVotes } from '../src/analysis/realVotesAnalysis';
import { NormalizedVoteRow } from '../src/importers/realVotesImporter';
import { ensureDir, writeJSON } from '../src/services/reportWriter';

const PROCESSED_PATH = path.resolve(__dirname, '../data/real/processed/votes/fantacalcio_votes_history.json');
const REPORT_DIR = path.resolve(__dirname, '../reports/real-data');

function loadRows(): NormalizedVoteRow[] {
  if (!fs.existsSync(PROCESSED_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf-8')) as { rows?: NormalizedVoteRow[] };
  return raw.rows ?? [];
}

function main(): void {
  console.log('=== FantaTrading - Analisi Voti Reali ===\n');
  ensureDir(REPORT_DIR);

  const rows = loadRows();
  const report = analyzeRealVotes(rows);
  writeJSON(path.join(REPORT_DIR, 'real_votes_quality.json'), report);
  fs.writeFileSync(path.join(REPORT_DIR, 'real_votes_quality.md'), buildVotesQualityMarkdown(report), 'utf8');

  console.log(`Righe voti analizzate: ${report.totalRows}`);
  console.log(`Stato: ${report.status}`);
  if (report.status === 'missing_data') {
    console.log('Nessun dato reale disponibile: report esplicativo generato.');
  }
}

main();
