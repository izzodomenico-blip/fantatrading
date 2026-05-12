import { DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG } from '../config/teamBandBonusTables';
import { getBonusMalusPct, getNoVoteBonusMalusPct } from '../engine/fantaTradingBonusTableEngine';
import { calculateTeamVoteBand, NoVotePolicyConfig, TeamVoteInput } from '../engine/teamVoteBandEngine';
import { NormalizedQuoteRow } from '../importers/realQuotesImporter';
import { NormalizedVoteRow } from '../importers/realVotesImporter';
import { mean, stdDev } from '../utils/mathUtils';
import { createSeededRng } from '../utils/randomUtils';

export type FullRulesStrategyId = 'RANDOM' | 'LOW_COST' | 'TOP_PLAYER' | 'BALANCED' | 'VALUE';

export const FULL_RULES_V1 = 'FULL_RULES_V1';
export const FULL_RULES_STRATEGIES: FullRulesStrategyId[] = ['RANDOM', 'LOW_COST', 'TOP_PLAYER', 'BALANCED', 'VALUE'];
export const FULL_RULES_COMPLETED_SEASONS = ['2023/24', '2024/25'];
export const FULL_RULES_IN_PROGRESS_SEASONS = ['2025/26'];
export const FULL_RULES_ROSTER = { P: 3, D: 8, C: 8, A: 6 } as const;

const BUY_RATE = 0.02;
const SELL_RATE = 0.0125;

export interface FullRulesBacktestConfig {
  numSimulations: number;
  randomSeed: number;
  fixedNoVoteMalusPct: number;
}

export const DEFAULT_FULL_RULES_BACKTEST_CONFIG: FullRulesBacktestConfig = {
  numSimulations: 250,
  randomSeed: 99017,
  fixedNoVoteMalusPct: -5,
};

export interface MatchedSeasonPool {
  season: string;
  seasonStatus: string;
  matchedRows: NormalizedQuoteRow[];
  quoteOnlyRows: NormalizedQuoteRow[];
  voteOnlyPlayerIds: string[];
}

export interface FullRulesPortfolioResult {
  modelId: string;
  season: string;
  seasonStatus: string;
  strategy: FullRulesStrategyId;
  noVotePolicy: string;
  playerIds: number[];
  buyCost: number;
  tradingOnlyFinalValue: number;
  fullRulesFinalValue: number;
  tradingOnlyROI: number;
  fullRulesROI: number;
  fantasyImpactPct: number;
  derivedNoVotes: number;
  playedVotes: number;
}

export interface FullRulesStats {
  season: string;
  seasonStatus: string;
  strategy: FullRulesStrategyId;
  noVotePolicy: string;
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

export interface FullRulesAggregateStats extends Omit<FullRulesStats, 'season' | 'seasonStatus' | 'numSimulations'> {
  numSeasons: number;
  numSimulations: number;
}

export interface FullRulesBacktestReport {
  generatedAt: string;
  modelId: string;
  config: FullRulesBacktestConfig;
  completedSeasons: string[];
  inProgressSeasons: string[];
  strategies: FullRulesStrategyId[];
  noVotePolicies: NoVotePolicyConfig[];
  poolSummary: Array<{
    season: string;
    seasonStatus: string;
    matchedPlayers: number;
    quoteOnlyPlayers: number;
    voteOnlyPlayers: number;
  }>;
  completedStats: FullRulesStats[];
  inProgressStats: FullRulesStats[];
  aggregateCompletedStats: FullRulesAggregateStats[];
  strongestStrategy: FullRulesStrategyId;
  recommendedNoVotePolicy: string;
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

function playerId(row: { playerId: number | string }): string {
  return String(row.playerId);
}

function seasonPlayerKey(row: { season: string; playerId: number | string }): string {
  return `${row.season}|${playerId(row)}`;
}

function seasonRoundPlayerKey(season: string, round: number, id: number | string): string {
  return `${season}|${round}|${id}`;
}

function quoteTradingReturnPct(row: NormalizedQuoteRow): { raw: number; effective: number } {
  const raw = (row.currentOrFinalQuote - row.initialQuote) * 5;
  return { raw, effective: Math.max(-100, raw) };
}

export function calculateSellValue(initialValue: number, effectiveReturnPct: number): number {
  return Math.max(0, initialValue * (1 + effectiveReturnPct / 100));
}

export function buildMatchedSeasonPool(
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
  season: string,
): MatchedSeasonPool {
  const seasonQuotes = quoteRows.filter(row => row.season === season && row.initialQuote > 0);
  const seasonVotes = voteRows.filter(row => row.season === season);
  const votePlayerIds = new Set(seasonVotes.map(row => seasonPlayerKey(row)));
  const quotePlayerIds = new Set(seasonQuotes.map(row => seasonPlayerKey(row)));
  return {
    season,
    seasonStatus: seasonVotes[0]?.seasonStatus ?? seasonQuotes[0]?.seasonStatus ?? '',
    matchedRows: seasonQuotes.filter(row => votePlayerIds.has(seasonPlayerKey(row))),
    quoteOnlyRows: seasonQuotes.filter(row => !votePlayerIds.has(seasonPlayerKey(row))),
    voteOnlyPlayerIds: [...votePlayerIds].filter(key => !quotePlayerIds.has(key)).map(key => key.split('|')[1]),
  };
}

function groupByRole(rows: NormalizedQuoteRow[]): Record<string, NormalizedQuoteRow[]> {
  const out: Record<string, NormalizedQuoteRow[]> = {};
  for (const row of rows) {
    if (!out[row.role]) out[row.role] = [];
    out[row.role].push(row);
  }
  return out;
}

function takeRandom<T>(items: T[], count: number, rng: () => number): T[] {
  if (items.length < count) throw new Error(`Elementi insufficienti: richiesti ${count}, disponibili ${items.length}`);
  const pool = [...items];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function weightedSample<T>(items: T[], count: number, score: (item: T) => number, rng: () => number): T[] {
  if (items.length < count) throw new Error(`Elementi insufficienti: richiesti ${count}, disponibili ${items.length}`);
  const pool = items.map(item => ({ item, score: Math.max(0.0001, score(item)) }));
  const selected: T[] = [];
  for (let i = 0; i < count; i++) {
    const total = pool.reduce((sum, item) => sum + item.score, 0);
    let target = rng() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      target -= pool[idx].score;
      if (target <= 0) break;
    }
    const [picked] = pool.splice(Math.min(idx, pool.length - 1), 1);
    selected.push(picked.item);
  }
  return selected;
}

function priceBand(rows: NormalizedQuoteRow[], start: number, end: number): NormalizedQuoteRow[] {
  const sorted = [...rows].sort((a, b) => a.initialQuote - b.initialQuote);
  const from = Math.floor(sorted.length * start);
  const to = Math.max(from + 1, Math.ceil(sorted.length * end));
  return sorted.slice(from, to);
}

function selectBalanced(rows: NormalizedQuoteRow[], count: number, rng: () => number): NormalizedQuoteRow[] {
  const low = Math.floor(count / 3);
  const high = Math.floor(count / 3);
  const mid = count - low - high;
  const selected: NormalizedQuoteRow[] = [];
  const used = new Set<number>();
  for (const [start, end, n] of [[0, 0.34, low], [0.34, 0.67, mid], [0.67, 1, high]] as const) {
    const candidates = priceBand(rows, start, end).filter(row => !used.has(row.playerId));
    const picked = takeRandom(candidates.length >= n ? candidates : rows.filter(row => !used.has(row.playerId)), n, rng);
    picked.forEach(row => used.add(row.playerId));
    selected.push(...picked);
  }
  return selected;
}

export function buildFullRulesRoster(
  matchedRows: NormalizedQuoteRow[],
  strategy: FullRulesStrategyId,
  rng: () => number,
): NormalizedQuoteRow[] {
  const byRole = groupByRole(matchedRows);
  const roster: NormalizedQuoteRow[] = [];
  for (const [role, count] of Object.entries(FULL_RULES_ROSTER)) {
    const rows = byRole[role] ?? [];
    if (rows.length < count) throw new Error(`Ruolo ${role} insufficiente per rosa full-rules (${rows.length}/${count})`);
    if (strategy === 'RANDOM') {
      roster.push(...takeRandom(rows, count, rng));
    } else if (strategy === 'LOW_COST') {
      const maxQ = Math.max(...rows.map(row => row.initialQuote));
      roster.push(...weightedSample(rows, count, row => maxQ - row.initialQuote + 1, rng));
    } else if (strategy === 'TOP_PLAYER') {
      roster.push(...weightedSample(rows, count, row => row.initialQuote, rng));
    } else if (strategy === 'BALANCED') {
      roster.push(...selectBalanced(rows, count, rng));
    } else if (strategy === 'VALUE') {
      const candidates = priceBand(rows, 0.15, 0.65);
      const pool = candidates.length >= count ? candidates : rows;
      const maxQ = Math.max(...pool.map(row => row.initialQuote));
      roster.push(...weightedSample(pool, count, row => maxQ - row.initialQuote + 1, rng));
    }
  }
  return roster;
}

function buildVoteIndex(voteRows: NormalizedVoteRow[]): Map<string, NormalizedVoteRow> {
  const index = new Map<string, NormalizedVoteRow>();
  for (const row of voteRows) {
    index.set(seasonRoundPlayerKey(row.season, row.round, row.playerId), row);
  }
  return index;
}

export function getRoundVoteInput(
  player: NormalizedQuoteRow,
  round: number,
  voteIndex: Map<string, NormalizedVoteRow>,
): TeamVoteInput {
  const vote = voteIndex.get(seasonRoundPlayerKey(player.season, round, player.playerId));
  if (!vote) return { playerId: player.playerId, played: false, vote: null };
  return { playerId: player.playerId, played: vote.played, vote: vote.vote };
}

export function evaluateFullRulesPortfolio(
  roster: NormalizedQuoteRow[],
  seasonVotes: NormalizedVoteRow[],
  noVotePolicy: NoVotePolicyConfig,
  strategy: FullRulesStrategyId = 'RANDOM',
): FullRulesPortfolioResult {
  if (roster.length !== 25) throw new Error(`Rosa full-rules non valida: ${roster.length}/25`);
  const season = roster[0]?.season ?? 'unknown';
  const seasonStatus = roster[0]?.seasonStatus ?? 'completed';
  const voteIndex = buildVoteIndex(seasonVotes);
  const rounds = [...new Set(seasonVotes.map(row => row.round))].sort((a, b) => a - b);
  const fantasyMultipliers = new Map<number, number>(roster.map(player => [player.playerId, 1]));
  let derivedNoVotes = 0;
  let playedVotes = 0;

  for (const round of rounds) {
    const voteInputs = roster.map(player => getRoundVoteInput(player, round, voteIndex));
    const band = calculateTeamVoteBand(voteInputs, noVotePolicy);
    for (const player of roster) {
      const input = voteInputs.find(vote => vote.playerId === player.playerId)!;
      const bonusPct = input.played && input.vote !== null
        ? getBonusMalusPct(band.teamBand, input.vote, DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG).bonusMalusPct
        : getNoVoteBonusMalusPct(noVotePolicy);
      if (!input.played || input.vote === null) derivedNoVotes += 1;
      else playedVotes += 1;
      fantasyMultipliers.set(player.playerId, (fantasyMultipliers.get(player.playerId) ?? 1) * (1 + bonusPct / 100));
    }
  }

  let buyCost = 0;
  let tradingOnlyFinalValue = 0;
  let fullRulesFinalValue = 0;

  for (const player of roster) {
    const { effective } = quoteTradingReturnPct(player);
    const tradingSellValue = calculateSellValue(player.initialQuote, effective);
    const fantasyBaseValue = player.initialQuote * (fantasyMultipliers.get(player.playerId) ?? 1);
    const fullSellValue = calculateSellValue(fantasyBaseValue, effective);
    buyCost += player.initialQuote * (1 + BUY_RATE);
    tradingOnlyFinalValue += tradingSellValue * (1 - SELL_RATE);
    fullRulesFinalValue += fullSellValue * (1 - SELL_RATE);
  }

  const tradingOnlyROI = buyCost > 0 ? ((tradingOnlyFinalValue - buyCost) / buyCost) * 100 : 0;
  const fullRulesROI = buyCost > 0 ? ((fullRulesFinalValue - buyCost) / buyCost) * 100 : 0;
  return {
    modelId: FULL_RULES_V1,
    season,
    seasonStatus,
    strategy,
    noVotePolicy: noVotePolicy.policy,
    playerIds: roster.map(player => player.playerId),
    buyCost,
    tradingOnlyFinalValue,
    fullRulesFinalValue,
    tradingOnlyROI,
    fullRulesROI,
    fantasyImpactPct: fullRulesROI - tradingOnlyROI,
    derivedNoVotes,
    playedVotes,
  };
}

function summarizeResults(
  season: string,
  seasonStatus: string,
  strategy: FullRulesStrategyId,
  noVotePolicy: string,
  results: FullRulesPortfolioResult[],
): FullRulesStats {
  const rois = results.map(result => result.fullRulesROI);
  return {
    season,
    seasonStatus,
    strategy,
    noVotePolicy,
    numSimulations: results.length,
    avgTradingOnlyROI: mean(results.map(result => result.tradingOnlyROI)),
    avgFullRulesROI: mean(rois),
    medianFullRulesROI: median(rois),
    fantasyImpactAvg: mean(results.map(result => result.fantasyImpactPct)),
    pctAbove0: pct(rois, roi => roi > 0),
    pctAbove5: pct(rois, roi => roi > 5),
    pctAbove7: pct(rois, roi => roi > 7),
    pctAbove10: pct(rois, roi => roi > 10),
    bestROI: rois.length ? Math.max(...rois) : 0,
    worstROI: rois.length ? Math.min(...rois) : 0,
    volatility: stdDev(rois),
    avgDerivedNoVotes: mean(results.map(result => result.derivedNoVotes)),
  };
}

function summarizeAggregate(strategy: FullRulesStrategyId, noVotePolicy: string, stats: FullRulesStats[]): FullRulesAggregateStats {
  return {
    strategy,
    noVotePolicy,
    numSeasons: stats.length,
    numSimulations: stats.reduce((sum, stat) => sum + stat.numSimulations, 0),
    avgTradingOnlyROI: mean(stats.map(stat => stat.avgTradingOnlyROI)),
    avgFullRulesROI: mean(stats.map(stat => stat.avgFullRulesROI)),
    medianFullRulesROI: mean(stats.map(stat => stat.medianFullRulesROI)),
    fantasyImpactAvg: mean(stats.map(stat => stat.fantasyImpactAvg)),
    pctAbove0: mean(stats.map(stat => stat.pctAbove0)),
    pctAbove5: mean(stats.map(stat => stat.pctAbove5)),
    pctAbove7: mean(stats.map(stat => stat.pctAbove7)),
    pctAbove10: mean(stats.map(stat => stat.pctAbove10)),
    bestROI: stats.length ? Math.max(...stats.map(stat => stat.bestROI)) : 0,
    worstROI: stats.length ? Math.min(...stats.map(stat => stat.worstROI)) : 0,
    volatility: mean(stats.map(stat => stat.volatility)),
    avgDerivedNoVotes: mean(stats.map(stat => stat.avgDerivedNoVotes)),
  };
}

function runSeasonPolicyStrategy(
  pool: MatchedSeasonPool,
  seasonVotes: NormalizedVoteRow[],
  strategy: FullRulesStrategyId,
  noVotePolicy: NoVotePolicyConfig,
  config: FullRulesBacktestConfig,
  seedOffset: number,
): FullRulesStats {
  for (const [role, count] of Object.entries(FULL_RULES_ROSTER)) {
    const available = pool.matchedRows.filter(row => row.role === role).length;
    if (available < count) {
      throw new Error(`Stagione ${pool.season}: ruolo ${role} insufficiente nel pool matched (${available}/${count})`);
    }
  }
  const rng = createSeededRng(config.randomSeed + seedOffset);
  const results: FullRulesPortfolioResult[] = [];
  for (let sim = 0; sim < config.numSimulations; sim++) {
    const roster = buildFullRulesRoster(pool.matchedRows, strategy, rng);
    results.push(evaluateFullRulesPortfolio(roster, seasonVotes, noVotePolicy, strategy));
  }
  return summarizeResults(pool.season, pool.seasonStatus, strategy, noVotePolicy.policy, results);
}

export function runHistoricalFullRulesBacktest(
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
  config: FullRulesBacktestConfig = DEFAULT_FULL_RULES_BACKTEST_CONFIG,
): FullRulesBacktestReport {
  const noVotePolicies: NoVotePolicyConfig[] = [
    { policy: 'ZERO' },
    { policy: 'FIVE' },
    { policy: 'EXCLUDE' },
    { policy: 'PLAYER_ZERO_TEAM_EXCLUDE' },
    { policy: 'PLAYER_MALUS_TEAM_EXCLUDE', fixedMalusPct: config.fixedNoVoteMalusPct },
  ];
  const seasons = [...FULL_RULES_COMPLETED_SEASONS, ...FULL_RULES_IN_PROGRESS_SEASONS];
  const pools = seasons.map(season => buildMatchedSeasonPool(quoteRows, voteRows, season));
  const runnablePools = pools.filter(pool => Object.entries(FULL_RULES_ROSTER)
    .every(([role, count]) => pool.matchedRows.filter(row => row.role === role).length >= count));
  const completedStats: FullRulesStats[] = [];
  const inProgressStats: FullRulesStats[] = [];

  runnablePools.forEach((pool, seasonIdx) => {
    const seasonVotes = voteRows.filter(row => row.season === pool.season);
    noVotePolicies.forEach((policy, policyIdx) => {
      FULL_RULES_STRATEGIES.forEach((strategy, strategyIdx) => {
        const stats = runSeasonPolicyStrategy(
          pool,
          seasonVotes,
          strategy,
          policy,
          config,
          seasonIdx * 100000 + policyIdx * 10000 + strategyIdx * 1000,
        );
        if (FULL_RULES_COMPLETED_SEASONS.includes(pool.season)) completedStats.push(stats);
        else inProgressStats.push(stats);
      });
    });
  });

  const aggregateCompletedStats = noVotePolicies.flatMap(policy =>
    FULL_RULES_STRATEGIES.map(strategy => summarizeAggregate(
      strategy,
      policy.policy,
      completedStats.filter(stat => stat.strategy === strategy && stat.noVotePolicy === policy.policy),
    )),
  );
  const strongest = [...aggregateCompletedStats].sort((a, b) => b.avgFullRulesROI - a.avgFullRulesROI)[0];
  const policyRanking = noVotePolicies
    .map(policy => ({
      policy: policy.policy,
      avgROI: mean(aggregateCompletedStats.filter(stat => stat.noVotePolicy === policy.policy).map(stat => stat.avgFullRulesROI)),
      pctAbove0: mean(aggregateCompletedStats.filter(stat => stat.noVotePolicy === policy.policy).map(stat => stat.pctAbove0)),
      pctAbove5: mean(aggregateCompletedStats.filter(stat => stat.noVotePolicy === policy.policy).map(stat => stat.pctAbove5)),
      avgSv: mean(aggregateCompletedStats.filter(stat => stat.noVotePolicy === policy.policy).map(stat => stat.avgDerivedNoVotes)),
    }))
    .filter(policy => policy.pctAbove0 > 0)
    .sort((a, b) => {
      const balanceScore = (p: typeof a) => p.pctAbove5 + p.pctAbove0 * 0.25 - Math.max(0, Math.abs(p.avgROI) - 8);
      return balanceScore(b) - balanceScore(a);
    });

  return {
    generatedAt: new Date().toISOString(),
    modelId: FULL_RULES_V1,
    config,
    completedSeasons: FULL_RULES_COMPLETED_SEASONS,
    inProgressSeasons: FULL_RULES_IN_PROGRESS_SEASONS,
    strategies: FULL_RULES_STRATEGIES,
    noVotePolicies,
    poolSummary: pools.map(pool => ({
      season: pool.season,
      seasonStatus: pool.seasonStatus,
      matchedPlayers: pool.matchedRows.length,
      quoteOnlyPlayers: pool.quoteOnlyRows.length,
      voteOnlyPlayers: pool.voteOnlyPlayerIds.length,
    })),
    completedStats,
    inProgressStats,
    aggregateCompletedStats,
    strongestStrategy: strongest?.strategy ?? 'RANDOM',
    recommendedNoVotePolicy: policyRanking[0]?.policy ?? 'PLAYER_ZERO_TEAM_EXCLUDE',
  };
}

function fmt(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function buildHistoricalFullRulesCsv(report: FullRulesBacktestReport): { headers: string[]; rows: (string | number)[][] } {
  const headers = [
    'scope',
    'season',
    'seasonStatus',
    'strategy',
    'noVotePolicy',
    'numSimulations',
    'avgTradingOnlyROI',
    'avgFullRulesROI',
    'medianFullRulesROI',
    'fantasyImpactAvg',
    'pctAbove0',
    'pctAbove5',
    'pctAbove7',
    'pctAbove10',
    'bestROI',
    'worstROI',
    'volatility',
    'avgDerivedNoVotes',
  ];
  const statRows = [...report.completedStats, ...report.inProgressStats].map(stat => [
    FULL_RULES_COMPLETED_SEASONS.includes(stat.season) ? 'completed' : 'in_progress',
    stat.season,
    stat.seasonStatus,
    stat.strategy,
    stat.noVotePolicy,
    stat.numSimulations,
    +stat.avgTradingOnlyROI.toFixed(4),
    +stat.avgFullRulesROI.toFixed(4),
    +stat.medianFullRulesROI.toFixed(4),
    +stat.fantasyImpactAvg.toFixed(4),
    +stat.pctAbove0.toFixed(4),
    +stat.pctAbove5.toFixed(4),
    +stat.pctAbove7.toFixed(4),
    +stat.pctAbove10.toFixed(4),
    +stat.bestROI.toFixed(4),
    +stat.worstROI.toFixed(4),
    +stat.volatility.toFixed(4),
    +stat.avgDerivedNoVotes.toFixed(4),
  ]);
  return { headers, rows: statRows };
}

export function buildHistoricalFullRulesMarkdown(report: FullRulesBacktestReport): string {
  const lines: string[] = [];
  const aggregateByROI = [...report.aggregateCompletedStats].sort((a, b) => b.avgFullRulesROI - a.avgFullRulesROI);
  const valueStats = report.aggregateCompletedStats.filter(stat => stat.strategy === 'VALUE');
  const randomStats = report.aggregateCompletedStats.filter(stat => stat.strategy === 'RANDOM');
  const avgValueDelta = mean(valueStats.map(value => {
    const random = randomStats.find(stat => stat.noVotePolicy === value.noVotePolicy);
    return random ? value.avgFullRulesROI - random.avgFullRulesROI : 0;
  }));
  const recommendedPrizeThreshold = aggregateByROI[0]?.pctAbove10 > 35 ? '10%' : aggregateByROI[0]?.pctAbove7 > 35 ? '7%' : '5%';

  lines.push('# FantaTrading - Backtest Storico Full Rules V1');
  lines.push('');
  lines.push(`**Generato il:** ${new Date(report.generatedAt).toLocaleString('it-IT')}`);
  lines.push(`**Modello:** ${report.modelId}`);
  lines.push(`**Stagioni completed:** ${report.completedSeasons.join(', ')}`);
  lines.push(`**Stagioni in_progress:** ${report.inProgressSeasons.join(', ')}`);
  lines.push(`**Simulazioni per strategia/stagione/policy:** ${report.config.numSimulations}`);
  lines.push('');

  lines.push('## Pool Dati');
  lines.push('');
  lines.push('| Stagione | Stato | Matched quote+voti | Solo quotazioni | Solo voti | Scelta modello |');
  lines.push('|----------|-------|--------------------|-----------------|-----------|----------------|');
  for (const pool of report.poolSummary) {
    lines.push(`| ${pool.season} | ${pool.seasonStatus} | ${pool.matchedPlayers} | ${pool.quoteOnlyPlayers} | ${pool.voteOnlyPlayers} | Le rose iniziali usano solo giocatori matched; i quotati senza voti sono esclusi dalla generazione per evitare SV strutturali non informativi. |`);
  }
  lines.push('');

  lines.push('## Confronto Trading-Only vs Full-Rules');
  lines.push('');
  lines.push('| Strategia | Policy SV | ROI trading-only | ROI full-rules | Impatto voti | % > 0 | % > 5 | ROI mediano | Volatilita |');
  lines.push('|-----------|-----------|------------------|----------------|-------------|-------|-------|-------------|------------|');
  for (const stat of aggregateByROI) {
    lines.push(`| ${stat.strategy} | ${stat.noVotePolicy} | ${fmt(stat.avgTradingOnlyROI)}% | ${fmt(stat.avgFullRulesROI)}% | ${fmt(stat.fantasyImpactAvg)}pp | ${fmt(stat.pctAbove0)}% | ${fmt(stat.pctAbove5)}% | ${fmt(stat.medianFullRulesROI)}% | ${fmt(stat.volatility)} |`);
  }
  lines.push('');

  lines.push('## Confronto NoVotePolicy');
  lines.push('');
  lines.push('| Policy SV | ROI full-rules medio | % > 0 | % > 5 | % > 7 | % > 10 | SV derivati medi |');
  lines.push('|-----------|----------------------|-------|-------|-------|--------|-----------------|');
  for (const policy of report.noVotePolicies) {
    const stats = report.aggregateCompletedStats.filter(stat => stat.noVotePolicy === policy.policy);
    lines.push(`| ${policy.policy} | ${fmt(mean(stats.map(s => s.avgFullRulesROI)))}% | ${fmt(mean(stats.map(s => s.pctAbove0)))}% | ${fmt(mean(stats.map(s => s.pctAbove5)))}% | ${fmt(mean(stats.map(s => s.pctAbove7)))}% | ${fmt(mean(stats.map(s => s.pctAbove10)))}% | ${fmt(mean(stats.map(s => s.avgDerivedNoVotes)), 1)} |`);
  }
  lines.push('');

  lines.push('Le policy `PLAYER_ZERO_TEAM_EXCLUDE` e `PLAYER_MALUS_TEAM_EXCLUDE` separano correttamente effetto squadra ed effetto giocatore: lo SV non altera la media/fascia dei compagni, ma il singolo giocatore assente resta neutro oppure penalizzato.');
  lines.push('');

  lines.push('## ROI Medio per Strategia');
  lines.push('');
  lines.push('| Strategia | ROI medio | ROI mediano | Miglior ROI | Peggior ROI | Volatilita |');
  lines.push('|-----------|-----------|-------------|-------------|-------------|------------|');
  for (const strategy of report.strategies) {
    const stats = report.aggregateCompletedStats.filter(stat => stat.strategy === strategy);
    lines.push(`| ${strategy} | ${fmt(mean(stats.map(s => s.avgFullRulesROI)))}% | ${fmt(mean(stats.map(s => s.medianFullRulesROI)))}% | ${fmt(Math.max(...stats.map(s => s.bestROI)))}% | ${fmt(Math.min(...stats.map(s => s.worstROI)))}% | ${fmt(mean(stats.map(s => s.volatility)))} |`);
  }
  lines.push('');

  lines.push('## Dettaglio Completed');
  lines.push('');
  for (const season of report.completedSeasons) {
    lines.push(`### ${season}`);
    lines.push('');
    lines.push('| Strategia | Policy SV | ROI full-rules | Impatto voti | % > 0 | % > 5 | Best | Worst |');
    lines.push('|-----------|-----------|----------------|-------------|-------|-------|------|-------|');
    report.completedStats
      .filter(stat => stat.season === season)
      .sort((a, b) => b.avgFullRulesROI - a.avgFullRulesROI)
      .forEach(stat => {
        lines.push(`| ${stat.strategy} | ${stat.noVotePolicy} | ${fmt(stat.avgFullRulesROI)}% | ${fmt(stat.fantasyImpactAvg)}pp | ${fmt(stat.pctAbove0)}% | ${fmt(stat.pctAbove5)}% | ${fmt(stat.bestROI)}% | ${fmt(stat.worstROI)}% |`);
      });
    lines.push('');
  }

  lines.push('## Sezione In Progress');
  lines.push('');
  lines.push('La stagione 2025/26 e riportata separatamente e non entra negli aggregati completed o nelle raccomandazioni definitive.');
  lines.push('');
  lines.push('| Stagione | Strategia | Policy SV | ROI full-rules | % > 0 | % > 5 |');
  lines.push('|----------|-----------|-----------|----------------|-------|-------|');
  report.inProgressStats
    .sort((a, b) => b.avgFullRulesROI - a.avgFullRulesROI)
    .forEach(stat => {
      lines.push(`| ${stat.season} | ${stat.strategy} | ${stat.noVotePolicy} | ${fmt(stat.avgFullRulesROI)}% | ${fmt(stat.pctAbove0)}% | ${fmt(stat.pctAbove5)}% |`);
    });
  lines.push('');

  lines.push('## Lettura Strategica');
  lines.push('');
  lines.push(`La strategia piu forte dopo l aggiunta dei voti e **${report.strongestStrategy}** sugli aggregati completed. VALUE ${avgValueDelta >= 0 ? 'resta competitiva' : 'viene ridimensionata'} rispetto a RANDOM: delta medio VALUE-RANDOM pari a ${fmt(avgValueDelta)} punti percentuali sulle policy SV.`);
  lines.push('');
  lines.push('L impatto della componente voti e misurato come differenza tra ROI full-rules e ROI trading-only sullo stesso portafoglio. Questo isola il contributo fantasy da selezione rosa e rendimento quotazioni.');
  lines.push('');

  lines.push('## Limiti del Modello');
  lines.push('');
  lines.push('- Mancano quotazioni giornata per giornata: il modello applica i voti lungo la stagione, ma la componente quotazione resta Qt.I -> Qt.A.');
  lines.push('- Non simula compravendite intra-stagione, liquidita, vincoli di mercato o decisioni reattive dopo infortuni/squalifiche.');
  lines.push('- I giocatori quotati senza voti sono esclusi dalla generazione iniziale delle rose: scelta conservativa per non introdurre rischio SV artificiale.');
  lines.push('- I giocatori nei voti senza quotazione sono esclusi perche non hanno base economica Qt.I/Qt.A.');
  lines.push('- Gli SV sono derivati per assenza nel round, coerentemente con la struttura dei file voti.');
  lines.push('');

  lines.push('## Raccomandazioni');
  lines.push('');
  lines.push(`Policy SV piu coerente ed equilibrata preliminare: **${report.recommendedNoVotePolicy}**. Le policy team-exclude sono le piu corrette perche non distruggono la fascia squadra per colpa degli SV. Con malus individuale default -5% giornaliero, PLAYER_MALUS_TEAM_EXCLUDE risulta troppo severa in questo stress test; va ritarata a un malus molto piu basso oppure usata solo se il regolamento ufficiale conferma una penalita individuale esplicita. PLAYER_ZERO_TEAM_EXCLUDE e la variante piu neutra e stabile quando la penalita SV non e ancora ufficiale.`);
  lines.push(`Soglia premio preliminare consigliata: **${recommendedPrizeThreshold}**. La scelta tra 5%, 7% e 10% va finalizzata dopo test con quotazioni giornata per giornata: con dati solo Qt.I/Qt.A la soglia 5% e piu inclusiva, 10% piu selettiva e prudente per la sostenibilita.`);
  lines.push('');

  return lines.join('\n');
}
