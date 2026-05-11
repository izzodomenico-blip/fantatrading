import profRaw from '@reports/profitability/profitability_report.json';
import ruleRaw from '@reports/rule-comparison/rule_comparison_detailed.json';
import sensRaw from '@reports/sensitivity/sensitivity_analysis.json';
import optRaw from '@reports/optimizer/optimizer_result.json';
import prizeRaw from '@reports/prize-table-optimizer/prize_table_optimizer.json';
import priceRaw from '@reports/price-model/price_model_analysis.json';

export const profitability = profRaw;
export const ruleComparison = ruleRaw;
export const sensitivity = sensRaw;
export const optimizer = optRaw;
export const prizeTable = prizeRaw;
export const priceModel = priceRaw;

export const COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#a855f7',
  teal: '#14b8a6',
  gray: '#94a3b8',
};

export const MODEL_COLORS: Record<string, string> = {
  M1: '#ef4444',
  M2: '#3b82f6',
  M3: '#22c55e',
  M4: '#a855f7',
  M5: '#f59e0b',
};

export const TOOLTIP_STYLE = {
  contentStyle: { background: '#1e293b', border: '1px solid #2d3f55', borderRadius: 8, fontSize: 13 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#f1f5f9' },
};

export const AXIS_STYLE = { tick: { fill: '#94a3b8', fontSize: 12 }, axisLine: { stroke: '#2d3f55' }, tickLine: false };
export const GRID_STYLE = { strokeDasharray: '3 3', stroke: '#1e3050' };
