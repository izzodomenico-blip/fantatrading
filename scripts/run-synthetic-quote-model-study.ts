import * as fs from 'fs';
import * as path from 'path';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../src/importers/realVotesImporter';
import {
  buildSyntheticQuoteModelStudyMarkdown,
  makeSyntheticQuoteModelStudyCsv,
  runSyntheticQuoteModelStudy,
} from '../src/analysis/syntheticQuoteModelStudy';

const QUOTES_PATH = path.resolve(__dirname, '../data/real/processed/fantacalcio_quotes_history.json');
const VOTES_PATH = path.resolve(__dirname, '../data/real/processed/votes/fantacalcio_votes_history.json');
const REPORT_DIR = path.resolve(__dirname, '../reports/real-data');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readRows<T>(filePath: string): T[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return raw.rows ?? [];
}

function main(): void {
  console.log('Synthetic Quote Model Improvement Study');
  if (!fs.existsSync(QUOTES_PATH)) throw new Error(`File quotazioni mancante: ${QUOTES_PATH}`);
  if (!fs.existsSync(VOTES_PATH)) throw new Error(`File voti mancante: ${VOTES_PATH}`);
  const quoteRows = readRows<NormalizedQuoteRow>(QUOTES_PATH);
  const voteRows = readRows<NormalizedVoteRow>(VOTES_PATH);
  const report = runSyntheticQuoteModelStudy(quoteRows, voteRows);

  ensureDir(REPORT_DIR);
  const jsonPath = path.join(REPORT_DIR, 'synthetic_quote_model_study.json');
  const csvPath = path.join(REPORT_DIR, 'synthetic_quote_model_study.csv');
  const mdPath = path.join(REPORT_DIR, 'synthetic_quote_model_study.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(csvPath, makeSyntheticQuoteModelStudyCsv(report), 'utf-8');
  fs.writeFileSync(mdPath, buildSyntheticQuoteModelStudyMarkdown(report), 'utf-8');

  const recommended = report.models.find(model => model.modelId === report.recommendedOperationalModel)!;
  console.log(`Output generati:`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${csvPath}`);
  console.log(`  ${mdPath}`);
  console.log(`Recommended: ${report.recommendedOperationalModel}`);
  console.log(`MAE: ${recommended.aggregateValidation.mae.toFixed(2)}`);
  console.log(`RMSE: ${recommended.aggregateValidation.rmse.toFixed(2)}`);
  console.log(`Within 2: ${recommended.aggregateValidation.within2Pct.toFixed(2)}%`);
}

main();
