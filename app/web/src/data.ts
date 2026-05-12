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

const firstGlobValue = <T>(modules: Record<string, unknown>): T | null => {
  const values = Object.values(modules);
  return values.length > 0 ? (values[0] as T) : null;
};

export interface FullRulesBacktestStat {
  strategy: string;
  noVotePolicy: string;
  numSeasons: number;
  numSimulations: number;
  avgTradingOnlyROI: number;
  avgFullRulesROI: number;
  medianFullRulesROI: number;
  fantasyImpactAvg: number;
  pctAbove0: number;
  pctAbove5: number;
  pctAbove7: number;
  pctAbove10: number;
  bestROI: number;
  worstROI: number;
  volatility: number;
  avgDerivedNoVotes: number;
}

export interface FullRulesBacktestReport {
  generatedAt: string;
  modelId: string;
  completedSeasons: string[];
  inProgressSeasons: string[];
  strategies: string[];
  aggregateCompletedStats: FullRulesBacktestStat[];
  strongestStrategy: string;
  recommendedNoVotePolicy: string;
}

export interface FullRulesStressSummary {
  scope: string;
  noVotePolicy: string;
  prizeThresholdPct: number;
  platformFeeRate: number;
  sellCommissionRate: number;
  avgROI: number;
  pctAbove0: number;
  pctAbove5: number;
  pctAbove7: number;
  pctAbove10: number;
  pctAbovePrizeThreshold: number;
  estimatedWinners: number;
  avgPlatformRevenue: number;
  valueAvgROI: number;
  randomAvgROI: number;
  valueDeltaVsRandom: number;
  valueDominanceRisk: string;
  platformSustainability: string;
  userAttractiveness: string;
  score: number;
}

export interface FullRulesStressReport {
  generatedAt: string;
  config: {
    prizeThresholds: number[];
    platformFeeRates: number[];
    sellCommissionRates: number[];
  };
  completedSeasons: string[];
  inProgressSeasons: string[];
  mainPolicies: string[];
  appendixPolicies: string[];
  combinationSummaries: FullRulesStressSummary[];
  appendixSummaries: FullRulesStressSummary[];
  recommended: FullRulesStressSummary;
}

export interface PrizePoolScenarioMetric {
  id: string;
  modelId: string;
  participants: number;
  entryFee: number;
  prizeEntryShare: number;
  systemEntryShare: number;
  commissionSystemShare: number;
  buyCommissionRate: number;
  sellCommissionRate: number;
  prizeThreshold: number;
  prizeTableId: string;
  grossPrizePool: number;
  netDistributablePrizePool: number;
  systemRevenueFromEntries: number;
  systemRevenueFromCommissions: number;
  totalSystemRevenue: number;
  firstPrize: number;
  averageWinnerPrize: number;
  estimatedWinners: number;
  probabilityOfWinning: number;
  finalScore: number;
}

export interface PrizePoolAttractivenessReport {
  generatedAt: string;
  modelId: string;
  warning: string;
  matrixResults: PrizePoolScenarioMetric[];
  recommendation: {
    recommendedV1: PrizePoolScenarioMetric;
    recommendedPilot: PrizePoolScenarioMetric;
    recommendedScale: PrizePoolScenarioMetric;
  };
}

const fullRulesBacktestModules = import.meta.glob('@reports/real-data/historical_full_rules_backtest.json', {
  eager: true,
  import: 'default',
});
const fullRulesStressModules = import.meta.glob('@reports/real-data/full_rules_stress_test.json', {
  eager: true,
  import: 'default',
});
const recommendedRulesModules = import.meta.glob('@reports/final/REGOLAMENTO_V1_CONSIGLIATO.md', {
  eager: true,
  import: 'default',
  query: '?raw',
});
const userRulesModules = import.meta.glob('@reports/final/REGOLAMENTO_FANTATRADING_V1_UTENTE.md', {
  eager: true,
  import: 'default',
  query: '?raw',
});
const prizePoolAttractivenessModules = import.meta.glob('@reports/real-data/prize_pool_attractiveness_simulation.json', {
  import: 'default',
  query: '?url',
});
const prizePoolAttractivenessMarkdownModules = import.meta.glob('@reports/real-data/prize_pool_attractiveness_simulation.md', {
  eager: true,
  import: 'default',
  query: '?raw',
});

export const fullRulesBacktest = firstGlobValue<FullRulesBacktestReport>(fullRulesBacktestModules);
export const fullRulesStressTest = firstGlobValue<FullRulesStressReport>(fullRulesStressModules);
export const recommendedRulesMarkdown = firstGlobValue<string>(recommendedRulesModules);
export const userRulesMarkdown = firstGlobValue<string>(userRulesModules);
export const prizePoolAttractivenessMarkdown = firstGlobValue<string>(prizePoolAttractivenessMarkdownModules);

export async function loadPrizePoolAttractiveness(): Promise<PrizePoolAttractivenessReport | null> {
  const loaders = Object.values(prizePoolAttractivenessModules) as Array<() => Promise<string>>;
  if (loaders.length === 0) return null;
  const url = await loaders[0]();
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json() as Promise<PrizePoolAttractivenessReport>;
}

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
