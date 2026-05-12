import * as fs from 'fs';
import * as path from 'path';
import {
  SourceReports,
  buildPrizePoolAttractivenessCsv,
  buildPrizePoolAttractivenessMarkdown,
  runPrizePoolAttractivenessSimulation,
} from '../src/analysis/prizePoolAttractivenessSimulation';

const REPORT_DIR = path.resolve(__dirname, '../reports/real-data');
const COMMISSION_PATH = path.join(REPORT_DIR, 'commission_revenue_model_simulation.json');
const FULL_RULES_PATH = path.join(REPORT_DIR, 'historical_full_rules_backtest.json');
const STRESS_PATH = path.join(REPORT_DIR, 'full_rules_stress_test.json');
const INTRASEASON_PATH = path.join(REPORT_DIR, 'intraseason_trading_backtest.json');
const FEE_COMPARISON_PATH = path.join(REPORT_DIR, 'intraseason_fee_comparison.json');

function readJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Report sorgente mancante: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function main(): void {
  console.log('Prize pool attractiveness simulation');
  const sourceReports: SourceReports = {
    commissionRevenue: readJson(COMMISSION_PATH),
    historicalFullRules: readJson(FULL_RULES_PATH),
    fullRulesStress: readJson(STRESS_PATH),
    intraseasonTrading: readJson(INTRASEASON_PATH),
    intraseasonFeeComparison: fs.existsSync(FEE_COMPARISON_PATH) ? readJson(FEE_COMPARISON_PATH) : undefined,
  };

  const report = runPrizePoolAttractivenessSimulation(sourceReports);
  const jsonPath = path.join(REPORT_DIR, 'prize_pool_attractiveness_simulation.json');
  const csvPath = path.join(REPORT_DIR, 'prize_pool_attractiveness_simulation.csv');
  const mdPath = path.join(REPORT_DIR, 'prize_pool_attractiveness_simulation.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(csvPath, buildPrizePoolAttractivenessCsv(report), 'utf-8');
  fs.writeFileSync(mdPath, buildPrizePoolAttractivenessMarkdown(report), 'utf-8');

  console.log('Output generati:');
  console.log(`  ${jsonPath}`);
  console.log(`  ${csvPath}`);
  console.log(`  ${mdPath}`);
  console.log('');
  console.log('Raccomandazione V1:');
  console.log(`  ${report.recommendation.recommendedV1.id}`);
  console.log(`  entry fee ${report.recommendation.recommendedV1.entryFee}`);
  console.log(`  split prize/system ${(report.recommendation.recommendedV1.prizeEntryShare * 100).toFixed(0)}%/${(report.recommendation.recommendedV1.systemEntryShare * 100).toFixed(0)}%`);
  console.log(`  prize table ${report.recommendation.recommendedV1.prizeTableId}`);
  console.log(`  score ${report.recommendation.recommendedV1.finalScore.toFixed(2)}`);
}

main();
