import * as fs from 'fs';
import * as path from 'path';
import {
  SYNTHETIC_QUOTE_OPERATIONAL_MODEL,
  isOracleOperationalModel,
} from '../../src/config/syntheticQuoteOperationalModel';

describe('syntheticQuoteOperationalModel', () => {
  test('configura ROLE_BONUS_SENSITIVE come modello operativo', () => {
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.modelName).toBe('ROLE_BONUS_SENSITIVE');
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.purpose).toBe('exploratory_intraseason_trading_simulation');
  });

  test('non dichiara ufficialita Fantacalcio', () => {
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.isOfficialFantacalcio).toBe(false);
  });

  test('include metriche operative essenziali', () => {
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.metrics.mae).toBeGreaterThan(0);
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.metrics.rmse).toBeGreaterThan(0);
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.metrics.within1Pct).toBeGreaterThan(0);
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.metrics.within2Pct).toBeGreaterThan(0);
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.metrics.within3Pct).toBeGreaterThan(0);
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.metrics.attackerMae).toBeGreaterThan(0);
  });

  test('ORACLE non puo essere modello operativo', () => {
    expect(isOracleOperationalModel('ORACLE_FINAL_ANCHOR')).toBe(true);
    expect(SYNTHETIC_QUOTE_OPERATIONAL_MODEL.modelName).not.toBe('ORACLE_FINAL_ANCHOR');
  });

  test('report operativo generato', () => {
    const reportPath = path.resolve(__dirname, '../../reports/real-data/synthetic_quote_operational_model.md');
    expect(fs.existsSync(reportPath)).toBe(true);
    expect(fs.readFileSync(reportPath, 'utf-8')).toContain('ROLE_BONUS_SENSITIVE');
  });
});
