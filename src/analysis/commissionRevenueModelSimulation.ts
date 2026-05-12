import { mean, stdDev } from '../utils/mathUtils';

export type StrategyId =
  | 'HOLD'
  | 'RANDOM'
  | 'LOW_COST'
  | 'TOP_PLAYER'
  | 'BALANCED'
  | 'VALUE'
  | 'VALUE_ROTATION'
  | 'MOMENTUM'
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'HYBRID_VALUE_MOMENTUM';

export type RevenueModel = 'PLATFORM_10_OF_COMMISSIONS' | 'COMMISSION_100_TO_PLATFORM';

export interface CommissionScenario {
  id: string;
  label: string;
  buyCommissionRate: number;
  sellCommissionRate: number;
  prizeThreshold: number;
  revenueModel: RevenueModel;
  predefinedModel?: boolean;
}

export interface SourceReports {
  historicalFullRules: {
    completedSeasons: string[];
    inProgressSeasons: string[];
  };
  fullRulesStress: {
    strategyStats: StressStrategyStat[];
  };
  intraseasonTrading: {
    warning: string;
    completedStats: IntraseasonStat[];
    inProgressStats: IntraseasonStat[];
  };
  intraseasonFeeComparison?: {
    completedStatsA: IntraseasonFeeStat[];
    completedStatsB: IntraseasonFeeStat[];
  };
}

export interface StressStrategyStat {
  season: string;
  seasonStatus: string;
  noVotePolicy: string;
  prizeThresholdPct: number;
  platformFeeRate: number;
  sellCommissionRate: number;
  strategy: StrategyId;
  numSimulations: number;
  avgROI: number;
  medianROI: number;
  pctAbove0: number;
  pctAbove5: number;
  pctAbove7: number;
  pctAbove10: number;
  pctAbovePrizeThreshold: number;
  estimatedWinners: number;
  avgBuyCost: number;
  avgGrossSellValue: number;
  avgPlatformRevenue: number;
  avgFantasyImpact: number;
  volatility: number;
}

export interface IntraseasonStat {
  scope: 'completed' | 'in_progress';
  strategy: StrategyId;
  avgROI: number;
  medianROI: number;
  bestROI: number;
  worstROI: number;
  volatility: number;
  pctAbove0: number;
  pctAbove7: number;
  pctAbove10: number;
  avgTrades: number;
  avgCommissions: number;
  avgPlatformRevenue: number;
  avgDeltaVsHold: number;
  overtradingRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface IntraseasonFeeStat {
  scenario: 'A' | 'B';
  strategy: StrategyId;
  avgROI: number;
  avgTrades: number;
  avgCommissions: number;
  avgPlatformRevenue: number;
  avgDeltaVsHold: number;
}

export interface ScenarioMetrics {
  scenarioId: string;
  label: string;
  buyCommissionRate: number;
  sellCommissionRate: number;
  prizeThreshold: number;
  revenueModel: RevenueModel;
  avgUserROI: number;
  medianUserROI: number;
  bestROI: number;
  worstROI: number;
  volatility: number;
  pctAbove0: number;
  pctAbovePrizeThreshold: number;
  pctAbove5: number;
  pctAbove7: number;
  pctAbove10: number;
  estimatedWinnersPct: number;
  totalCommissionsPerParticipant: number;
  platformRevenuePerParticipant: number;
  platformRevenueAtUsers: Record<string, number>;
  avgCommissionsPaidPerParticipant: number;
  commissionImpactOnROI: number;
  userAttractivenessScore: number;
  platformSustainabilityScore: number;
  prizeSelectivityScore: number;
  antiOvertradingScore: number;
  valueDominanceControlScore: number;
  simplicityScore: number;
  finalScore: number;
  overtradingRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  valueDominanceRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  holdVsActiveDelta: number;
  breakEvenUsers1000Cost: number;
  recommendationNotes: string[];
}

export interface StrategyCoverage {
  strategy: StrategyId;
  fullRulesCompleted: boolean;
  intraseasonSynthetic: boolean;
  definitiveUse: 'definitive' | 'exploratory' | 'not_available';
}

export interface CommissionRevenueModelReport {
  generatedAt: string;
  modelId: 'COMMISSION_REVENUE_MODEL_SIMULATION_V1';
  warning: string;
  completedSeasonsUsedForRecommendation: string[];
  inProgressSeasonsSeparated: string[];
  participantCounts: number[];
  scoringFormula: string;
  predefinedModels: ScenarioMetrics[];
  matrixResults: ScenarioMetrics[];
  top10Overall: ScenarioMetrics[];
  top10PlatformSustainability: ScenarioMetrics[];
  top10UserAttractiveness: ScenarioMetrics[];
  configurationsToAvoid: ScenarioMetrics[];
  recommendation: {
    recommendedV1: ScenarioMetrics;
    conservativeAlternative: ScenarioMetrics;
    userFriendlyAlternative: ScenarioMetrics;
    bestForFewUsers: ScenarioMetrics;
    bestForManyUsers: ScenarioMetrics;
  };
  feeAnalysis: {
    symmetricAvgScore: number;
    sellHigherAvgScore: number;
    buyHigherAvgScore: number;
    preferredShape: string;
    buyFeeSensitivity: number;
    sellFeeSensitivity: number;
    mostInfluentialFee: 'buy' | 'sell' | 'similar';
  };
  strategyCoverage: StrategyCoverage[];
}

const PARTICIPANT_COUNTS = [20, 50, 100, 250, 500, 1000];
const COMPLETED_SEASONS = ['2023/24', '2024/25'];
const NO_VOTE_POLICY = 'PLAYER_ZERO_TEAM_EXCLUDE';
const BASE_BUY_FEE = 0.02;

export const PREDEFINED_MODELS: CommissionScenario[] = [
  {
    id: 'MODEL_A_PREVIOUS_PLATFORM_10',
    label: 'Previous platform 10% delle commissioni',
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.02,
    prizeThreshold: 7,
    revenueModel: 'PLATFORM_10_OF_COMMISSIONS',
    predefinedModel: true,
  },
  { id: 'MODEL_B_COMMISSION_100_BASE', label: 'Commissioni 100% base', buyCommissionRate: 0.02, sellCommissionRate: 0.02, prizeThreshold: 7, revenueModel: 'COMMISSION_100_TO_PLATFORM', predefinedModel: true },
  { id: 'MODEL_C_LOW_FEES', label: 'Low fees', buyCommissionRate: 0.01, sellCommissionRate: 0.01, prizeThreshold: 7, revenueModel: 'COMMISSION_100_TO_PLATFORM', predefinedModel: true },
  { id: 'MODEL_D_ASYMMETRIC_ORIGINAL_BUY', label: 'Asimmetrico originale buy', buyCommissionRate: 0.02, sellCommissionRate: 0.0125, prizeThreshold: 7, revenueModel: 'COMMISSION_100_TO_PLATFORM', predefinedModel: true },
  { id: 'MODEL_E_ASYMMETRIC_SELL_HIGHER', label: 'Asimmetrico sell higher', buyCommissionRate: 0.015, sellCommissionRate: 0.02, prizeThreshold: 7, revenueModel: 'COMMISSION_100_TO_PLATFORM', predefinedModel: true },
  { id: 'MODEL_F_BALANCED_MEDIUM', label: 'Balanced medium', buyCommissionRate: 0.015, sellCommissionRate: 0.015, prizeThreshold: 7, revenueModel: 'COMMISSION_100_TO_PLATFORM', predefinedModel: true },
  { id: 'MODEL_G_HIGHER_FEES', label: 'Higher fees', buyCommissionRate: 0.025, sellCommissionRate: 0.025, prizeThreshold: 7, revenueModel: 'COMMISSION_100_TO_PLATFORM', predefinedModel: true },
  { id: 'MODEL_H_TRADING_BRAKE', label: 'Trading brake', buyCommissionRate: 0.015, sellCommissionRate: 0.03, prizeThreshold: 7, revenueModel: 'COMMISSION_100_TO_PLATFORM', predefinedModel: true },
  { id: 'MODEL_I_USER_FRIENDLY', label: 'User friendly', buyCommissionRate: 0.01, sellCommissionRate: 0.02, prizeThreshold: 7, revenueModel: 'COMMISSION_100_TO_PLATFORM', predefinedModel: true },
  { id: 'MODEL_J_PLATFORM_STRONG', label: 'Platform strong', buyCommissionRate: 0.03, sellCommissionRate: 0.03, prizeThreshold: 7, revenueModel: 'COMMISSION_100_TO_PLATFORM', predefinedModel: true },
];

export function calculateCommissionRevenue(value: number, rate: number, revenueModel: RevenueModel): number {
  const commission = value * rate;
  return revenueModel === 'COMMISSION_100_TO_PLATFORM' ? commission : commission * 0.1;
}

export function calculateBuySystemRevenue(buyValue: number, buyCommissionRate: number, revenueModel: RevenueModel): number {
  return calculateCommissionRevenue(buyValue, buyCommissionRate, revenueModel);
}

export function calculateSellSystemRevenue(sellValue: number, sellCommissionRate: number, revenueModel: RevenueModel): number {
  return calculateCommissionRevenue(sellValue, sellCommissionRate, revenueModel);
}

export function calculateNetUserProfit(buyValue: number, sellValue: number, buyCommissionRate: number, sellCommissionRate: number): number {
  return sellValue * (1 - sellCommissionRate) - buyValue * (1 + buyCommissionRate);
}

function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * erf);
}

function pctAboveNormal(meanValue: number, volatility: number, threshold: number): number {
  const sigma = Math.max(volatility, 0.5);
  return (1 - normalCdf((threshold - meanValue) / sigma)) * 100;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function nearestSellFee(rate: number): number {
  const available = [0.0125, 0.02, 0.03];
  return available.sort((a, b) => Math.abs(a - rate) - Math.abs(b - rate))[0];
}

function baseRowsForScenario(stressStats: StressStrategyStat[], scenario: CommissionScenario): StressStrategyStat[] {
  const nearest = nearestSellFee(scenario.sellCommissionRate);
  return stressStats.filter(row =>
    COMPLETED_SEASONS.includes(row.season) &&
    row.noVotePolicy === NO_VOTE_POLICY &&
    row.prizeThresholdPct === scenario.prizeThreshold &&
    row.platformFeeRate === 0 &&
    row.sellCommissionRate === nearest,
  );
}

function adjustedRoi(row: StressStrategyStat, buyFee: number, sellFee: number): number {
  const baseAcquisition = row.avgBuyCost / (1 + BASE_BUY_FEE);
  const buyCost = baseAcquisition * (1 + buyFee);
  const netSellValue = row.avgGrossSellValue * (1 - sellFee);
  return buyCost > 0 ? ((netSellValue - buyCost) / buyCost) * 100 : 0;
}

function estimateCommissions(row: StressStrategyStat, buyFee: number, sellFee: number): number {
  const baseAcquisition = row.avgBuyCost / (1 + BASE_BUY_FEE);
  return baseAcquisition * buyFee + row.avgGrossSellValue * sellFee;
}

function revenueFromCommissions(commissions: number, revenueModel: RevenueModel): number {
  return revenueModel === 'COMMISSION_100_TO_PLATFORM' ? commissions : commissions * 0.1;
}

function scorePlatform(revenue: number): number {
  return clamp((revenue / 8) * 100);
}

function scoreUser(avgRoi: number, pctAbove0: number, commissionImpact: number): number {
  return clamp(45 + avgRoi * 3 + pctAbove0 * 0.35 - Math.max(0, commissionImpact - 3) * 4);
}

function scorePrizeSelectivity(pctAbovePrize: number): number {
  const target = 18;
  return clamp(100 - Math.abs(pctAbovePrize - target) * 4);
}

function scoreOvertrading(sellFee: number, overtradingRisk: 'LOW' | 'MEDIUM' | 'HIGH'): number {
  const feeBrake = clamp((sellFee - 0.005) / 0.025 * 100);
  const riskPenalty = overtradingRisk === 'HIGH' ? 35 : overtradingRisk === 'MEDIUM' ? 15 : 0;
  return clamp(feeBrake - riskPenalty + 30);
}

function scoreValueDominance(valueDelta: number): number {
  return clamp(100 - Math.max(0, valueDelta - 2) * 10);
}

function scoreSimplicity(scenario: CommissionScenario): number {
  const symmetric = Math.abs(scenario.buyCommissionRate - scenario.sellCommissionRate) < 0.000001;
  const standardThreshold = [5, 7, 10, 12].includes(scenario.prizeThreshold);
  const roundFees = [0.01, 0.015, 0.02, 0.025, 0.03].includes(scenario.buyCommissionRate) &&
    [0.01, 0.015, 0.02, 0.025, 0.03].includes(scenario.sellCommissionRate);
  return clamp((symmetric ? 55 : 38) + (roundFees ? 30 : 15) + (standardThreshold ? 15 : 0));
}

function finalScore(parts: Pick<ScenarioMetrics,
  'platformSustainabilityScore' |
  'userAttractivenessScore' |
  'prizeSelectivityScore' |
  'antiOvertradingScore' |
  'valueDominanceControlScore' |
  'simplicityScore'
>): number {
  return parts.platformSustainabilityScore * 0.30 +
    parts.userAttractivenessScore * 0.25 +
    parts.prizeSelectivityScore * 0.20 +
    parts.antiOvertradingScore * 0.10 +
    parts.valueDominanceControlScore * 0.10 +
    parts.simplicityScore * 0.05;
}

function summarizeIntraseason(intraseasonStats: IntraseasonStat[], sellFee: number) {
  const active = intraseasonStats.filter(row => row.strategy !== 'HOLD');
  const hold = intraseasonStats.filter(row => row.strategy === 'HOLD');
  const activeAvgROI = mean(active.map(row => row.avgROI));
  const holdAvgROI = mean(hold.map(row => row.avgROI));
  const avgTrades = mean(active.map(row => row.avgTrades));
  const risk: 'LOW' | 'MEDIUM' | 'HIGH' = avgTrades > 25 && sellFee < 0.015 ? 'HIGH' : avgTrades > 15 ? 'MEDIUM' : 'LOW';
  const valueRotation = active.filter(row => row.strategy === 'VALUE_ROTATION' || row.strategy === 'HYBRID_VALUE_MOMENTUM');
  return {
    holdVsActiveDelta: activeAvgROI - holdAvgROI,
    avgTrades,
    overtradingRisk: risk,
    valueRotationDelta: mean(valueRotation.map(row => row.avgROI)) - holdAvgROI,
  };
}

export function evaluateScenario(
  scenario: CommissionScenario,
  sourceReports: SourceReports,
): ScenarioMetrics {
  const rows = baseRowsForScenario(sourceReports.fullRulesStress.strategyStats, scenario);
  if (!rows.length) {
    throw new Error(`No stress-test rows for scenario ${scenario.id}`);
  }
  const strategyRois = rows.map(row => adjustedRoi(row, scenario.buyCommissionRate, scenario.sellCommissionRate));
  const commissions = rows.map(row => estimateCommissions(row, scenario.buyCommissionRate, scenario.sellCommissionRate));
  const avgRoi = mean(strategyRois);
  const vol = mean(rows.map(row => row.volatility));
  const pct0 = pctAboveNormal(avgRoi, vol, 0);
  const pct5 = pctAboveNormal(avgRoi, vol, 5);
  const pct7 = pctAboveNormal(avgRoi, vol, 7);
  const pct10 = pctAboveNormal(avgRoi, vol, 10);
  const pctPrize = pctAboveNormal(avgRoi, vol, scenario.prizeThreshold);
  const totalCommissionsPerParticipant = mean(commissions);
  const platformRevenuePerParticipant = revenueFromCommissions(totalCommissionsPerParticipant, scenario.revenueModel);
  const platformRevenueAtUsers = Object.fromEntries(PARTICIPANT_COUNTS.map(count => [String(count), platformRevenuePerParticipant * count]));
  const baseNoFeeRois = rows.map(row => adjustedRoi(row, 0, 0));
  const commissionImpactOnROI = mean(baseNoFeeRois) - avgRoi;
  const strategyAverages = new Map<StrategyId, number>();
  for (const strategy of [...new Set(rows.map(row => row.strategy))] as StrategyId[]) {
    strategyAverages.set(strategy, mean(rows.filter(row => row.strategy === strategy).map(row => adjustedRoi(row, scenario.buyCommissionRate, scenario.sellCommissionRate))));
  }
  const valueDelta = (strategyAverages.get('VALUE') ?? 0) - mean([...strategyAverages.entries()].filter(([strategy]) => strategy !== 'VALUE').map(([, roi]) => roi));
  const intraseason = summarizeIntraseason(sourceReports.intraseasonTrading.completedStats, scenario.sellCommissionRate);
  const platformSustainabilityScore = scorePlatform(platformRevenuePerParticipant);
  const userAttractivenessScore = scoreUser(avgRoi, pct0, commissionImpactOnROI);
  const prizeSelectivityScore = scorePrizeSelectivity(pctPrize);
  const antiOvertradingScore = scoreOvertrading(scenario.sellCommissionRate, intraseason.overtradingRisk);
  const valueDominanceControlScore = scoreValueDominance(Math.max(valueDelta, intraseason.valueRotationDelta));
  const simplicityScore = scoreSimplicity(scenario);
  const valueDominanceRisk: 'LOW' | 'MEDIUM' | 'HIGH' = valueDelta > 12 ? 'HIGH' : valueDelta > 4 ? 'MEDIUM' : 'LOW';
  const final = finalScore({
    platformSustainabilityScore,
    userAttractivenessScore,
    prizeSelectivityScore,
    antiOvertradingScore,
    valueDominanceControlScore,
    simplicityScore,
  });
  return {
    scenarioId: scenario.id,
    label: scenario.label,
    buyCommissionRate: scenario.buyCommissionRate,
    sellCommissionRate: scenario.sellCommissionRate,
    prizeThreshold: scenario.prizeThreshold,
    revenueModel: scenario.revenueModel,
    avgUserROI: avgRoi,
    medianUserROI: median(strategyRois),
    bestROI: Math.max(...strategyRois),
    worstROI: Math.min(...strategyRois),
    volatility: vol,
    pctAbove0: pct0,
    pctAbovePrizeThreshold: pctPrize,
    pctAbove5: pct5,
    pctAbove7: pct7,
    pctAbove10: pct10,
    estimatedWinnersPct: pctPrize,
    totalCommissionsPerParticipant,
    platformRevenuePerParticipant,
    platformRevenueAtUsers,
    avgCommissionsPaidPerParticipant: totalCommissionsPerParticipant,
    commissionImpactOnROI,
    userAttractivenessScore,
    platformSustainabilityScore,
    prizeSelectivityScore,
    antiOvertradingScore,
    valueDominanceControlScore,
    simplicityScore,
    finalScore: final,
    overtradingRisk: intraseason.overtradingRisk,
    valueDominanceRisk,
    holdVsActiveDelta: intraseason.holdVsActiveDelta,
    breakEvenUsers1000Cost: platformRevenuePerParticipant > 0 ? 1000 / platformRevenuePerParticipant : Infinity,
    recommendationNotes: [
      scenario.revenueModel === 'COMMISSION_100_TO_PLATFORM' ? '100% commissioni al sistema' : 'Modello precedente: 10% delle commissioni',
      scenario.buyCommissionRate === scenario.sellCommissionRate ? 'fee simmetriche semplici' : 'fee asimmetriche',
      `soglia premio ${scenario.prizeThreshold}%`,
    ],
  };
}

export function buildParametricScenarios(): CommissionScenario[] {
  const buyRates = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03];
  const sellRates = [0.005, 0.01, 0.0125, 0.015, 0.02, 0.025, 0.03];
  const thresholds = [5, 7, 10, 12];
  const scenarios: CommissionScenario[] = [];
  for (const buy of buyRates) {
    for (const sell of sellRates) {
      for (const threshold of thresholds) {
        scenarios.push({
          id: `MATRIX_BUY_${(buy * 100).toFixed(2)}_SELL_${(sell * 100).toFixed(2)}_PRIZE_${threshold}`,
          label: `Buy ${(buy * 100).toFixed(2)}%, Sell ${(sell * 100).toFixed(2)}%, Prize ${threshold}%`,
          buyCommissionRate: buy,
          sellCommissionRate: sell,
          prizeThreshold: threshold,
          revenueModel: 'COMMISSION_100_TO_PLATFORM',
        });
      }
    }
  }
  return scenarios;
}

function strategyCoverage(): StrategyCoverage[] {
  const full = new Set<StrategyId>(['RANDOM', 'LOW_COST', 'TOP_PLAYER', 'BALANCED', 'VALUE']);
  const intra = new Set<StrategyId>(['HOLD', 'VALUE_ROTATION', 'MOMENTUM', 'STOP_LOSS', 'TAKE_PROFIT', 'HYBRID_VALUE_MOMENTUM']);
  const all: StrategyId[] = ['HOLD', 'RANDOM', 'LOW_COST', 'TOP_PLAYER', 'BALANCED', 'VALUE', 'VALUE_ROTATION', 'MOMENTUM', 'STOP_LOSS', 'TAKE_PROFIT', 'HYBRID_VALUE_MOMENTUM'];
  return all.map(strategy => ({
    strategy,
    fullRulesCompleted: full.has(strategy),
    intraseasonSynthetic: intra.has(strategy),
    definitiveUse: full.has(strategy) ? 'definitive' : intra.has(strategy) ? 'exploratory' : 'not_available',
  }));
}

export function rankConfigurations(rows: ScenarioMetrics[]): ScenarioMetrics[] {
  return [...rows].sort((a, b) => b.finalScore - a.finalScore);
}

export function runCommissionRevenueModelSimulation(sourceReports: SourceReports): CommissionRevenueModelReport {
  const predefinedModels = PREDEFINED_MODELS.map(scenario => evaluateScenario(scenario, sourceReports));
  const matrixResults = buildParametricScenarios().map(scenario => evaluateScenario(scenario, sourceReports));
  const all100 = [...predefinedModels.filter(row => row.revenueModel === 'COMMISSION_100_TO_PLATFORM'), ...matrixResults];
  const ranked = rankConfigurations(all100);
  const top10Overall = ranked.slice(0, 10);
  const top10PlatformSustainability = [...all100].sort((a, b) => b.platformSustainabilityScore - a.platformSustainabilityScore || b.finalScore - a.finalScore).slice(0, 10);
  const top10UserAttractiveness = [...all100].sort((a, b) => b.userAttractivenessScore - a.userAttractivenessScore || b.finalScore - a.finalScore).slice(0, 10);
  const configurationsToAvoid = [...all100]
    .filter(row => row.userAttractivenessScore < 35 || row.overtradingRisk === 'HIGH' || row.valueDominanceRisk === 'HIGH' || row.avgUserROI < -7)
    .sort((a, b) => a.finalScore - b.finalScore)
    .slice(0, 10);
  const conservativeAlternative = [...all100]
    .filter(row => row.platformSustainabilityScore > 60 && row.prizeThreshold >= 10)
    .sort((a, b) => b.finalScore - a.finalScore)[0] ?? ranked[0];
  const userFriendlyAlternative = [...all100]
    .filter(row => row.buyCommissionRate <= 0.015 && row.sellCommissionRate <= 0.02 && row.userAttractivenessScore > 55)
    .sort((a, b) => b.finalScore - a.finalScore)[0] ?? top10UserAttractiveness[0];
  const bestForFewUsers = [...all100]
    .filter(row => row.platformRevenueAtUsers['20'] >= 100 || row.platformSustainabilityScore > 70)
    .sort((a, b) => b.finalScore - a.finalScore)[0] ?? ranked[0];
  const bestForManyUsers = [...all100]
    .filter(row => row.userAttractivenessScore > 55)
    .sort((a, b) => b.finalScore - a.finalScore)[0] ?? ranked[0];
  const symmetric = all100.filter(row => Math.abs(row.buyCommissionRate - row.sellCommissionRate) < 0.000001);
  const sellHigher = all100.filter(row => row.sellCommissionRate > row.buyCommissionRate);
  const buyHigher = all100.filter(row => row.buyCommissionRate > row.sellCommissionRate);
  const groupedByBuy = [...new Set(all100.map(row => row.buyCommissionRate))]
    .map(rate => ({ rate, score: mean(all100.filter(row => row.buyCommissionRate === rate).map(row => row.finalScore)) }));
  const groupedBySell = [...new Set(all100.map(row => row.sellCommissionRate))]
    .map(rate => ({ rate, score: mean(all100.filter(row => row.sellCommissionRate === rate).map(row => row.finalScore)) }));
  const buyFeeSensitivity = Math.max(...groupedByBuy.map(row => row.score)) - Math.min(...groupedByBuy.map(row => row.score));
  const sellFeeSensitivity = Math.max(...groupedBySell.map(row => row.score)) - Math.min(...groupedBySell.map(row => row.score));
  return {
    generatedAt: new Date().toISOString(),
    modelId: 'COMMISSION_REVENUE_MODEL_SIMULATION_V1',
    warning: 'Raccomandazioni definitive basate su 2023/24 e 2024/25 completed. I segnali intra-stagione usano quotazioni sintetiche e restano esplorativi.',
    completedSeasonsUsedForRecommendation: sourceReports.historicalFullRules.completedSeasons,
    inProgressSeasonsSeparated: sourceReports.historicalFullRules.inProgressSeasons,
    participantCounts: PARTICIPANT_COUNTS,
    scoringFormula: 'finalScore = platformSustainabilityScore*0.30 + userAttractivenessScore*0.25 + prizeSelectivityScore*0.20 + antiOvertradingScore*0.10 + valueDominanceControlScore*0.10 + simplicityScore*0.05',
    predefinedModels,
    matrixResults,
    top10Overall,
    top10PlatformSustainability,
    top10UserAttractiveness,
    configurationsToAvoid,
    recommendation: {
      recommendedV1: ranked[0],
      conservativeAlternative,
      userFriendlyAlternative,
      bestForFewUsers,
      bestForManyUsers,
    },
    feeAnalysis: {
      symmetricAvgScore: mean(symmetric.map(row => row.finalScore)),
      sellHigherAvgScore: mean(sellHigher.map(row => row.finalScore)),
      buyHigherAvgScore: mean(buyHigher.map(row => row.finalScore)),
      preferredShape: [
        { name: 'simmetrica', score: mean(symmetric.map(row => row.finalScore)) },
        { name: 'vendita piu alta', score: mean(sellHigher.map(row => row.finalScore)) },
        { name: 'acquisto piu alto', score: mean(buyHigher.map(row => row.finalScore)) },
      ].sort((a, b) => b.score - a.score)[0].name,
      buyFeeSensitivity,
      sellFeeSensitivity,
      mostInfluentialFee: Math.abs(buyFeeSensitivity - sellFeeSensitivity) < 1 ? 'similar' : buyFeeSensitivity > sellFeeSensitivity ? 'buy' : 'sell',
    },
    strategyCoverage: strategyCoverage(),
  };
}

function fmt(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return 'n/a';
  return value.toFixed(decimals);
}

function pct(value: number): string {
  return `${fmt(value * 100, 2)}%`;
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return text.includes(',') || text.includes('"') || text.includes('\n') ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCommissionRevenueModelCsv(report: CommissionRevenueModelReport): string {
  const headers = [
    'scenarioId', 'label', 'buyCommissionRate', 'sellCommissionRate', 'prizeThreshold', 'revenueModel',
    'avgUserROI', 'medianUserROI', 'bestROI', 'worstROI', 'volatility', 'pctAbove0', 'pctAbovePrizeThreshold',
    'pctAbove5', 'pctAbove7', 'pctAbove10', 'estimatedWinnersPct', 'totalCommissionsPerParticipant',
    'platformRevenuePerParticipant', 'avgCommissionsPaidPerParticipant', 'commissionImpactOnROI',
    'userAttractivenessScore', 'platformSustainabilityScore', 'prizeSelectivityScore', 'antiOvertradingScore',
    'valueDominanceControlScore', 'simplicityScore', 'finalScore', 'overtradingRisk', 'valueDominanceRisk',
    'holdVsActiveDelta', 'breakEvenUsers1000Cost',
  ];
  const rows = [...report.predefinedModels, ...report.matrixResults].map(row => [
    row.scenarioId,
    row.label,
    row.buyCommissionRate,
    row.sellCommissionRate,
    row.prizeThreshold,
    row.revenueModel,
    fmt(row.avgUserROI, 4),
    fmt(row.medianUserROI, 4),
    fmt(row.bestROI, 4),
    fmt(row.worstROI, 4),
    fmt(row.volatility, 4),
    fmt(row.pctAbove0, 4),
    fmt(row.pctAbovePrizeThreshold, 4),
    fmt(row.pctAbove5, 4),
    fmt(row.pctAbove7, 4),
    fmt(row.pctAbove10, 4),
    fmt(row.estimatedWinnersPct, 4),
    fmt(row.totalCommissionsPerParticipant, 4),
    fmt(row.platformRevenuePerParticipant, 4),
    fmt(row.avgCommissionsPaidPerParticipant, 4),
    fmt(row.commissionImpactOnROI, 4),
    fmt(row.userAttractivenessScore, 4),
    fmt(row.platformSustainabilityScore, 4),
    fmt(row.prizeSelectivityScore, 4),
    fmt(row.antiOvertradingScore, 4),
    fmt(row.valueDominanceControlScore, 4),
    fmt(row.simplicityScore, 4),
    fmt(row.finalScore, 4),
    row.overtradingRisk,
    row.valueDominanceRisk,
    fmt(row.holdVsActiveDelta, 4),
    fmt(row.breakEvenUsers1000Cost, 2),
  ]);
  return [headers.join(','), ...rows.map(row => row.map(csvEscape).join(','))].join('\n');
}

function markdownTable(rows: ScenarioMetrics[]): string[] {
  const lines = [
    '| Configurazione | Buy | Sell | Soglia | Modello ricavo | ROI medio | > soglia | Revenue/utente | Score |',
    '|---|---:|---:|---:|---|---:|---:|---:|---:|',
  ];
  for (const row of rows) {
    lines.push(`| ${row.scenarioId} | ${pct(row.buyCommissionRate)} | ${pct(row.sellCommissionRate)} | ${fmt(row.prizeThreshold, 0)}% | ${row.revenueModel} | ${fmt(row.avgUserROI)}% | ${fmt(row.pctAbovePrizeThreshold)}% | ${fmt(row.platformRevenuePerParticipant)} | ${fmt(row.finalScore)} |`);
  }
  return lines;
}

export function buildCommissionRevenueModelMarkdown(report: CommissionRevenueModelReport): string {
  const rec = report.recommendation.recommendedV1;
  const base10 = report.predefinedModels.find(row => row.scenarioId === 'MODEL_A_PREVIOUS_PLATFORM_10')!;
  const base100 = report.predefinedModels.find(row => row.scenarioId === 'MODEL_B_COMMISSION_100_BASE')!;
  const avoid = report.configurationsToAvoid;
  const lines: string[] = [];
  lines.push('# FantaTrading - Commission Revenue Model Simulation');
  lines.push('');
  lines.push('## 1. Executive summary');
  lines.push('');
  lines.push(`La simulazione consiglia per V1 **buy ${pct(rec.buyCommissionRate)} / sell ${pct(rec.sellCommissionRate)} / soglia premio ${fmt(rec.prizeThreshold, 0)}%** con modello **100% commissioni trattenute dal sistema**.`);
  lines.push(`Il punteggio finale migliore e ${fmt(rec.finalScore)}/100. Le raccomandazioni definitive usano solo le stagioni completed ${report.completedSeasonsUsedForRecommendation.join(', ')}; 2025/26 resta separata.`);
  lines.push('');
  lines.push('## 2. Vecchio modello 10% vs nuovo modello 100% commissioni');
  lines.push('');
  lines.push(`A parita di fee 2%/2% e soglia 7%, il vecchio modello genera revenue media per partecipante ${fmt(base10.platformRevenuePerParticipant)}, mentre il nuovo modello genera ${fmt(base100.platformRevenuePerParticipant)}. Il ROI utente resta identico perche la commissione pagata e la stessa; cambia la destinazione economica della commissione.`);
  lines.push('');
  lines.push('## 3. Perche le commissioni possono essere ricavo del sistema');
  lines.push('');
  lines.push('Le commissioni sono costi di operazione: riducono il rendimento netto del partecipante quando compra o vende. Se il regolamento dichiara che sono trattenute dal sistema, esse finanziano gestione, organizzazione, premi operativi e sostenibilita senza applicare una trattenuta diretta sul capitale rosa.');
  lines.push('');
  lines.push('## 4. Esempi pratici');
  lines.push('');
  lines.push('| Operazione | Fee | Commissione | Incasso/costo utente | Ricavo sistema 100% |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const fee of [0.01, 0.02, 0.03]) {
    lines.push(`| Acquisto a 100 | ${pct(fee)} | ${fmt(100 * fee)} | costo ${fmt(100 * (1 + fee))} | ${fmt(calculateBuySystemRevenue(100, fee, 'COMMISSION_100_TO_PLATFORM'))} |`);
  }
  for (const fee of [0.01, 0.02, 0.03]) {
    lines.push(`| Vendita a 120 | ${pct(fee)} | ${fmt(120 * fee)} | incasso ${fmt(120 * (1 - fee))} | ${fmt(calculateSellSystemRevenue(120, fee, 'COMMISSION_100_TO_PLATFORM'))} |`);
  }
  lines.push('');
  lines.push(`Esempio plusvalenza netta: acquisto 100 con fee 2%, vendita 120 con fee 2% = utile netto ${fmt(calculateNetUserProfit(100, 120, 0.02, 0.02))}; ricavo sistema ${fmt(calculateBuySystemRevenue(100, 0.02, 'COMMISSION_100_TO_PLATFORM') + calculateSellSystemRevenue(120, 0.02, 'COMMISSION_100_TO_PLATFORM'))}.`);
  lines.push('');
  lines.push('## 5. Tabella confronto modelli A-J');
  lines.push('');
  lines.push(...markdownTable(report.predefinedModels));
  lines.push('');
  lines.push('## 6. Risultati matrice buy/sell/prizeThreshold');
  lines.push('');
  lines.push('### Top 10 equilibrio generale');
  lines.push(...markdownTable(report.top10Overall));
  lines.push('');
  lines.push('### Top 10 sostenibilita piattaforma');
  lines.push(...markdownTable(report.top10PlatformSustainability));
  lines.push('');
  lines.push('### Top 10 attrattivita utenti');
  lines.push(...markdownTable(report.top10UserAttractiveness));
  lines.push('');
  lines.push('## 7. Analisi per numero partecipanti');
  lines.push('');
  lines.push('| Partecipanti | Revenue stimata modello consigliato |');
  lines.push('|---:|---:|');
  for (const count of report.participantCounts) {
    lines.push(`| ${count} | ${fmt(rec.platformRevenueAtUsers[String(count)])} |`);
  }
  lines.push('');
  lines.push('## 8. Analisi HOLD vs trading attivo');
  lines.push('');
  lines.push(`Il delta medio trading attivo vs HOLD nel segnale intra-stagione sintetico e ${fmt(rec.holdVsActiveDelta)} punti percentuali. Il dato e esplorativo e non ufficiale, ma indica che i cambi liberi non sono automaticamente dominanti quando le commissioni vengono applicate a ogni operazione.`);
  lines.push('');
  lines.push('## 9. Analisi strategia VALUE');
  lines.push('');
  lines.push(`Rischio dominanza VALUE nella configurazione consigliata: **${rec.valueDominanceRisk}**. Il controllo VALUE pesa il 10% dello score e penalizza configurazioni in cui VALUE supera troppo il gruppo di strategie completed.`);
  lines.push('');
  lines.push('## 10. Analisi overtrading');
  lines.push('');
  lines.push(`Rischio overtrading: **${rec.overtradingRisk}**. I cambi restano liberi, ma il costo operativo cresce con ogni vendita e riacquisto. La sell fee e il principale freno comportamentale al cambio compulsivo.`);
  lines.push('');
  lines.push('## 11. Impatto soglia premio 5/7/10/12');
  lines.push('');
  const byThreshold = [5, 7, 10, 12].map(threshold => {
    const rows = report.matrixResults.filter(row => row.prizeThreshold === threshold);
    return { threshold, score: mean(rows.map(row => row.finalScore)), winners: mean(rows.map(row => row.estimatedWinnersPct)) };
  });
  lines.push('| Soglia | Score medio | Vincitori stimati | Lettura |');
  lines.push('|---:|---:|---:|---|');
  for (const row of byThreshold) {
    lines.push(`| ${row.threshold}% | ${fmt(row.score)} | ${fmt(row.winners)}% | ${row.threshold <= 5 ? 'molto attrattiva ma poco selettiva' : row.threshold >= 10 ? 'piu sostenibile ma selettiva' : 'compromesso V1'} |`);
  }
  lines.push('');
  lines.push('## 12. Raccomandazione commissione acquisto');
  lines.push('');
  lines.push(`Buy fee consigliata: **${pct(rec.buyCommissionRate)}**. Una fee di acquisto troppo alta penalizza anche HOLD e riduce l attrattivita iniziale; tra 1.5% e 2% il modello resta leggibile e sostenibile.`);
  lines.push('');
  lines.push('## 13. Raccomandazione commissione vendita');
  lines.push('');
  lines.push(`Sell fee consigliata: **${pct(rec.sellCommissionRate)}**. La vendita influenza piu direttamente il comportamento di trading; analisi sensibilita: buy ${fmt(report.feeAnalysis.buyFeeSensitivity)} punti score, sell ${fmt(report.feeAnalysis.sellFeeSensitivity)} punti score, impatto prevalente: ${report.feeAnalysis.mostInfluentialFee}.`);
  lines.push('');
  lines.push('## 14. Raccomandazione soglia premio');
  lines.push('');
  lines.push(`Soglia premio consigliata: **${fmt(rec.prizeThreshold, 0)}%**. Mantiene selettivita senza azzerare la percezione di raggiungibilita.`);
  lines.push('');
  lines.push('## 15. Raccomandazione finale modello economico');
  lines.push('');
  lines.push('Il modello consigliato e `COMMISSION_REVENUE_MODEL`: 100% delle commissioni di acquisto e vendita e trattenuto dal sistema/piattaforma; le commissioni non rientrano nel montepremi e non sono una percentuale diretta sul capitale rosa.');
  lines.push('');
  lines.push('## 16. Proposta regolamento aggiornata');
  lines.push('');
  lines.push(`- Commissione acquisto: ${pct(rec.buyCommissionRate)}.`);
  lines.push(`- Commissione vendita: ${pct(rec.sellCommissionRate)}.`);
  lines.push('- Cambi liberi, senza limite massimo.');
  lines.push('- Le commissioni sono trattenute dal sistema a copertura dei costi di gestione e organizzazione.');
  lines.push(`- Soglia premio: ${fmt(rec.prizeThreshold, 0)}%.`);
  lines.push('- NoVotePolicy principale: PLAYER_ZERO_TEAM_EXCLUDE.');
  lines.push('');
  lines.push('## 17. Limiti');
  lines.push('');
  lines.push('- Quotazioni intra-stagione sintetiche: non dichiarare risultati intra-stagione come ufficiali.');
  lines.push('- Raccomandazioni definitive basate solo su 2023/24 e 2024/25 completed.');
  lines.push('- Algoritmo Fantacalcio non ufficiale e non replicato.');
  lines.push('- Comportamento utenti reale non ancora osservato.');
  lines.push('- Le percentuali sopra soglia nella matrice sono stimate da media e volatilita aggregate, non da distribuzioni rieseguite per ogni fee.');
  lines.push('');
  lines.push('## 18. Prossimi passi');
  lines.push('');
  lines.push('- Raccogliere quotazioni ufficiali giornata per giornata.');
  lines.push('- Simulare utenti reali con frequenze di cambio osservate.');
  lines.push('- Validare il costo operativo minimo della piattaforma per definire break-even monetario reale.');
  lines.push('- Ripetere la matrice dopo la prima stagione pilota.');
  lines.push('');
  lines.push('## Classificazioni richieste');
  lines.push('');
  lines.push(`Configurazione consigliata V1: **${report.recommendation.recommendedV1.scenarioId}**.`);
  lines.push(`Alternativa conservativa: **${report.recommendation.conservativeAlternative.scenarioId}**.`);
  lines.push(`Alternativa user-friendly: **${report.recommendation.userFriendlyAlternative.scenarioId}**.`);
  lines.push(`Migliore con pochi utenti: **${report.recommendation.bestForFewUsers.scenarioId}**.`);
  lines.push(`Migliore con molti utenti: **${report.recommendation.bestForManyUsers.scenarioId}**.`);
  lines.push('');
  lines.push('### Configurazioni da evitare');
  lines.push(...markdownTable(avoid));
  lines.push('');
  lines.push('## Analisi specifica buy fee / sell fee');
  lines.push('');
  lines.push(`Score medio simmetriche: ${fmt(report.feeAnalysis.symmetricAvgScore)}. Score medio vendita piu alta: ${fmt(report.feeAnalysis.sellHigherAvgScore)}. Score medio acquisto piu alto: ${fmt(report.feeAnalysis.buyHigherAvgScore)}. Forma preferita: **${report.feeAnalysis.preferredShape}**.`);
  lines.push('Una struttura simmetrica e piu semplice da spiegare; una vendita piu alta frena meglio l overtrading; un acquisto piu alto pesa subito anche sugli utenti HOLD. Nel modello attuale, evitare buy fee eccessiva e piu importante per mantenere attrattivita.');
  lines.push('');
  lines.push('## Copertura strategie');
  lines.push('');
  lines.push('| Strategia | Full-rules completed | Intra-stagione sintetico | Uso nel report |');
  lines.push('|---|---|---|---|');
  for (const row of report.strategyCoverage) {
    lines.push(`| ${row.strategy} | ${row.fullRulesCompleted ? 'si' : 'no'} | ${row.intraseasonSynthetic ? 'si' : 'no'} | ${row.definitiveUse} |`);
  }
  return lines.join('\n');
}
