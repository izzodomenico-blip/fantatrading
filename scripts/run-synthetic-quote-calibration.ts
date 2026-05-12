import * as fs from 'fs';
import * as path from 'path';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../src/importers/realVotesImporter';
import {
  buildCalibrationMarkdown,
  buildSyntheticQuoteModelMarkdown,
  makeCalibrationCsv,
  runSyntheticQuoteCalibration,
} from '../src/analysis/syntheticQuoteCalibration';
import { makeSyntheticRoundQuoteCsv } from '../src/engine/syntheticRoundQuoteEngine';

const QUOTES_PATH = path.resolve(__dirname, '../data/real/processed/fantacalcio_quotes_history.json');
const VOTES_PATH = path.resolve(__dirname, '../data/real/processed/votes/fantacalcio_votes_history.json');
const OUT_DIR = path.resolve(__dirname, '../data/real/processed/round-quotes');
const REPORT_DIR = path.resolve(__dirname, '../reports/real-data');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readRows<T>(filePath: string): T[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return raw.rows ?? [];
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

function main(): void {
  console.log('Synthetic round quote calibration');
  if (!fs.existsSync(QUOTES_PATH)) throw new Error(`File quotazioni mancante: ${QUOTES_PATH}`);
  if (!fs.existsSync(VOTES_PATH)) throw new Error(`File voti mancante: ${VOTES_PATH}`);

  const quoteRows = readRows<NormalizedQuoteRow>(QUOTES_PATH);
  const voteRows = readRows<NormalizedVoteRow>(VOTES_PATH);
  console.log(`Quote rows: ${quoteRows.length}`);
  console.log(`Vote rows: ${voteRows.length}`);

  const output = runSyntheticQuoteCalibration(quoteRows, voteRows);
  ensureDir(OUT_DIR);
  ensureDir(REPORT_DIR);

  const roundJsonPath = path.join(OUT_DIR, 'synthetic_round_quotes_history.json');
  const roundCsvPath = path.join(OUT_DIR, 'synthetic_round_quotes_history.csv');
  const calibrationJsonPath = path.join(REPORT_DIR, 'synthetic_quote_calibration.json');
  const calibrationCsvPath = path.join(REPORT_DIR, 'synthetic_quote_calibration.csv');
  const modelMdPath = path.join(REPORT_DIR, 'synthetic_quote_model.md');
  const calibrationMdPath = path.join(REPORT_DIR, 'synthetic_quote_calibration.md');

  writeJson(roundJsonPath, {
    generatedAt: new Date().toISOString(),
    modelId: output.calibration.modelId,
    officialModel: false,
    params: output.calibration.bestCandidate.params,
    totalRows: output.syntheticRows.length,
    rows: output.syntheticRows,
  });
  fs.writeFileSync(roundCsvPath, makeSyntheticRoundQuoteCsv(output.syntheticRows), 'utf-8');
  writeJson(calibrationJsonPath, output.calibration);
  fs.writeFileSync(calibrationCsvPath, makeCalibrationCsv(output.calibration), 'utf-8');
  fs.writeFileSync(modelMdPath, buildSyntheticQuoteModelMarkdown(), 'utf-8');
  fs.writeFileSync(calibrationMdPath, buildCalibrationMarkdown(output.calibration), 'utf-8');

  console.log('Output generati:');
  console.log(`  ${roundJsonPath}`);
  console.log(`  ${roundCsvPath}`);
  console.log(`  ${calibrationJsonPath}`);
  console.log(`  ${calibrationCsvPath}`);
  console.log(`  ${modelMdPath}`);
  console.log(`  ${calibrationMdPath}`);
  console.log(`MAE best: ${output.calibration.bestCandidate.metrics.mae.toFixed(2)}`);
  console.log(`RMSE best: ${output.calibration.bestCandidate.metrics.rmse.toFixed(2)}`);
}

main();
