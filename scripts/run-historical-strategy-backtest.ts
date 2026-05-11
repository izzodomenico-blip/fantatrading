import * as fs from 'fs';
import * as path from 'path';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import {
  buildHistoricalStrategyCsv,
  buildHistoricalStrategyMarkdown,
  DEFAULT_STRATEGY_BACKTEST_CONFIG,
  runHistoricalStrategyBacktest,
} from '../src/analysis/historicalStrategyBacktest';
import { ensureDir, writeCSV, writeJSON } from '../src/services/reportWriter';

const DATA_PATH = path.resolve(__dirname, '../data/real/processed/fantacalcio_quotes_history.json');
const OUT_DIR = path.resolve(__dirname, '../reports/real-data');

async function main(): Promise<void> {
  console.log('=== FantaTrading - Backtest Storico Strategie ===\n');

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`File dati non trovato: ${DATA_PATH}`);
    console.error('Esegui prima: npm.cmd run import:real-quotes');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as {
    generatedAt: string;
    totalRows: number;
    rows: NormalizedQuoteRow[];
  };

  console.log(`Righe caricate: ${raw.rows.length}`);
  console.log(`Simulazioni per strategia/stagione: ${DEFAULT_STRATEGY_BACKTEST_CONFIG.numSimulations}\n`);

  const t0 = Date.now();
  const report = runHistoricalStrategyBacktest(raw.rows, DEFAULT_STRATEGY_BACKTEST_CONFIG);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  ensureDir(OUT_DIR);

  const jsonPath = path.join(OUT_DIR, 'historical_strategy_backtest.json');
  writeJSON(jsonPath, report);
  console.log(`JSON -> ${jsonPath}`);

  const csv = buildHistoricalStrategyCsv(report);
  const csvPath = path.join(OUT_DIR, 'historical_strategy_backtest.csv');
  writeCSV(csvPath, csv.headers, csv.rows);
  console.log(`CSV  -> ${csvPath}`);

  const mdPath = path.join(OUT_DIR, 'historical_strategy_backtest.md');
  fs.writeFileSync(mdPath, buildHistoricalStrategyMarkdown(report), 'utf8');
  console.log(`MD   -> ${mdPath}`);

  console.log(`\nCompletato in ${elapsed}s.`);
  console.log('\nClassifica ROI medio:');
  [...report.aggregateStats]
    .sort((a, b) => b.avgROI - a.avgROI)
    .forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.strategy.padEnd(20)} ROI=${s.avgROI.toFixed(1)}% | >5=${s.pctAbove5.toFixed(1)}% | delta RANDOM=${s.randomDeltaROI.toFixed(1)}pp`);
    });
  console.log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
