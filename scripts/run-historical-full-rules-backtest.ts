import * as fs from 'fs';
import * as path from 'path';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../src/importers/realVotesImporter';
import {
  buildHistoricalFullRulesCsv,
  buildHistoricalFullRulesMarkdown,
  DEFAULT_FULL_RULES_BACKTEST_CONFIG,
  runHistoricalFullRulesBacktest,
} from '../src/analysis/historicalFullRulesBacktest';
import { ensureDir, writeCSV, writeJSON } from '../src/services/reportWriter';

const QUOTES_PATH = path.resolve(__dirname, '../data/real/processed/fantacalcio_quotes_history.json');
const VOTES_PATH = path.resolve(__dirname, '../data/real/processed/votes/fantacalcio_votes_history.json');
const OUT_DIR = path.resolve(__dirname, '../reports/real-data');

function loadRows<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File dati non trovato: ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { rows?: T[] };
  return raw.rows ?? [];
}

async function main(): Promise<void> {
  console.log('=== FantaTrading - Historical Full Rules Backtest V1 ===\n');
  const quoteRows = loadRows<NormalizedQuoteRow>(QUOTES_PATH);
  const voteRows = loadRows<NormalizedVoteRow>(VOTES_PATH);
  console.log(`Quotazioni caricate: ${quoteRows.length}`);
  console.log(`Voti caricati: ${voteRows.length}`);
  console.log(`Simulazioni per strategia/stagione/policy: ${DEFAULT_FULL_RULES_BACKTEST_CONFIG.numSimulations}\n`);

  const t0 = Date.now();
  const report = runHistoricalFullRulesBacktest(quoteRows, voteRows, DEFAULT_FULL_RULES_BACKTEST_CONFIG);
  ensureDir(OUT_DIR);

  const jsonPath = path.join(OUT_DIR, 'historical_full_rules_backtest.json');
  writeJSON(jsonPath, report);
  console.log(`JSON -> ${jsonPath}`);

  const csv = buildHistoricalFullRulesCsv(report);
  const csvPath = path.join(OUT_DIR, 'historical_full_rules_backtest.csv');
  writeCSV(csvPath, csv.headers, csv.rows);
  console.log(`CSV  -> ${csvPath}`);

  const mdPath = path.join(OUT_DIR, 'historical_full_rules_backtest.md');
  fs.writeFileSync(mdPath, buildHistoricalFullRulesMarkdown(report), 'utf8');
  console.log(`MD   -> ${mdPath}`);

  console.log(`\nCompletato in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nTop completed aggregate:');
  [...report.aggregateCompletedStats]
    .sort((a, b) => b.avgFullRulesROI - a.avgFullRulesROI)
    .slice(0, 10)
    .forEach((stat, idx) => {
      console.log(`  ${idx + 1}. ${stat.strategy.padEnd(10)} ${stat.noVotePolicy.padEnd(11)} ROI=${stat.avgFullRulesROI.toFixed(2)}% | >5=${stat.pctAbove5.toFixed(1)}%`);
    });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
