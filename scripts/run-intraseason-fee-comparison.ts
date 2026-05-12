import * as fs from 'fs';
import * as path from 'path';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../src/importers/realVotesImporter';
import { SyntheticRoundQuoteInput } from '../src/analysis/intraseasonTradingBacktest';
import {
  buildFeeComparisonCsv,
  buildFeeComparisonMarkdown,
  runIntraseasonFeeComparison,
} from '../src/analysis/intraseasonFeeComparison';

const QUOTES_PATH = path.resolve(__dirname, '../data/real/processed/fantacalcio_quotes_history.json');
const VOTES_PATH = path.resolve(__dirname, '../data/real/processed/votes/fantacalcio_votes_history.json');
const SYNTHETIC_QUOTES_PATH = path.resolve(__dirname, '../data/real/processed/round-quotes/synthetic_round_quotes_history.json');
const REPORT_DIR = path.resolve(__dirname, '../reports/real-data');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readRows<T>(filePath: string): T[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return raw.rows ?? [];
}

function main(): void {
  console.log('Intraseason fee comparison: 1.25% vs 2% vendita');
  if (!fs.existsSync(QUOTES_PATH)) throw new Error(`File quotazioni mancante: ${QUOTES_PATH}`);
  if (!fs.existsSync(VOTES_PATH)) throw new Error(`File voti mancante: ${VOTES_PATH}`);
  if (!fs.existsSync(SYNTHETIC_QUOTES_PATH)) throw new Error(`File quotazioni sintetiche mancante: ${SYNTHETIC_QUOTES_PATH}`);

  const quoteRows = readRows<NormalizedQuoteRow>(QUOTES_PATH);
  const voteRows = readRows<NormalizedVoteRow>(VOTES_PATH);
  const syntheticRows = readRows<SyntheticRoundQuoteInput>(SYNTHETIC_QUOTES_PATH);

  const report = runIntraseasonFeeComparison(quoteRows, voteRows, syntheticRows);
  ensureDir(REPORT_DIR);

  const jsonPath = path.join(REPORT_DIR, 'intraseason_fee_comparison.json');
  const csvPath = path.join(REPORT_DIR, 'intraseason_fee_comparison.csv');
  const mdPath = path.join(REPORT_DIR, 'intraseason_fee_comparison.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(csvPath, buildFeeComparisonCsv(report), 'utf-8');
  fs.writeFileSync(mdPath, buildFeeComparisonMarkdown(report), 'utf-8');

  console.log('Output generati:');
  console.log(`  ${jsonPath}`);
  console.log(`  ${csvPath}`);
  console.log(`  ${mdPath}`);
  console.log('');
  console.log('Conclusioni:');
  for (const line of report.analysis.summaryLines) {
    console.log(`  ${line}`);
  }
}

main();
