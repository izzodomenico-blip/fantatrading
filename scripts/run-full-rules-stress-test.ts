import * as fs from 'fs';
import * as path from 'path';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../src/importers/realVotesImporter';
import {
  buildFullRulesStressCsv,
  buildFullRulesStressMarkdown,
  DEFAULT_FULL_RULES_STRESS_CONFIG,
  runFullRulesStressTest,
} from '../src/analysis/fullRulesStressTest';
import { ensureDir, writeCSV, writeJSON } from '../src/services/reportWriter';

const QUOTES_PATH = path.resolve(__dirname, '../data/real/processed/fantacalcio_quotes_history.json');
const VOTES_PATH = path.resolve(__dirname, '../data/real/processed/votes/fantacalcio_votes_history.json');
const OUT_DIR = path.resolve(__dirname, '../reports/real-data');

function loadRows<T>(filePath: string): T[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { rows?: T[] };
  return raw.rows ?? [];
}

async function main(): Promise<void> {
  console.log('=== FantaTrading - Full Rules Stress Test ===\n');
  const quoteRows = loadRows<NormalizedQuoteRow>(QUOTES_PATH);
  const voteRows = loadRows<NormalizedVoteRow>(VOTES_PATH);
  console.log(`Quotazioni caricate: ${quoteRows.length}`);
  console.log(`Voti caricati: ${voteRows.length}`);

  const t0 = Date.now();
  const report = runFullRulesStressTest(quoteRows, voteRows, DEFAULT_FULL_RULES_STRESS_CONFIG);
  ensureDir(OUT_DIR);

  writeJSON(path.join(OUT_DIR, 'full_rules_stress_test.json'), report);
  const csv = buildFullRulesStressCsv(report);
  writeCSV(path.join(OUT_DIR, 'full_rules_stress_test.csv'), csv.headers, csv.rows);
  fs.writeFileSync(path.join(OUT_DIR, 'full_rules_stress_test.md'), buildFullRulesStressMarkdown(report), 'utf8');

  console.log(`Completato in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log(`Raccomandazione: ${report.recommended.noVotePolicy}, soglia ${report.recommended.prizeThresholdPct}%, sell ${report.recommended.sellCommissionRate * 100}%, platform ${report.recommended.platformFeeRate * 100}%`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
