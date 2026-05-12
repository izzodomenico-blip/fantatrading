import * as fs from 'fs';
import * as path from 'path';
import {
  SourceReports,
  buildCommissionRevenueModelCsv,
  buildCommissionRevenueModelMarkdown,
  runCommissionRevenueModelSimulation,
} from '../src/analysis/commissionRevenueModelSimulation';

const REPORT_DIR = path.resolve(__dirname, '../reports/real-data');
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
  console.log('Commission revenue model simulation');
  const sourceReports: SourceReports = {
    historicalFullRules: readJson(FULL_RULES_PATH),
    fullRulesStress: readJson(STRESS_PATH),
    intraseasonTrading: readJson(INTRASEASON_PATH),
    intraseasonFeeComparison: fs.existsSync(FEE_COMPARISON_PATH) ? readJson(FEE_COMPARISON_PATH) : undefined,
  };

  const report = runCommissionRevenueModelSimulation(sourceReports);
  const jsonPath = path.join(REPORT_DIR, 'commission_revenue_model_simulation.json');
  const csvPath = path.join(REPORT_DIR, 'commission_revenue_model_simulation.csv');
  const mdPath = path.join(REPORT_DIR, 'commission_revenue_model_simulation.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(csvPath, buildCommissionRevenueModelCsv(report), 'utf-8');
  fs.writeFileSync(mdPath, buildCommissionRevenueModelMarkdown(report), 'utf-8');

  console.log('Output generati:');
  console.log(`  ${jsonPath}`);
  console.log(`  ${csvPath}`);
  console.log(`  ${mdPath}`);
  console.log('');
  console.log('Raccomandazione V1:');
  console.log(`  ${report.recommendation.recommendedV1.scenarioId}`);
  console.log(`  buy ${(report.recommendation.recommendedV1.buyCommissionRate * 100).toFixed(2)}%`);
  console.log(`  sell ${(report.recommendation.recommendedV1.sellCommissionRate * 100).toFixed(2)}%`);
  console.log(`  prize threshold ${report.recommendation.recommendedV1.prizeThreshold}%`);
  console.log(`  score ${report.recommendation.recommendedV1.finalScore.toFixed(2)}`);
}

main();
