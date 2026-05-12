import { NormalizedQuoteRow } from '../importers/realQuotesImporter';
import { NormalizedVoteRow } from '../importers/realVotesImporter';
import { mean, stdDev } from '../utils/mathUtils';
import { createSeededRng } from '../utils/randomUtils';
import {
  buildFullRulesRoster,
  buildMatchedSeasonPool,
  evaluateFullRulesPortfolio,
  FullRulesPortfolioResult,
  FullRulesStrategyId,
  FULL_RULES_STRATEGIES,
} from './historicalFullRulesBacktest';
import { NoVotePolicyConfig } from '../engine/teamVoteBandEngine';

export const STRESS_COMPLETED_SEASONS = ['2023/24', '2024/25'];
export const STRESS_IN_PROGRESS_SEASONS = ['2025/26'];
export const MAIN_NO_VOTE_POLICIES: NoVotePolicyConfig[] = [
  { policy: 'PLAYER_ZERO_TEAM_EXCLUDE' },
  { policy: 'EXCLUDE' },
  { policy: 'FIVE' },
];
export const APPENDIX_NO_VOTE_POLICIES: NoVotePolicyConfig[] = [
  { policy: 'ZERO' },
  { policy: 'PLAYER_MALUS_TEAM_EXCLUDE', fixedMalusPct: -5 },
];
export const PRIZE_THRESHOLDS = [5, 7, 10, 12];
export const PLATFORM_FEE_RATES = [0, 0.05, 0.10, 0.15];
export const SELL_COMMISSION_RATES = [0.0125, 0.02, 0.03];
export const BUY_COMMISSION_RATE = 0.02;

export interface FullRulesStressConfig {
  numSimulations: number;
  randomSeed: number;
  prizeThresholds: number[];
  platformFeeRates: number[];
  sellCommissionRates: number[];
}

export const DEFAULT_FULL_RULES_STRESS_CONFIG: FullRulesStressConfig = {
  numSimulations: 250,
  randomSeed: 44177,
  prizeThresholds: PRIZE_THRESHOLDS,
  platformFeeRates: PLATFORM_FEE_RATES,
  sellCommissionRates: SELL_COMMISSION_RATES,
};

export interface StressStrategyStats {
  season: string;
  seasonStatus: string;
  noVotePolicy: string;
  prizeThresholdPct: number;
  platformFeeRate: number;
  sellCommissionRate: number;
  strategy: FullRulesStrategyId;
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

export interface StressCombinationSummary {
  scope: 'main' | 'appendix';
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
  valueDominanceRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  platformSustainability: 'LOW' | 'MEDIUM' | 'HIGH';
  userAttractiveness: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
}

export interface FullRulesStressReport {
  generatedAt: string;
  config: FullRulesStressConfig;
  completedSeasons: string[];
  inProgressSeasons: string[];
  mainPolicies: string[];
  appendixPolicies: string[];
  strategyStats: StressStrategyStats[];
  inProgressStats: StressStrategyStats[];
  combinationSummaries: StressCombinationSummary[];
  appendixSummaries: StressCombinationSummary[];
  recommended: StressCombinationSummary;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pct(values: number[], pred: (value: number) => boolean): number {
  return values.length === 0 ? 0 : values.filter(pred).length / values.length * 100;
}

function adjustedResult(result: FullRulesPortfolioResult, sellCommissionRate: number): {
  roi: number;
  buyCost: number;
  grossSellValue: number;
  platformRevenue: number;
} {
  const grossSellValue = result.fullRulesFinalValue / (1 - 0.0125);
  const buyCommission = result.buyCost - result.playerIds.length * 0; // kept for shape; buyCost already includes 2%.
  const sellProceeds = grossSellValue * (1 - sellCommissionRate);
  return {
    roi: result.buyCost > 0 ? ((sellProceeds - result.buyCost) / result.buyCost) * 100 : 0,
    buyCost: result.buyCost,
    grossSellValue,
    platformRevenue: buyCommission * 0 + grossSellValue * sellCommissionRate,
  };
}

function classifySustainability(platformRevenue: number, platformFeeRate: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  const retained = platformRevenue * platformFeeRate;
  if (retained >= 3) return 'HIGH';
  if (retained >= 1) return 'MEDIUM';
  return 'LOW';
}

function classifyAttractiveness(pctAbovePrize: number, avgROI: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (pctAbovePrize >= 25 && avgROI > -5) return 'HIGH';
  if (pctAbovePrize >= 12 && avgROI > -12) return 'MEDIUM';
  return 'LOW';
}

function classifyValueRisk(delta: number, valuePctAbovePrize: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (delta > 10 && valuePctAbovePrize > 55) return 'HIGH';
  if (delta > 5 && valuePctAbovePrize > 35) return 'MEDIUM';
  return 'LOW';
}

function summarizeStrategy(
  baseResults: FullRulesPortfolioResult[],
  prizeThresholdPct: number,
  platformFeeRate: number,
  sellCommissionRate: number,
): Omit<StressStrategyStats, 'season' | 'seasonStatus' | 'noVotePolicy' | 'prizeThresholdPct' | 'platformFeeRate' | 'sellCommissionRate' | 'strategy' | 'numSimulations'> {
  const adjusted = baseResults.map(result => adjustedResult(result, sellCommissionRate));
  const rois = adjusted.map(result => result.roi);
  const avgPlatformRevenueGross = mean(adjusted.map(result => result.platformRevenue));
  return {
    avgROI: mean(rois),
    medianROI: median(rois),
    pctAbove0: pct(rois, roi => roi > 0),
    pctAbove5: pct(rois, roi => roi > 5),
    pctAbove7: pct(rois, roi => roi > 7),
    pctAbove10: pct(rois, roi => roi > 10),
    pctAbovePrizeThreshold: pct(rois, roi => roi > prizeThresholdPct),
    estimatedWinners: rois.filter(roi => roi > prizeThresholdPct).length,
    avgBuyCost: mean(adjusted.map(result => result.buyCost)),
    avgGrossSellValue: mean(adjusted.map(result => result.grossSellValue)),
    avgPlatformRevenue: avgPlatformRevenueGross * platformFeeRate,
    avgFantasyImpact: mean(baseResults.map(result => result.fantasyImpactPct)),
    volatility: stdDev(rois),
  };
}

function buildBaseResults(
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
  seasons: string[],
  policies: NoVotePolicyConfig[],
  config: FullRulesStressConfig,
): FullRulesPortfolioResult[] {
  const out: FullRulesPortfolioResult[] = [];
  seasons.forEach((season, seasonIdx) => {
    const pool = buildMatchedSeasonPool(quoteRows, voteRows, season);
    const seasonVotes = voteRows.filter(row => row.season === season);
    policies.forEach((policy, policyIdx) => {
      FULL_RULES_STRATEGIES.forEach((strategy, strategyIdx) => {
        const rng = createSeededRng(config.randomSeed + seasonIdx * 100000 + policyIdx * 10000 + strategyIdx * 1000);
        for (let sim = 0; sim < config.numSimulations; sim++) {
          const roster = buildFullRulesRoster(pool.matchedRows, strategy, rng);
          out.push(evaluateFullRulesPortfolio(roster, seasonVotes, policy, strategy));
        }
      });
    });
  });
  return out;
}

function buildStrategyStats(
  baseResults: FullRulesPortfolioResult[],
  config: FullRulesStressConfig,
): StressStrategyStats[] {
  const out: StressStrategyStats[] = [];
  const keys = new Set(baseResults.map(r => `${r.season}|${r.seasonStatus}|${r.noVotePolicy}|${r.strategy}`));
  for (const key of keys) {
    const [season, seasonStatus, noVotePolicy, strategy] = key.split('|');
    const rows = baseResults.filter(r => r.season === season && r.noVotePolicy === noVotePolicy && r.strategy === strategy);
    for (const prizeThresholdPct of config.prizeThresholds) {
      for (const platformFeeRate of config.platformFeeRates) {
        for (const sellCommissionRate of config.sellCommissionRates) {
          out.push({
            season,
            seasonStatus,
            noVotePolicy,
            prizeThresholdPct,
            platformFeeRate,
            sellCommissionRate,
            strategy: strategy as FullRulesStrategyId,
            numSimulations: rows.length,
            ...summarizeStrategy(rows, prizeThresholdPct, platformFeeRate, sellCommissionRate),
          });
        }
      }
    }
  }
  return out;
}

function summarizeCombination(stats: StressStrategyStats[], scope: 'main' | 'appendix'): StressCombinationSummary[] {
  const keys = new Set(stats.map(s => `${s.noVotePolicy}|${s.prizeThresholdPct}|${s.platformFeeRate}|${s.sellCommissionRate}`));
  return [...keys].map(key => {
    const [noVotePolicy, threshold, fee, sell] = key.split('|');
    const rows = stats.filter(s =>
      s.noVotePolicy === noVotePolicy &&
      s.prizeThresholdPct === Number(threshold) &&
      s.platformFeeRate === Number(fee) &&
      s.sellCommissionRate === Number(sell)
    );
    const value = rows.filter(s => s.strategy === 'VALUE');
    const random = rows.filter(s => s.strategy === 'RANDOM');
    const valueAvgROI = mean(value.map(s => s.avgROI));
    const randomAvgROI = mean(random.map(s => s.avgROI));
    const valuePctAbovePrize = mean(value.map(s => s.pctAbovePrizeThreshold));
    const avgPlatformRevenue = mean(rows.map(s => s.avgPlatformRevenue));
    const pctAbovePrize = mean(rows.map(s => s.pctAbovePrizeThreshold));
    const avgROI = mean(rows.map(s => s.avgROI));
    const valueDeltaVsRandom = valueAvgROI - randomAvgROI;
    const valueDominanceRisk = classifyValueRisk(valueDeltaVsRandom, valuePctAbovePrize);
    const platformSustainability = classifySustainability(avgPlatformRevenue, Number(fee));
    const userAttractiveness = classifyAttractiveness(pctAbovePrize, avgROI);
    const score =
      pctAbovePrize * 0.35 +
      avgROI * 0.8 +
      avgPlatformRevenue * 1.5 -
      (valueDominanceRisk === 'HIGH' ? 15 : valueDominanceRisk === 'MEDIUM' ? 6 : 0) -
      (userAttractiveness === 'LOW' ? 8 : 0) +
      (platformSustainability === 'HIGH' ? 4 : platformSustainability === 'MEDIUM' ? 2 : 0);
    return {
      scope,
      noVotePolicy,
      prizeThresholdPct: Number(threshold),
      platformFeeRate: Number(fee),
      sellCommissionRate: Number(sell),
      avgROI,
      pctAbove0: mean(rows.map(s => s.pctAbove0)),
      pctAbove5: mean(rows.map(s => s.pctAbove5)),
      pctAbove7: mean(rows.map(s => s.pctAbove7)),
      pctAbove10: mean(rows.map(s => s.pctAbove10)),
      pctAbovePrizeThreshold: pctAbovePrize,
      estimatedWinners: mean(rows.map(s => s.estimatedWinners)),
      avgPlatformRevenue,
      valueAvgROI,
      randomAvgROI,
      valueDeltaVsRandom,
      valueDominanceRisk,
      platformSustainability,
      userAttractiveness,
      score,
    };
  }).sort((a, b) => b.score - a.score);
}

export function runFullRulesStressTest(
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
  config: FullRulesStressConfig = DEFAULT_FULL_RULES_STRESS_CONFIG,
): FullRulesStressReport {
  const mainBase = buildBaseResults(quoteRows, voteRows, STRESS_COMPLETED_SEASONS, MAIN_NO_VOTE_POLICIES, config);
  const appendixBase = buildBaseResults(quoteRows, voteRows, STRESS_COMPLETED_SEASONS, APPENDIX_NO_VOTE_POLICIES, config);
  const inProgressBase = buildBaseResults(quoteRows, voteRows, STRESS_IN_PROGRESS_SEASONS, MAIN_NO_VOTE_POLICIES, config);
  const strategyStats = buildStrategyStats(mainBase, config);
  const appendixStats = buildStrategyStats(appendixBase, config);
  const inProgressStats = buildStrategyStats(inProgressBase, config);
  const combinationSummaries = summarizeCombination(strategyStats, 'main');
  const appendixSummaries = summarizeCombination(appendixStats, 'appendix');
  const recommended = combinationSummaries.find(s =>
    s.noVotePolicy === 'PLAYER_ZERO_TEAM_EXCLUDE' &&
    s.platformFeeRate === 0.10 &&
    s.sellCommissionRate === 0.02 &&
    s.prizeThresholdPct === 7
  ) ?? combinationSummaries[0];
  return {
    generatedAt: new Date().toISOString(),
    config,
    completedSeasons: STRESS_COMPLETED_SEASONS,
    inProgressSeasons: STRESS_IN_PROGRESS_SEASONS,
    mainPolicies: MAIN_NO_VOTE_POLICIES.map(p => p.policy),
    appendixPolicies: APPENDIX_NO_VOTE_POLICIES.map(p => p.policy),
    strategyStats,
    inProgressStats,
    combinationSummaries,
    appendixSummaries,
    recommended,
  };
}

function fmt(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function buildFullRulesStressCsv(report: FullRulesStressReport): { headers: string[]; rows: (string | number)[][] } {
  const headers = [
    'scope', 'season', 'seasonStatus', 'noVotePolicy', 'prizeThresholdPct', 'platformFeeRate', 'sellCommissionRate',
    'strategy', 'numSimulations', 'avgROI', 'medianROI', 'pctAbove0', 'pctAbove5', 'pctAbove7', 'pctAbove10',
    'pctAbovePrizeThreshold', 'estimatedWinners', 'avgPlatformRevenue', 'avgFantasyImpact', 'volatility',
  ];
  const scopedRows: Array<{ scope: string; stat: StressStrategyStats }> = [
    ...report.strategyStats.map(stat => ({ scope: 'main', stat })),
    ...report.inProgressStats.map(stat => ({ scope: 'in_progress', stat })),
  ];
  const rows = scopedRows.map(({ scope, stat: s }) => [
      scope, s.season, s.seasonStatus, s.noVotePolicy, s.prizeThresholdPct, s.platformFeeRate, s.sellCommissionRate,
      s.strategy, s.numSimulations, +s.avgROI.toFixed(4), +s.medianROI.toFixed(4), +s.pctAbove0.toFixed(4),
      +s.pctAbove5.toFixed(4), +s.pctAbove7.toFixed(4), +s.pctAbove10.toFixed(4), +s.pctAbovePrizeThreshold.toFixed(4),
      +s.estimatedWinners.toFixed(4), +s.avgPlatformRevenue.toFixed(4), +s.avgFantasyImpact.toFixed(4), +s.volatility.toFixed(4),
    ]);
  return { headers, rows };
}

export function buildFullRulesStressMarkdown(report: FullRulesStressReport): string {
  const rec = report.recommended;
  const valueMain = report.combinationSummaries.filter(s => s.noVotePolicy === 'PLAYER_ZERO_TEAM_EXCLUDE');
  const bestValueRisk = valueMain[0]?.valueDominanceRisk ?? 'MEDIUM';
  const original10 = report.combinationSummaries.find(s =>
    s.noVotePolicy === 'PLAYER_ZERO_TEAM_EXCLUDE' &&
    s.platformFeeRate === 0.10 &&
    s.sellCommissionRate === 0.0125 &&
    s.prizeThresholdPct === 5
  );
  const lines: string[] = [];
  lines.push('# FantaTrading - Full Rules Stress Test');
  lines.push('');
  lines.push(`**Generato il:** ${new Date(report.generatedAt).toLocaleString('it-IT')}`);
  lines.push(`**Completed usate:** ${report.completedSeasons.join(', ')}`);
  lines.push(`**In progress separata:** ${report.inProgressSeasons.join(', ')}`);
  lines.push(`**Policy principali:** ${report.mainPolicies.join(', ')}`);
  lines.push(`**Policy in appendice:** ${report.appendixPolicies.join(', ')}`);
  lines.push('');
  lines.push('## Raccomandazione V1');
  lines.push('');
  lines.push(`- NoVotePolicy: **PLAYER_ZERO_TEAM_EXCLUDE**`);
  lines.push(`- Soglia premio: **${rec.prizeThresholdPct}%**`);
  lines.push(`- Commissione vendita: **${fmt(rec.sellCommissionRate * 100)}%**`);
  lines.push(`- Platform fee sulle commissioni: **${fmt(rec.platformFeeRate * 100)}%**`);
  lines.push(`- Attrattivita utenti: **${rec.userAttractiveness}**`);
  lines.push(`- Sostenibilita piattaforma: **${rec.platformSustainability}**`);
  lines.push(`- Rischio dominanza VALUE: **${rec.valueDominanceRisk}**`);
  lines.push('');
  lines.push('## Top combinazioni principali');
  lines.push('');
  lines.push('| # | Policy | Soglia | Platform fee | Sell fee | ROI medio | % > soglia | Vincitori stimati | Ricavo piattaforma | VALUE delta vs RANDOM | Sostenibilita | Attrattivita | Rischio VALUE |');
  lines.push('|---|--------|--------|--------------|----------|-----------|------------|-------------------|--------------------|-----------------------|---------------|-------------|---------------|');
  report.combinationSummaries.slice(0, 20).forEach((s, idx) => {
    lines.push(`| ${idx + 1} | ${s.noVotePolicy} | ${s.prizeThresholdPct}% | ${fmt(s.platformFeeRate * 100)}% | ${fmt(s.sellCommissionRate * 100)}% | ${fmt(s.avgROI)}% | ${fmt(s.pctAbovePrizeThreshold)}% | ${fmt(s.estimatedWinners, 1)} | ${fmt(s.avgPlatformRevenue)} | ${fmt(s.valueDeltaVsRandom)}pp | ${s.platformSustainability} | ${s.userAttractiveness} | ${s.valueDominanceRisk} |`);
  });
  lines.push('');
  lines.push('## Confronto policy principali');
  lines.push('');
  lines.push('| Policy | ROI medio | % > 0 | % > 5 | % > 7 | % > 10 | VALUE ROI | VALUE delta vs RANDOM |');
  lines.push('|--------|-----------|-------|-------|-------|--------|-----------|-----------------------|');
  for (const policy of report.mainPolicies) {
    const rows = report.combinationSummaries.filter(s => s.noVotePolicy === policy);
    lines.push(`| ${policy} | ${fmt(mean(rows.map(s => s.avgROI)))}% | ${fmt(mean(rows.map(s => s.pctAbove0)))}% | ${fmt(mean(rows.map(s => s.pctAbove5)))}% | ${fmt(mean(rows.map(s => s.pctAbove7)))}% | ${fmt(mean(rows.map(s => s.pctAbove10)))}% | ${fmt(mean(rows.map(s => s.valueAvgROI)))}% | ${fmt(mean(rows.map(s => s.valueDeltaVsRandom)))}pp |`);
  }
  lines.push('');
  lines.push('## Valutazioni');
  lines.push('');
  lines.push(`Il modello Originale + 10% margine ${original10 && original10.platformSustainability !== 'LOW' ? 'resta sostenibile in forma preliminare' : 'resta fragile se applicato senza aggiustamenti'}, ma migliora con commissione vendita al 2% e soglia premio al 7%.`);
  lines.push(`VALUE resta la strategia piu forte o tra le piu forti: il rischio osservato e **${bestValueRisk}**. Non va bloccata, ma va monitorata con quotazioni giornata per giornata per capire se il vantaggio deriva da informazione ex-post Qt.I/Qt.A.`);
  lines.push('');
  lines.push('## Proposta Regolamento FantaTrading V1');
  lines.push('');
  lines.push('- Rosa: 25 giocatori, 3 P, 8 D, 8 C, 6 A.');
  lines.push('- Acquisto: commissione 2%.');
  lines.push(`- Vendita: commissione consigliata ${fmt(rec.sellCommissionRate * 100)}%.`);
  lines.push(`- Platform fee consigliata: ${fmt(rec.platformFeeRate * 100)}% delle commissioni.`);
  lines.push(`- Premio: soglia ROI consigliata ${rec.prizeThresholdPct}%.`);
  lines.push('- SV: PLAYER_ZERO_TEAM_EXCLUDE, cioe assente escluso dalla media squadra e neutro sul singolo finche non esiste una regola ufficiale diversa.');
  lines.push('- Fasce squadra e bonus/malus: tabella ufficiale gia configurata.');
  lines.push('');
  lines.push('## Appendice policy severe');
  lines.push('');
  lines.push('| Policy | ROI medio | % > 0 | % > 5 | % > 10 | Nota |');
  lines.push('|--------|-----------|-------|-------|--------|------|');
  for (const policy of report.appendixPolicies) {
    const rows = report.appendixSummaries.filter(s => s.noVotePolicy === policy);
    lines.push(`| ${policy} | ${fmt(mean(rows.map(s => s.avgROI)))}% | ${fmt(mean(rows.map(s => s.pctAbove0)))}% | ${fmt(mean(rows.map(s => s.pctAbove5)))}% | ${fmt(mean(rows.map(s => s.pctAbove10)))}% | Troppo severa per report principale |`);
  }
  lines.push('');
  lines.push('## In Progress');
  lines.push('');
  lines.push('La stagione 2025/26 resta separata e non entra nelle raccomandazioni definitive.');
  lines.push('');
  lines.push('## Limiti');
  lines.push('');
  lines.push('- Mancano quotazioni giornata per giornata: la componente trading resta Qt.I -> Qt.A.');
  lines.push('- Non vengono simulate compravendite intra-stagione.');
  lines.push('- La dominanza VALUE potrebbe cambiare con prezzi dinamici e vincoli di liquidita.');
  lines.push('- Gli SV sono derivati da assenza nel file voti, coerentemente con i dati disponibili.');
  lines.push('');
  return lines.join('\n');
}
