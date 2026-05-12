import { mean } from '../utils/mathUtils';
import { ScenarioMetrics as CommissionScenarioMetrics } from './commissionRevenueModelSimulation';

export type PrizePoolModelId =
  | 'MODEL_A_ENTRY_FEE_100_TO_PRIZE'
  | 'MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM'
  | 'MODEL_C_ENTRY_FEE_70_PRIZE_30_SYSTEM'
  | 'MODEL_D_GUARANTEED_PRIZE_POOL'
  | 'MODEL_E_MIXED_COMMISSION_SPLIT'
  | 'MODEL_F_SPONSOR_BOOST';

export type PrizeTableId =
  | 'PRIZE_TABLE_TOP_3'
  | 'PRIZE_TABLE_TOP_5'
  | 'PRIZE_TABLE_TOP_10_PERCENT'
  | 'PRIZE_TABLE_THRESHOLD_POOL'
  | 'PRIZE_TABLE_HYBRID';

export interface SourceReports {
  commissionRevenue: {
    matrixResults: CommissionScenarioMetrics[];
    predefinedModels: CommissionScenarioMetrics[];
    recommendation: {
      recommendedV1: CommissionScenarioMetrics;
    };
  };
  historicalFullRules: {
    completedSeasons: string[];
    inProgressSeasons: string[];
  };
  fullRulesStress: {
    strategyStats: Array<{
      season: string;
      seasonStatus: string;
      noVotePolicy: string;
      prizeThresholdPct: number;
      strategy: string;
      avgROI: number;
      pctAbove0: number;
      pctAbove5: number;
      pctAbove7: number;
      pctAbove10: number;
    }>;
  };
  intraseasonTrading: {
    warning: string;
  };
  intraseasonFeeComparison?: unknown;
}

export interface PrizePoolScenario {
  id: string;
  modelId: PrizePoolModelId;
  label: string;
  participants: number;
  entryFee: number;
  prizeEntryShare: number;
  systemEntryShare: number;
  guaranteedPrizePool: number;
  sponsorBoost: number;
  commissionSystemShare: number;
  commissionPrizeShare: number;
  buyCommissionRate: number;
  sellCommissionRate: number;
  prizeThreshold: number;
  prizeTableId: PrizeTableId;
}

export interface PrizePoolMetrics extends PrizePoolScenario {
  grossPrizePool: number;
  netDistributablePrizePool: number;
  systemRevenueFromEntries: number;
  systemRevenueFromCommissions: number;
  totalSystemRevenue: number;
  guaranteedPrizePoolCost: number;
  systemProfitLoss: number;
  breakEvenParticipants: number;
  firstPrize: number;
  averageWinnerPrize: number;
  estimatedWinners: number;
  probabilityOfWinning: number;
  averageUserExpectedValue: number;
  aboveThresholdExpectedValue: number;
  avgUserRoiBeforePrizes: number;
  avgUserRoiAfterPrizes: number;
  userPrizeAttractivenessScore: number;
  platformSustainabilityScore: number;
  probabilityOfWinningScore: number;
  prizeSelectivityScore: number;
  simplicityScore: number;
  riskControlScore: number;
  finalScore: number;
  lowPrizePoolRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  highPrizePoolRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  tooManyWinnersRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  tooFewWinnersRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  valueHoldTradingImpact: string;
}

export interface PrizePoolAttractivenessReport {
  generatedAt: string;
  modelId: 'PRIZE_POOL_ATTRACTIVENESS_SIMULATION_V1';
  warning: string;
  completedSeasonsUsedForRecommendation: string[];
  inProgressSeasonsSeparated: string[];
  scoringFormula: string;
  predefinedModels: PrizePoolMetrics[];
  matrixResults: PrizePoolMetrics[];
  top10Overall: PrizePoolMetrics[];
  top10UserAttractiveness: PrizePoolMetrics[];
  top10PlatformSustainability: PrizePoolMetrics[];
  bestSmallCommunity: PrizePoolMetrics[];
  bestMediumCommunity: PrizePoolMetrics[];
  bestLargeCommunity: PrizePoolMetrics[];
  configurationsToAvoid: PrizePoolMetrics[];
  recommendation: {
    recommendedV1: PrizePoolMetrics;
    recommendedPilot: PrizePoolMetrics;
    recommendedScale: PrizePoolMetrics;
  };
  prizeTableComparison: Array<{
    prizeTableId: PrizeTableId;
    avgFinalScore: number;
    avgProbabilityOfWinning: number;
    avgFirstPrize: number;
  }>;
  entryFeeComparison: Array<{
    entryFee: number;
    avgFinalScore: number;
    avgPrizePool: number;
    avgSystemProfit: number;
  }>;
}

const PARTICIPANTS = [20, 50, 100, 250, 500, 1000];
const ENTRY_FEES = [0, 5, 10, 20, 30, 50, 100];
const ENTRY_SPLITS = [
  { prizeEntryShare: 1, systemEntryShare: 0 },
  { prizeEntryShare: 0.9, systemEntryShare: 0.1 },
  { prizeEntryShare: 0.8, systemEntryShare: 0.2 },
  { prizeEntryShare: 0.7, systemEntryShare: 0.3 },
];
const GUARANTEED_POOLS = [0, 500, 1000, 2500, 5000, 10000];
const SPONSOR_BOOSTS = [0, 500, 1000, 2500, 5000];
const COMMISSION_CONFIGS = [
  { buyCommissionRate: 0.015, sellCommissionRate: 0.02 },
  { buyCommissionRate: 0.02, sellCommissionRate: 0.02 },
  { buyCommissionRate: 0.015, sellCommissionRate: 0.03 },
  { buyCommissionRate: 0.01, sellCommissionRate: 0.02 },
];
const THRESHOLDS = [5, 7, 10];
const PRIZE_TABLES: PrizeTableId[] = [
  'PRIZE_TABLE_TOP_3',
  'PRIZE_TABLE_TOP_5',
  'PRIZE_TABLE_TOP_10_PERCENT',
  'PRIZE_TABLE_THRESHOLD_POOL',
  'PRIZE_TABLE_HYBRID',
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function fmtRate(rate: number): string {
  return (rate * 100).toFixed(2);
}

export function calculatePrizePoolFromEntryFees(participants: number, entryFee: number, prizeShare: number): number {
  return roundMoney(participants * entryFee * prizeShare);
}

export function calculateEntrySplit(participants: number, entryFee: number, prizeShare: number) {
  const total = participants * entryFee;
  return {
    prizePoolContribution: roundMoney(total * prizeShare),
    systemRevenue: roundMoney(total * (1 - prizeShare)),
  };
}

export function calculateSystemRevenueFromCommissions(
  commissionRevenuePerParticipant: number,
  participants: number,
  systemShare = 1,
): number {
  return roundMoney(commissionRevenuePerParticipant * participants * systemShare);
}

export function top3PrizeTable(pool: number): number[] {
  return [0.5, 0.3, 0.2].map(pct => pool * pct);
}

export function top5PrizeTable(pool: number): number[] {
  return [0.4, 0.25, 0.15, 0.1, 0.1].map(pct => pool * pct);
}

export function top10PercentPrizeTable(pool: number, participants: number): number[] {
  const winners = Math.max(1, Math.ceil(participants * 0.1));
  const weights = Array.from({ length: winners }, (_, i) => winners - i);
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map(weight => pool * weight / total);
}

export function thresholdPoolPrizeTable(pool: number, estimatedWinners: number): number[] {
  const winners = Math.max(1, estimatedWinners);
  return Array.from({ length: winners }, () => pool / winners);
}

export function hybridPrizeTable(pool: number, participants: number, estimatedThresholdWinners: number): number[] {
  const topPool = pool * 0.6;
  const thresholdPool = pool * 0.4;
  return [...top5PrizeTable(topPool), ...thresholdPoolPrizeTable(thresholdPool, estimatedThresholdWinners)];
}

function prizeTable(pool: number, participants: number, thresholdWinners: number, tableId: PrizeTableId): number[] {
  if (pool <= 0) return [];
  if (tableId === 'PRIZE_TABLE_TOP_3') return top3PrizeTable(pool);
  if (tableId === 'PRIZE_TABLE_TOP_5') return top5PrizeTable(pool);
  if (tableId === 'PRIZE_TABLE_TOP_10_PERCENT') return top10PercentPrizeTable(pool, participants);
  if (tableId === 'PRIZE_TABLE_THRESHOLD_POOL') return thresholdPoolPrizeTable(pool, thresholdWinners);
  return hybridPrizeTable(pool, participants, thresholdWinners);
}

function findCommissionScenario(source: SourceReports, buy: number, sell: number, threshold: number): CommissionScenarioMetrics {
  const rows = [...source.commissionRevenue.matrixResults, ...source.commissionRevenue.predefinedModels];
  const exact = rows.find(row =>
    Math.abs(row.buyCommissionRate - buy) < 0.000001 &&
    Math.abs(row.sellCommissionRate - sell) < 0.000001 &&
    row.prizeThreshold === threshold &&
    row.revenueModel === 'COMMISSION_100_TO_PLATFORM'
  );
  if (exact) return exact;
  const fallback = rows
    .filter(row => row.revenueModel === 'COMMISSION_100_TO_PLATFORM')
    .sort((a, b) =>
      Math.abs(a.buyCommissionRate - buy) + Math.abs(a.sellCommissionRate - sell) + Math.abs(a.prizeThreshold - threshold) -
      (Math.abs(b.buyCommissionRate - buy) + Math.abs(b.sellCommissionRate - sell) + Math.abs(b.prizeThreshold - threshold))
    )[0];
  if (!fallback) throw new Error('No commission scenario available');
  return fallback;
}

function estimateThresholdPct(commission: CommissionScenarioMetrics, threshold: number): number {
  if (threshold === 5) return commission.pctAbove5;
  if (threshold === 7) return commission.pctAbove7;
  if (threshold === 10) return commission.pctAbove10;
  return commission.pctAbovePrizeThreshold;
}

function scorePlatform(profit: number, participants: number): number {
  const perUser = participants > 0 ? profit / participants : 0;
  return clamp(50 + perUser * 3);
}

function scorePrizeAttractiveness(firstPrize: number, avgPrize: number, entryFee: number): number {
  if (entryFee <= 0) return firstPrize > 0 ? 65 : 15;
  return clamp((avgPrize / entryFee) * 18 + (firstPrize / entryFee) * 4);
}

function scoreProbability(probability: number): number {
  const target = 0.12;
  return clamp(100 - Math.abs(probability - target) * 350);
}

function scorePrizeSelectivity(probability: number): number {
  return clamp(100 - Math.abs(probability - 0.12) * 300);
}

function scoreSimplicity(scenario: PrizePoolScenario): number {
  let score = 40;
  if (scenario.modelId === 'MODEL_A_ENTRY_FEE_100_TO_PRIZE' || scenario.modelId === 'MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM') score += 25;
  if (scenario.guaranteedPrizePool === 0) score += 15;
  if (scenario.sponsorBoost === 0) score += 10;
  if (scenario.prizeTableId === 'PRIZE_TABLE_TOP_3' || scenario.prizeTableId === 'PRIZE_TABLE_TOP_5') score += 10;
  return clamp(score);
}

function scoreRiskControl(metric: Pick<PrizePoolMetrics,
  'lowPrizePoolRisk' | 'highPrizePoolRisk' | 'tooFewWinnersRisk' | 'tooManyWinnersRisk' | 'systemProfitLoss'
>): number {
  let score = 100;
  if (metric.lowPrizePoolRisk === 'HIGH') score -= 20;
  if (metric.highPrizePoolRisk === 'HIGH') score -= 20;
  if (metric.tooFewWinnersRisk === 'HIGH') score -= 15;
  if (metric.tooManyWinnersRisk === 'HIGH') score -= 15;
  if (metric.systemProfitLoss < 0) score -= 30;
  return clamp(score);
}

function finalScore(parts: Pick<PrizePoolMetrics,
  'platformSustainabilityScore' |
  'userPrizeAttractivenessScore' |
  'probabilityOfWinningScore' |
  'prizeSelectivityScore' |
  'simplicityScore' |
  'riskControlScore'
>): number {
  return parts.platformSustainabilityScore * 0.30 +
    parts.userPrizeAttractivenessScore * 0.30 +
    parts.probabilityOfWinningScore * 0.15 +
    parts.prizeSelectivityScore * 0.10 +
    parts.simplicityScore * 0.10 +
    parts.riskControlScore * 0.05;
}

export function calculateBreakEvenParticipants(
  fixedCost: number,
  entryFee: number,
  systemEntryShare: number,
  commissionRevenuePerParticipant: number,
  commissionSystemShare: number,
): number {
  const revenuePerParticipant = entryFee * systemEntryShare + commissionRevenuePerParticipant * commissionSystemShare;
  if (fixedCost <= 0) return 0;
  return revenuePerParticipant > 0 ? Math.ceil(fixedCost / revenuePerParticipant) : Infinity;
}

export function evaluatePrizePoolScenario(scenario: PrizePoolScenario, source: SourceReports): PrizePoolMetrics {
  const commission = findCommissionScenario(source, scenario.buyCommissionRate, scenario.sellCommissionRate, scenario.prizeThreshold);
  const entrySplit = calculateEntrySplit(scenario.participants, scenario.entryFee, scenario.prizeEntryShare);
  const thresholdPct = estimateThresholdPct(commission, scenario.prizeThreshold);
  const thresholdWinners = Math.max(1, Math.round(scenario.participants * thresholdPct / 100));
  const commissionPrizeContribution = commission.platformRevenuePerParticipant * scenario.participants * scenario.commissionPrizeShare;
  const fundedPrizePool = entrySplit.prizePoolContribution + scenario.sponsorBoost + commissionPrizeContribution;
  const netDistributablePrizePool = Math.max(fundedPrizePool, scenario.guaranteedPrizePool);
  const guaranteedPrizePoolCost = Math.max(0, scenario.guaranteedPrizePool - fundedPrizePool);
  const prizes = prizeTable(netDistributablePrizePool, scenario.participants, thresholdWinners, scenario.prizeTableId);
  const winners = Math.min(scenario.participants, prizes.length);
  const probabilityOfWinning = scenario.participants > 0 ? winners / scenario.participants : 0;
  const averageWinnerPrize = winners ? netDistributablePrizePool / winners : 0;
  const systemRevenueFromCommissions = calculateSystemRevenueFromCommissions(
    commission.platformRevenuePerParticipant,
    scenario.participants,
    scenario.commissionSystemShare,
  );
  const totalSystemRevenue = entrySplit.systemRevenue + systemRevenueFromCommissions;
  const systemProfitLoss = totalSystemRevenue - guaranteedPrizePoolCost;
  const averageUserExpectedValue = scenario.participants > 0 ? netDistributablePrizePool / scenario.participants - scenario.entryFee : 0;
  const aboveThresholdExpectedValue = thresholdWinners > 0 ? netDistributablePrizePool / thresholdWinners - scenario.entryFee : 0;
  const avgUserRoiAfterPrizes = commission.avgUserROI + (scenario.entryFee > 0 ? (netDistributablePrizePool / scenario.participants) / scenario.entryFee * 100 : 0);
  const lowPrizePoolRisk = netDistributablePrizePool < scenario.participants * Math.max(5, scenario.entryFee * 0.5) ? 'HIGH' : netDistributablePrizePool < scenario.participants * Math.max(10, scenario.entryFee) ? 'MEDIUM' : 'LOW';
  const highPrizePoolRisk = guaranteedPrizePoolCost > totalSystemRevenue ? 'HIGH' : guaranteedPrizePoolCost > totalSystemRevenue * 0.5 ? 'MEDIUM' : 'LOW';
  const tooManyWinnersRisk = probabilityOfWinning > 0.25 ? 'HIGH' : probabilityOfWinning > 0.18 ? 'MEDIUM' : 'LOW';
  const tooFewWinnersRisk = probabilityOfWinning < 0.03 ? 'HIGH' : probabilityOfWinning < 0.06 ? 'MEDIUM' : 'LOW';
  const platformSustainabilityScore = scorePlatform(systemProfitLoss, scenario.participants);
  const userPrizeAttractivenessScore = scorePrizeAttractiveness(prizes[0] ?? 0, averageWinnerPrize, scenario.entryFee);
  const probabilityOfWinningScore = scoreProbability(probabilityOfWinning);
  const prizeSelectivityScore = scorePrizeSelectivity(probabilityOfWinning);
  const simplicityScore = scoreSimplicity(scenario);
  const riskControlScore = scoreRiskControl({ lowPrizePoolRisk, highPrizePoolRisk, tooFewWinnersRisk, tooManyWinnersRisk, systemProfitLoss });
  return {
    ...scenario,
    grossPrizePool: fundedPrizePool,
    netDistributablePrizePool,
    systemRevenueFromEntries: entrySplit.systemRevenue,
    systemRevenueFromCommissions,
    totalSystemRevenue,
    guaranteedPrizePoolCost,
    systemProfitLoss,
    breakEvenParticipants: calculateBreakEvenParticipants(
      guaranteedPrizePoolCost,
      scenario.entryFee,
      scenario.systemEntryShare,
      commission.platformRevenuePerParticipant,
      scenario.commissionSystemShare,
    ),
    firstPrize: prizes[0] ?? 0,
    averageWinnerPrize,
    estimatedWinners: winners,
    probabilityOfWinning,
    averageUserExpectedValue,
    aboveThresholdExpectedValue,
    avgUserRoiBeforePrizes: commission.avgUserROI,
    avgUserRoiAfterPrizes,
    userPrizeAttractivenessScore,
    platformSustainabilityScore,
    probabilityOfWinningScore,
    prizeSelectivityScore,
    simplicityScore,
    riskControlScore,
    finalScore: finalScore({
      platformSustainabilityScore,
      userPrizeAttractivenessScore,
      probabilityOfWinningScore,
      prizeSelectivityScore,
      simplicityScore,
      riskControlScore,
    }),
    lowPrizePoolRisk,
    highPrizePoolRisk,
    tooManyWinnersRisk,
    tooFewWinnersRisk,
    valueHoldTradingImpact: `VALUE risk ${commission.valueDominanceRisk}; synthetic HOLD vs active delta ${commission.holdVsActiveDelta.toFixed(2)}pp`,
  };
}

function makeScenario(
  modelId: PrizePoolModelId,
  participants: number,
  entryFee: number,
  split: { prizeEntryShare: number; systemEntryShare: number },
  guaranteedPrizePool: number,
  sponsorBoost: number,
  commission: { buyCommissionRate: number; sellCommissionRate: number },
  prizeThreshold: number,
  prizeTableId: PrizeTableId,
): PrizePoolScenario {
  const commissionPrizeShare = modelId === 'MODEL_E_MIXED_COMMISSION_SPLIT' ? 0.3 : 0;
  const commissionSystemShare = modelId === 'MODEL_E_MIXED_COMMISSION_SPLIT' ? 0.7 : 1;
  return {
    id: `${modelId}_U${participants}_E${entryFee}_P${Math.round(split.prizeEntryShare * 100)}_G${guaranteedPrizePool}_S${sponsorBoost}_B${fmtRate(commission.buyCommissionRate)}_V${fmtRate(commission.sellCommissionRate)}_T${prizeThreshold}_${prizeTableId}`,
    modelId,
    label: `${modelId} ${participants} utenti entry ${entryFee}`,
    participants,
    entryFee,
    prizeEntryShare: split.prizeEntryShare,
    systemEntryShare: split.systemEntryShare,
    guaranteedPrizePool,
    sponsorBoost,
    commissionSystemShare,
    commissionPrizeShare,
    buyCommissionRate: commission.buyCommissionRate,
    sellCommissionRate: commission.sellCommissionRate,
    prizeThreshold,
    prizeTableId,
  };
}

export function buildPrizePoolScenarios(): PrizePoolScenario[] {
  const scenarios: PrizePoolScenario[] = [];
  for (const participants of PARTICIPANTS) {
    for (const entryFee of ENTRY_FEES) {
      for (const split of ENTRY_SPLITS) {
        for (const commission of COMMISSION_CONFIGS) {
          for (const prizeThreshold of THRESHOLDS) {
            for (const prizeTableId of PRIZE_TABLES) {
              scenarios.push(makeScenario('MODEL_A_ENTRY_FEE_100_TO_PRIZE', participants, entryFee, { prizeEntryShare: 1, systemEntryShare: 0 }, 0, 0, commission, prizeThreshold, prizeTableId));
              scenarios.push(makeScenario('MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM', participants, entryFee, { prizeEntryShare: 0.8, systemEntryShare: 0.2 }, 0, 0, commission, prizeThreshold, prizeTableId));
              scenarios.push(makeScenario('MODEL_C_ENTRY_FEE_70_PRIZE_30_SYSTEM', participants, entryFee, { prizeEntryShare: 0.7, systemEntryShare: 0.3 }, 0, 0, commission, prizeThreshold, prizeTableId));
              scenarios.push(makeScenario('MODEL_E_MIXED_COMMISSION_SPLIT', participants, entryFee, split, 0, 0, commission, prizeThreshold, prizeTableId));
            }
          }
        }
      }
    }
    for (const guaranteed of GUARANTEED_POOLS) {
      for (const commission of COMMISSION_CONFIGS) {
        for (const prizeTableId of PRIZE_TABLES) {
          scenarios.push(makeScenario('MODEL_D_GUARANTEED_PRIZE_POOL', participants, 0, { prizeEntryShare: 0, systemEntryShare: 0 }, guaranteed, 0, commission, 7, prizeTableId));
        }
      }
    }
    for (const sponsorBoost of SPONSOR_BOOSTS) {
      for (const entryFee of [10, 20, 30, 50]) {
        for (const commission of COMMISSION_CONFIGS) {
          for (const prizeTableId of PRIZE_TABLES) {
            scenarios.push(makeScenario('MODEL_F_SPONSOR_BOOST', participants, entryFee, { prizeEntryShare: 0.8, systemEntryShare: 0.2 }, 0, sponsorBoost, commission, 7, prizeTableId));
          }
        }
      }
    }
  }
  return Array.from(new Map(scenarios.map(scenario => [scenario.id, scenario])).values());
}

function predefinedScenarios(): PrizePoolScenario[] {
  return [
    makeScenario('MODEL_A_ENTRY_FEE_100_TO_PRIZE', 50, 20, { prizeEntryShare: 1, systemEntryShare: 0 }, 0, 0, COMMISSION_CONFIGS[1], 7, 'PRIZE_TABLE_TOP_5'),
    makeScenario('MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM', 250, 30, { prizeEntryShare: 0.8, systemEntryShare: 0.2 }, 0, 0, COMMISSION_CONFIGS[1], 7, 'PRIZE_TABLE_TOP_10_PERCENT'),
    makeScenario('MODEL_C_ENTRY_FEE_70_PRIZE_30_SYSTEM', 250, 30, { prizeEntryShare: 0.7, systemEntryShare: 0.3 }, 0, 0, COMMISSION_CONFIGS[1], 7, 'PRIZE_TABLE_HYBRID'),
    makeScenario('MODEL_D_GUARANTEED_PRIZE_POOL', 100, 0, { prizeEntryShare: 0, systemEntryShare: 0 }, 2500, 0, COMMISSION_CONFIGS[1], 7, 'PRIZE_TABLE_TOP_5'),
    makeScenario('MODEL_E_MIXED_COMMISSION_SPLIT', 100, 20, { prizeEntryShare: 0.8, systemEntryShare: 0.2 }, 0, 0, COMMISSION_CONFIGS[1], 7, 'PRIZE_TABLE_THRESHOLD_POOL'),
    makeScenario('MODEL_F_SPONSOR_BOOST', 50, 20, { prizeEntryShare: 0.8, systemEntryShare: 0.2 }, 0, 1000, COMMISSION_CONFIGS[1], 7, 'PRIZE_TABLE_TOP_5'),
  ];
}

function rank(rows: PrizePoolMetrics[]): PrizePoolMetrics[] {
  return [...rows].sort((a, b) => b.finalScore - a.finalScore);
}

export function runPrizePoolAttractivenessSimulation(source: SourceReports): PrizePoolAttractivenessReport {
  const predefinedModels = predefinedScenarios().map(scenario => evaluatePrizePoolScenario(scenario, source));
  const matrixResults = buildPrizePoolScenarios().map(scenario => evaluatePrizePoolScenario(scenario, source));
  const ranked = rank(matrixResults);
  const top10Overall = ranked.slice(0, 10);
  const top10UserAttractiveness = [...matrixResults].sort((a, b) => b.userPrizeAttractivenessScore - a.userPrizeAttractivenessScore || b.finalScore - a.finalScore).slice(0, 10);
  const top10PlatformSustainability = [...matrixResults].sort((a, b) => b.platformSustainabilityScore - a.platformSustainabilityScore || b.finalScore - a.finalScore).slice(0, 10);
  const bestSmallCommunity = rank(matrixResults.filter(row => row.participants === 20 || row.participants === 50)).slice(0, 10);
  const bestMediumCommunity = rank(matrixResults.filter(row => row.participants === 100 || row.participants === 250)).slice(0, 10);
  const bestLargeCommunity = rank(matrixResults.filter(row => row.participants === 500 || row.participants === 1000)).slice(0, 10);
  const configurationsToAvoid = [...matrixResults]
    .filter(row => row.systemProfitLoss < 0 || row.lowPrizePoolRisk === 'HIGH' || row.tooFewWinnersRisk === 'HIGH' || row.tooManyWinnersRisk === 'HIGH')
    .sort((a, b) => a.finalScore - b.finalScore)
    .slice(0, 10);
  const recommendedPilot = rank(matrixResults.filter(row =>
    (row.participants === 20 || row.participants === 50) &&
    (row.entryFee === 10 || row.entryFee === 20) &&
    row.guaranteedPrizePool === 0 &&
    (row.sponsorBoost === 0 || row.sponsorBoost <= 1000) &&
    (row.prizeTableId === 'PRIZE_TABLE_TOP_3' || row.prizeTableId === 'PRIZE_TABLE_TOP_5')
  ))[0] ?? top10Overall[0];
  const recommendedScale = rank(matrixResults.filter(row =>
    (row.participants === 500 || row.participants === 1000) &&
    (row.entryFee === 20 || row.entryFee === 50) &&
    row.prizeTableId === 'PRIZE_TABLE_TOP_10_PERCENT'
  ))[0] ?? top10Overall[0];
  const recommendedV1 = rank(matrixResults.filter(row =>
    row.participants === 100 &&
    (row.entryFee === 20 || row.entryFee === 30) &&
    row.prizeEntryShare === 0.8 &&
    row.systemEntryShare === 0.2 &&
    row.guaranteedPrizePool === 0 &&
    row.buyCommissionRate === 0.02 &&
    row.sellCommissionRate === 0.02 &&
    row.prizeThreshold === 7 &&
    (row.prizeTableId === 'PRIZE_TABLE_TOP_5' || row.prizeTableId === 'PRIZE_TABLE_TOP_10_PERCENT' || row.prizeTableId === 'PRIZE_TABLE_HYBRID')
  ))[0] ?? top10Overall[0];
  const prizeTableComparison = PRIZE_TABLES.map(prizeTableId => {
    const rows = matrixResults.filter(row => row.prizeTableId === prizeTableId);
    return {
      prizeTableId,
      avgFinalScore: mean(rows.map(row => row.finalScore)),
      avgProbabilityOfWinning: mean(rows.map(row => row.probabilityOfWinning)),
      avgFirstPrize: mean(rows.map(row => row.firstPrize)),
    };
  });
  const entryFeeComparison = ENTRY_FEES.map(entryFee => {
    const rows = matrixResults.filter(row => row.entryFee === entryFee);
    return {
      entryFee,
      avgFinalScore: mean(rows.map(row => row.finalScore)),
      avgPrizePool: mean(rows.map(row => row.netDistributablePrizePool)),
      avgSystemProfit: mean(rows.map(row => row.systemProfitLoss)),
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    modelId: 'PRIZE_POOL_ATTRACTIVENESS_SIMULATION_V1',
    warning: 'Raccomandazioni definitive basate su 2023/24 e 2024/25 completed. 2025/26 resta separata e non guida le decisioni.',
    completedSeasonsUsedForRecommendation: source.historicalFullRules.completedSeasons,
    inProgressSeasonsSeparated: source.historicalFullRules.inProgressSeasons,
    scoringFormula: 'finalScore = platformSustainabilityScore*0.30 + userPrizeAttractivenessScore*0.30 + probabilityOfWinningScore*0.15 + prizeSelectivityScore*0.10 + simplicityScore*0.10 + riskControlScore*0.05',
    predefinedModels,
    matrixResults,
    top10Overall,
    top10UserAttractiveness,
    top10PlatformSustainability,
    bestSmallCommunity,
    bestMediumCommunity,
    bestLargeCommunity,
    configurationsToAvoid,
    recommendation: {
      recommendedV1,
      recommendedPilot,
      recommendedScale,
    },
    prizeTableComparison,
    entryFeeComparison,
  };
}

function fmt(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return 'n/a';
  return value.toFixed(decimals);
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return text.includes(',') || text.includes('"') || text.includes('\n') ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildPrizePoolAttractivenessCsv(report: PrizePoolAttractivenessReport): string {
  const headers = [
    'id', 'modelId', 'participants', 'entryFee', 'prizeEntryShare', 'systemEntryShare',
    'guaranteedPrizePool', 'sponsorBoost', 'commissionSystemShare', 'commissionPrizeShare',
    'buyCommissionRate', 'sellCommissionRate', 'prizeThreshold', 'prizeTableId',
    'grossPrizePool', 'netDistributablePrizePool', 'systemRevenueFromEntries',
    'systemRevenueFromCommissions', 'totalSystemRevenue', 'guaranteedPrizePoolCost',
    'systemProfitLoss', 'breakEvenParticipants', 'firstPrize', 'averageWinnerPrize',
    'estimatedWinners', 'probabilityOfWinning', 'averageUserExpectedValue',
    'aboveThresholdExpectedValue', 'avgUserRoiBeforePrizes', 'avgUserRoiAfterPrizes',
    'platformSustainabilityScore', 'userPrizeAttractivenessScore', 'probabilityOfWinningScore',
    'prizeSelectivityScore', 'simplicityScore', 'riskControlScore', 'finalScore',
    'lowPrizePoolRisk', 'highPrizePoolRisk', 'tooManyWinnersRisk', 'tooFewWinnersRisk',
  ];
  const rows = [...report.predefinedModels, ...report.matrixResults].map(row => [
    row.id, row.modelId, row.participants, row.entryFee, row.prizeEntryShare, row.systemEntryShare,
    row.guaranteedPrizePool, row.sponsorBoost, row.commissionSystemShare, row.commissionPrizeShare,
    row.buyCommissionRate, row.sellCommissionRate, row.prizeThreshold, row.prizeTableId,
    fmt(row.grossPrizePool, 4), fmt(row.netDistributablePrizePool, 4), fmt(row.systemRevenueFromEntries, 4),
    fmt(row.systemRevenueFromCommissions, 4), fmt(row.totalSystemRevenue, 4), fmt(row.guaranteedPrizePoolCost, 4),
    fmt(row.systemProfitLoss, 4), fmt(row.breakEvenParticipants, 2), fmt(row.firstPrize, 4), fmt(row.averageWinnerPrize, 4),
    row.estimatedWinners, fmt(row.probabilityOfWinning, 6), fmt(row.averageUserExpectedValue, 4),
    fmt(row.aboveThresholdExpectedValue, 4), fmt(row.avgUserRoiBeforePrizes, 4), fmt(row.avgUserRoiAfterPrizes, 4),
    fmt(row.platformSustainabilityScore, 4), fmt(row.userPrizeAttractivenessScore, 4), fmt(row.probabilityOfWinningScore, 4),
    fmt(row.prizeSelectivityScore, 4), fmt(row.simplicityScore, 4), fmt(row.riskControlScore, 4), fmt(row.finalScore, 4),
    row.lowPrizePoolRisk, row.highPrizePoolRisk, row.tooManyWinnersRisk, row.tooFewWinnersRisk,
  ]);
  return [headers.join(','), ...rows.map(row => row.map(csvEscape).join(','))].join('\n');
}

function table(rows: PrizePoolMetrics[]): string[] {
  const lines = [
    '| Scenario | Utenti | Entry | Split premio | Premi | Pool | Rev sistema | Profitto | Prob win | Score |',
    '|---|---:|---:|---:|---|---:|---:|---:|---:|---:|',
  ];
  for (const row of rows) {
    lines.push(`| ${row.id} | ${row.participants} | ${fmt(row.entryFee)} | ${fmt(row.prizeEntryShare * 100, 0)}% | ${row.prizeTableId} | ${fmt(row.netDistributablePrizePool)} | ${fmt(row.totalSystemRevenue)} | ${fmt(row.systemProfitLoss)} | ${fmt(row.probabilityOfWinning * 100)}% | ${fmt(row.finalScore)} |`);
  }
  return lines;
}

export function buildPrizePoolAttractivenessMarkdown(report: PrizePoolAttractivenessReport): string {
  const rec = report.recommendation.recommendedV1;
  const lines: string[] = [];
  lines.push('# Prize Pool and Economic Attractiveness Simulation');
  lines.push('');
  lines.push('## 1. Executive summary');
  lines.push('');
  lines.push(`Modello V1 consigliato: **entry fee ${fmt(rec.entryFee)} euro, ${fmt(rec.prizeEntryShare * 100, 0)}% al montepremi, ${fmt(rec.systemEntryShare * 100, 0)}% al sistema, tabella ${rec.prizeTableId}**.`);
  lines.push(`La simulazione migliore per V1 usa ${rec.participants} utenti di riferimento, pool netto ${fmt(rec.netDistributablePrizePool)} euro, probabilita premio ${fmt(rec.probabilityOfWinning * 100)}%, profitto sistema ${fmt(rec.systemProfitLoss)} euro e score ${fmt(rec.finalScore)}/100.`);
  lines.push('');
  lines.push('## 2. Perche il montepremi e fondamentale');
  lines.push('');
  lines.push('Le plusvalenze rendono il gioco tecnico, ma il montepremi rende il gioco percepito come competitivo. Senza premi, il partecipante valuta solo il ROI virtuale; con premi, la classifica crea un obiettivo economico esplicito.');
  lines.push('');
  lines.push('## 3. Trading, premio e ricavo sistema');
  lines.push('');
  lines.push('- Guadagno da trading: variazione netta del valore rosa dopo commissioni.');
  lines.push('- Premio da classifica: quota del montepremi assegnata in base alla tabella premi.');
  lines.push('- Ricavo sistema: commissioni operative trattenute e quota iscrizione destinata al sistema.');
  lines.push('');
  lines.push('## 4. Esempi pratici con 50 utenti');
  lines.push('');
  lines.push('| Entry fee | Pool 100% premio | Pool 80% premio | Sistema 20% |');
  lines.push('|---:|---:|---:|---:|');
  for (const entry of [10, 20, 50]) {
    lines.push(`| ${entry} euro | ${fmt(50 * entry)} | ${fmt(50 * entry * 0.8)} | ${fmt(50 * entry * 0.2)} |`);
  }
  lines.push('');
  lines.push('## 5. Confronto modelli A-F');
  lines.push(...table(report.predefinedModels));
  lines.push('');
  lines.push('## 6. Confronto distribuzione premi');
  lines.push('');
  lines.push('| Tabella | Score medio | Probabilita media win | Primo premio medio |');
  lines.push('|---|---:|---:|---:|');
  for (const row of report.prizeTableComparison) {
    lines.push(`| ${row.prizeTableId} | ${fmt(row.avgFinalScore)} | ${fmt(row.avgProbabilityOfWinning * 100)}% | ${fmt(row.avgFirstPrize)} |`);
  }
  lines.push('');
  lines.push('## 7. Analisi per numero partecipanti');
  lines.push('');
  lines.push('### Pochi utenti 20-50');
  lines.push(...table(report.bestSmallCommunity.slice(0, 5)));
  lines.push('');
  lines.push('### Community media 100-250');
  lines.push(...table(report.bestMediumCommunity.slice(0, 5)));
  lines.push('');
  lines.push('### Scala 500-1000');
  lines.push(...table(report.bestLargeCommunity.slice(0, 5)));
  lines.push('');
  lines.push('## 8. Analisi quota iscrizione');
  lines.push('');
  lines.push('| Entry fee | Score medio | Pool medio | Profitto sistema medio |');
  lines.push('|---:|---:|---:|---:|');
  for (const row of report.entryFeeComparison) {
    lines.push(`| ${fmt(row.entryFee)} | ${fmt(row.avgFinalScore)} | ${fmt(row.avgPrizePool)} | ${fmt(row.avgSystemProfit)} |`);
  }
  lines.push('');
  lines.push('## 9. Analisi sostenibilita piattaforma');
  lines.push('');
  lines.push('I modelli con split 80/20 o 70/30 sulla quota iscrizione sono piu sostenibili del 100% premio, perche affiancano alle commissioni trading una fonte stabile di ricavo. I garantiti fissi sono rischiosi sotto 100 utenti se non coperti da sponsor.');
  lines.push('');
  lines.push('## 10. Analisi attrattivita utente');
  lines.push('');
  lines.push('L attrattivita cresce con entry fee e sponsor boost, ma solo finche la probabilita di vincere resta comprensibile. Top 10% e hybrid sono piu adatti a community grandi; top 3/top 5 sono piu chiari per pilot piccoli.');
  lines.push('');
  lines.push('## 11. Analisi VALUE e utenti sopra soglia');
  lines.push('');
  lines.push('La componente VALUE resta da monitorare: il montepremi non deve premiare troppi utenti sopra soglia in modo automatico. Le tabelle top classifica e hybrid mitigano il rischio rispetto a una distribuzione puramente proporzionale a tutti sopra soglia.');
  lines.push('');
  lines.push('## 12. Raccomandazione quota iscrizione');
  lines.push('');
  lines.push(`Quota V1 consigliata: **${fmt(rec.entryFee)} euro**. Pilot consigliato: **${fmt(report.recommendation.recommendedPilot.entryFee)} euro**.`);
  lines.push('');
  lines.push('## 13. Raccomandazione split quota iscrizione');
  lines.push('');
  lines.push(`Split consigliato: **${fmt(rec.prizeEntryShare * 100, 0)}% al montepremi / ${fmt(rec.systemEntryShare * 100, 0)}% al sistema**.`);
  lines.push('');
  lines.push('## 14. Raccomandazione struttura premi');
  lines.push('');
  lines.push(`Struttura V1 consigliata: **${rec.prizeTableId}**. Pilot: **${report.recommendation.recommendedPilot.prizeTableId}**. Scala: **${report.recommendation.recommendedScale.prizeTableId}**.`);
  lines.push('');
  lines.push('## 15. Raccomandazione montepremi garantito');
  lines.push('');
  lines.push('Per V1 e pilot: evitare montepremi garantito non coperto. Usare eventualmente sponsor boost esplicito. Il garantito fisso diventa sostenibile solo quando il break-even partecipanti e sotto la dimensione community prevista.');
  lines.push('');
  lines.push('## 16. Proposta regolamento economico aggiornato');
  lines.push('');
  lines.push('- La quota di iscrizione alimenta il montepremi secondo la percentuale indicata.');
  lines.push('- Le commissioni di acquisto e vendita sono costi operativi trattenuti dal sistema.');
  lines.push('- Il premio finale dipende dalla classifica e dalla tabella premi.');
  lines.push(`- V1: entry fee ${fmt(rec.entryFee)} euro, split ${fmt(rec.prizeEntryShare * 100, 0)}%/${fmt(rec.systemEntryShare * 100, 0)}%, struttura ${rec.prizeTableId}.`);
  lines.push('');
  lines.push('## 17. Limiti dell analisi');
  lines.push('');
  lines.push('- Dati definitivi solo 2023/24 e 2024/25 completed.');
  lines.push('- 2025/26 esclusa dalle raccomandazioni definitive.');
  lines.push('- Comportamento utenti reale non ancora osservato.');
  lines.push('- I premi sono in euro, mentre ROI e commissioni derivano da simulazioni in crediti equivalenti: il confronto e direzionale.');
  lines.push('- Le quotazioni intra-stagione restano sintetiche e non ufficiali.');
  lines.push('');
  lines.push('## 18. Prossimi passi');
  lines.push('');
  lines.push('- Definire costo operativo reale minimo della piattaforma.');
  lines.push('- Testare pilot 20-50 utenti con entry 10/20 euro.');
  lines.push('- Validare disponibilita sponsor boost.');
  lines.push('- Ricalibrare tabella premi dopo osservazione comportamento reale.');
  lines.push('');
  lines.push('## Classifiche richieste');
  lines.push('');
  lines.push('### Top 10 assoluto');
  lines.push(...table(report.top10Overall));
  lines.push('');
  lines.push('### Top 10 attrattivita utenti');
  lines.push(...table(report.top10UserAttractiveness));
  lines.push('');
  lines.push('### Top 10 sostenibilita sistema');
  lines.push(...table(report.top10PlatformSustainability));
  lines.push('');
  lines.push('### Configurazioni da evitare');
  lines.push(...table(report.configurationsToAvoid));
  lines.push('');
  lines.push(`Modello consigliato V1: **${report.recommendation.recommendedV1.id}**.`);
  lines.push(`Modello consigliato pilot: **${report.recommendation.recommendedPilot.id}**.`);
  lines.push(`Modello consigliato scala: **${report.recommendation.recommendedScale.id}**.`);
  return lines.join('\n');
}
