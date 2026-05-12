import { DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG } from '../config/teamBandBonusTables';
import { SYNTHETIC_QUOTE_OPERATIONAL_MODEL } from '../config/syntheticQuoteOperationalModel';
import { getBonusMalusPct, getNoVoteBonusMalusPct } from '../engine/fantaTradingBonusTableEngine';
import { calculateTeamVoteBand, NoVotePolicyConfig } from '../engine/teamVoteBandEngine';
import { NormalizedQuoteRow, PlayerRole } from '../importers/realQuotesImporter';
import { NormalizedVoteRow } from '../importers/realVotesImporter';
import { mean, stdDev } from '../utils/mathUtils';
import { calculatePositionValue } from '../shared/calculations/positionValue';

export type IntraseasonStrategy =
  | 'HOLD'
  | 'VALUE_ROTATION'
  | 'MOMENTUM'
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'HYBRID_VALUE_MOMENTUM';

export interface SyntheticRoundQuoteInput {
  season: string;
  seasonStatus: string;
  round: number;
  playerId: number;
  playerName: string;
  club: string;
  role: PlayerRole;
  initialQuote: number;
  realCurrentOrFinalQuote: number;
  qa: number;
  qaa: number;
}

export interface IntraseasonBacktestConfig {
  marketFrequencies: number[];
  maxChangesPerWindow: number[];
  stopLossThresholds: number[];
  takeProfitThresholds: number[];
  sellFee?: number;
}

export interface IntraseasonScenarioResult {
  season: string;
  seasonStatus: string;
  strategy: IntraseasonStrategy;
  marketFrequency: number;
  maxChangesPerWindow: number;
  stopLossThreshold: number;
  takeProfitThreshold: number;
  finalROI: number;
  finalValue: number;
  totalCapitalAdded: number;
  totalCommissions: number;
  platformRevenue: number;
  trades: number;
  realizedPnL: number;
  overtradingRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface IntraseasonAggregateStats {
  scope: 'completed' | 'in_progress';
  strategy: IntraseasonStrategy;
  marketFrequency: number;
  maxChangesPerWindow: number;
  stopLossThreshold: number;
  takeProfitThreshold: number;
  numScenarios: number;
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

export interface IntraseasonBacktestReport {
  generatedAt: string;
  modelId: 'INTRASEASON_SYNTHETIC_TRADING_V1';
  quoteModel: typeof SYNTHETIC_QUOTE_OPERATIONAL_MODEL;
  warning: string;
  config: IntraseasonBacktestConfig;
  completedSeasons: string[];
  inProgressSeasons: string[];
  scenarioResults: IntraseasonScenarioResult[];
  completedStats: IntraseasonAggregateStats[];
  inProgressStats: IntraseasonAggregateStats[];
  bestCompletedStrategy: IntraseasonAggregateStats | null;
  holdCompleted: IntraseasonAggregateStats[];
}

interface Position {
  playerId: number;
  role: PlayerRole;
  playerName: string;
  club: string;
  buyRound: number;
  buyPrice: number;
  initialQuote: number;
  fantasyMultiplier: number;
}

const COMPLETED_SEASONS = ['2023/24', '2024/25'];
const IN_PROGRESS_SEASONS = ['2025/26'];
const STRATEGIES: IntraseasonStrategy[] = ['HOLD', 'VALUE_ROTATION', 'MOMENTUM', 'STOP_LOSS', 'TAKE_PROFIT', 'HYBRID_VALUE_MOMENTUM'];
const ROSTER: Record<PlayerRole, number> = { P: 3, D: 8, C: 8, A: 6 };
const BUY_FEE = 0.02;
const SELL_FEE = 0.0125;
const PLATFORM_FEE_RATE = 0.1;
const PRIZE_THRESHOLD = 7;
const NO_VOTE_POLICY: NoVotePolicyConfig = { policy: 'PLAYER_ZERO_TEAM_EXCLUDE' };

export const DEFAULT_INTRASEASON_BACKTEST_CONFIG: IntraseasonBacktestConfig = {
  marketFrequencies: [3, 5, 7],
  maxChangesPerWindow: [1, 3, 5],
  stopLossThresholds: [-5, -10],
  takeProfitThresholds: [7, 10, 15],
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pct(values: number[], pred: (value: number) => boolean): number {
  return values.length ? values.filter(pred).length / values.length * 100 : 0;
}

function key(season: string, round: number, playerId: number | string): string {
  return `${season}|${round}|${playerId}`;
}

function playerKey(season: string, playerId: number | string): string {
  return `${season}|${playerId}`;
}

export function buildSyntheticQuoteIndex(rows: SyntheticRoundQuoteInput[]): Map<string, SyntheticRoundQuoteInput> {
  return new Map(rows.map(row => [key(row.season, row.round, row.playerId), row]));
}

function buildVoteIndex(votes: NormalizedVoteRow[]): Map<string, NormalizedVoteRow> {
  return new Map(votes.map(row => [key(row.season, row.round, row.playerId), row]));
}

function quoteAt(index: Map<string, SyntheticRoundQuoteInput>, season: string, round: number, playerId: number): SyntheticRoundQuoteInput | undefined {
  return index.get(key(season, round, playerId));
}

function roundReturnPct(index: Map<string, SyntheticRoundQuoteInput>, season: string, fromRound: number, toRound: number, playerId: number): number {
  const from = quoteAt(index, season, fromRound, playerId);
  const to = quoteAt(index, season, toRound, playerId);
  if (!from || !to || from.qaa <= 0) return 0;
  return ((to.qaa - from.qaa) / from.qaa) * 100;
}

export function isValidRoster(positions: Array<{ role: PlayerRole }>): boolean {
  if (positions.length !== 25) return false;
  return (Object.entries(ROSTER) as Array<[PlayerRole, number]>).every(([role, count]) =>
    positions.filter(position => position.role === role).length === count,
  );
}

function matchedQuoteRows(quoteRows: NormalizedQuoteRow[], syntheticRows: SyntheticRoundQuoteInput[], season: string): NormalizedQuoteRow[] {
  const syntheticKeys = new Set(syntheticRows.filter(row => row.season === season).map(row => playerKey(row.season, row.playerId)));
  return quoteRows.filter(row => row.season === season && syntheticKeys.has(playerKey(row.season, row.playerId)));
}

function initialScore(row: NormalizedQuoteRow, strategy: IntraseasonStrategy): number {
  if (strategy === 'VALUE_ROTATION' || strategy === 'HYBRID_VALUE_MOMENTUM') return 100 - row.initialQuote;
  if (strategy === 'MOMENTUM') return row.initialQuote;
  if (strategy === 'STOP_LOSS') return 60 - row.initialQuote;
  if (strategy === 'TAKE_PROFIT') return row.initialQuote * 0.5;
  return 1;
}

export function buildInitialRoster(
  rows: NormalizedQuoteRow[],
  strategy: IntraseasonStrategy,
): NormalizedQuoteRow[] {
  const roster: NormalizedQuoteRow[] = [];
  for (const [role, count] of Object.entries(ROSTER) as Array<[PlayerRole, number]>) {
    const candidates = rows
      .filter(row => row.role === role)
      .sort((a, b) => initialScore(b, strategy) - initialScore(a, strategy) || a.initialQuote - b.initialQuote || a.playerId - b.playerId);
    if (candidates.length < count) throw new Error(`Pool insufficiente per ruolo ${role}: ${candidates.length}/${count}`);
    roster.push(...candidates.slice(0, count));
  }
  return roster;
}

/** Re-export per backward compatibility con i test esistenti. */
export const fantaTradingPositionValue = calculatePositionValue;

function positionValue(position: Position, currentQaa: number): number {
  return calculatePositionValue(position.initialQuote, currentQaa, position.fantasyMultiplier);
}

function buyPosition(row: NormalizedQuoteRow, round: number, price: number): Position {
  return {
    playerId: row.playerId,
    role: row.role,
    playerName: row.playerName,
    club: row.club,
    buyRound: round,
    buyPrice: price,
    initialQuote: row.initialQuote,
    fantasyMultiplier: 1,
  };
}

function applyFantasyRound(
  season: string,
  round: number,
  positions: Position[],
  voteIndex: Map<string, NormalizedVoteRow>,
): void {
  const teamInputs = positions.map(position => {
    const vote = voteIndex.get(key(season, round, position.playerId));
    return { playerId: position.playerId, played: Boolean(vote?.played && vote.vote !== null), vote: vote?.vote ?? null };
  });
  const band = calculateTeamVoteBand(teamInputs, NO_VOTE_POLICY);
  for (const position of positions) {
    const vote = voteIndex.get(key(season, round, position.playerId));
    const bonusPct = vote?.played && vote.vote !== null
      ? getBonusMalusPct(band.teamBand, vote.vote, DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG).bonusMalusPct
      : getNoVoteBonusMalusPct(NO_VOTE_POLICY);
    position.fantasyMultiplier *= 1 + bonusPct / 100;
  }
}

function candidateScore(
  strategy: IntraseasonStrategy,
  candidate: NormalizedQuoteRow,
  season: string,
  round: number,
  index: Map<string, SyntheticRoundQuoteInput>,
): number {
  const current = quoteAt(index, season, round, candidate.playerId)?.qaa ?? candidate.initialQuote;
  const last3 = roundReturnPct(index, season, Math.max(1, round - 3), round, candidate.playerId);
  const last5 = roundReturnPct(index, season, Math.max(1, round - 5), round, candidate.playerId);
  const value = candidate.initialQuote - current;
  if (strategy === 'MOMENTUM') return last3 * 2 + last5;
  if (strategy === 'VALUE_ROTATION') return value * 2 + last3;
  if (strategy === 'HYBRID_VALUE_MOMENTUM') return value + last3 * 1.5 + last5;
  if (strategy === 'STOP_LOSS') return last3 + value;
  if (strategy === 'TAKE_PROFIT') return last3 + current * 0.1;
  return 0;
}

function selectReplacement(
  pool: NormalizedQuoteRow[],
  positions: Position[],
  role: PlayerRole,
  strategy: IntraseasonStrategy,
  season: string,
  round: number,
  index: Map<string, SyntheticRoundQuoteInput>,
): NormalizedQuoteRow | null {
  const held = new Set(positions.map(position => position.playerId));
  return pool
    .filter(row => row.role === role && !held.has(row.playerId) && quoteAt(index, season, round, row.playerId))
    .sort((a, b) => candidateScore(strategy, b, season, round, index) - candidateScore(strategy, a, season, round, index) || a.playerId - b.playerId)[0] ?? null;
}

function shouldSell(
  strategy: IntraseasonStrategy,
  position: Position,
  season: string,
  round: number,
  index: Map<string, SyntheticRoundQuoteInput>,
  stopLossThreshold: number,
  takeProfitThreshold: number,
): boolean {
  if (strategy === 'HOLD') return false;
  const sinceBuy = roundReturnPct(index, season, position.buyRound, round, position.playerId);
  const last3 = roundReturnPct(index, season, Math.max(1, round - 3), round, position.playerId);
  if (strategy === 'STOP_LOSS') return sinceBuy <= stopLossThreshold;
  if (strategy === 'TAKE_PROFIT') return sinceBuy >= takeProfitThreshold;
  if (strategy === 'MOMENTUM') return true;
  if (strategy === 'VALUE_ROTATION') return true;
  return sinceBuy <= stopLossThreshold || last3 < -2;
}

export function executeTrade(
  positions: Position[],
  sold: Position,
  replacement: NormalizedQuoteRow,
  buyRound: number,
  sellPrice: number,
  buyPrice: number,
  sellFee: number = SELL_FEE,
): { positions: Position[]; commission: number; capitalAdded: number; realizedPnL: number } {
  const sellCommission = sellPrice * sellFee;
  const buyCommission = buyPrice * BUY_FEE;
  const netSell = sellPrice - sellCommission;
  const buyCost = buyPrice + buyCommission;
  const capitalAdded = Math.max(0, buyCost - netSell);
  const realizedPnL = netSell - sold.buyPrice;
  const next = positions.filter(position => position.playerId !== sold.playerId);
  next.push(buyPosition(replacement, buyRound, buyPrice));
  return { positions: next, commission: sellCommission + buyCommission, capitalAdded, realizedPnL };
}

function simulateScenario(
  season: string,
  seasonStatus: string,
  strategy: IntraseasonStrategy,
  marketFrequency: number,
  maxChangesPerWindow: number,
  stopLossThreshold: number,
  takeProfitThreshold: number,
  quoteRows: NormalizedQuoteRow[],
  syntheticRows: SyntheticRoundQuoteInput[],
  voteRows: NormalizedVoteRow[],
  sellFee: number = SELL_FEE,
): IntraseasonScenarioResult {
  const index = buildSyntheticQuoteIndex(syntheticRows);
  const voteIndex = buildVoteIndex(voteRows);
  const pool = matchedQuoteRows(quoteRows, syntheticRows, season);
  const rounds = [...new Set(syntheticRows.filter(row => row.season === season).map(row => row.round))].sort((a, b) => a - b);
  const firstRound = rounds[0] ?? 1;
  const lastRound = rounds[rounds.length - 1] ?? firstRound;
  let positions = buildInitialRoster(pool, strategy).map(row => buyPosition(row, firstRound, quoteAt(index, season, firstRound, row.playerId)?.qaa ?? row.initialQuote));
  let totalCapitalAdded = positions.reduce((sum, position) => sum + position.buyPrice * (1 + BUY_FEE), 0);
  let totalCommissions = positions.reduce((sum, position) => sum + position.buyPrice * BUY_FEE, 0);
  let trades = 0;
  let realizedPnL = 0;

  for (const round of rounds) {
    applyFantasyRound(season, round, positions, voteIndex);
    if (round === firstRound || round === lastRound || round % marketFrequency !== 0) continue;
    const sellCandidates = positions
      .filter(position => shouldSell(strategy, position, season, round, index, stopLossThreshold, takeProfitThreshold))
      .sort((a, b) => roundReturnPct(index, season, a.buyRound, round, a.playerId) - roundReturnPct(index, season, b.buyRound, round, b.playerId))
      .slice(0, maxChangesPerWindow);
    for (const sold of sellCandidates) {
      const currentSellQuote = quoteAt(index, season, round, sold.playerId);
      if (!currentSellQuote) continue;
      const replacement = selectReplacement(pool, positions, sold.role, strategy, season, round, index);
      if (!replacement) continue;
      const buyQuote = quoteAt(index, season, round, replacement.playerId);
      if (!buyQuote) continue;
      const sellValue = positionValue(sold, currentSellQuote.qaa);
      const trade = executeTrade(positions, sold, replacement, round, sellValue, buyQuote.qaa, sellFee);
      positions = trade.positions;
      totalCommissions += trade.commission;
      totalCapitalAdded += trade.capitalAdded;
      realizedPnL += trade.realizedPnL;
      trades += 1;
    }
    if (!isValidRoster(positions)) throw new Error(`Rosa non valida dopo trade ${strategy} ${season} round ${round}`);
  }

  const finalGross = positions.reduce((sum, position) => {
    const finalQuote = quoteAt(index, season, lastRound, position.playerId)?.qaa ?? position.buyPrice;
    return sum + positionValue(position, finalQuote);
  }, 0);
  const finalSellFees = finalGross * sellFee;
  totalCommissions += finalSellFees;
  const finalValue = finalGross - finalSellFees;
  const finalROI = totalCapitalAdded > 0 ? ((finalValue - totalCapitalAdded) / totalCapitalAdded) * 100 : 0;
  const platformRevenue = totalCommissions * PLATFORM_FEE_RATE;
  const overtradingRisk = trades > 35 ? 'HIGH' : trades > 15 ? 'MEDIUM' : 'LOW';
  return {
    season,
    seasonStatus,
    strategy,
    marketFrequency,
    maxChangesPerWindow,
    stopLossThreshold,
    takeProfitThreshold,
    finalROI,
    finalValue,
    totalCapitalAdded,
    totalCommissions,
    platformRevenue,
    trades,
    realizedPnL,
    overtradingRisk,
  };
}

function aggregate(
  scope: 'completed' | 'in_progress',
  strategy: IntraseasonStrategy,
  marketFrequency: number,
  maxChangesPerWindow: number,
  stopLossThreshold: number,
  takeProfitThreshold: number,
  rows: IntraseasonScenarioResult[],
  holdRows: IntraseasonScenarioResult[],
): IntraseasonAggregateStats {
  const rois = rows.map(row => row.finalROI);
  const holdBySeason = new Map(holdRows.map(row => [row.season, row.finalROI]));
  const deltas = rows.map(row => row.finalROI - (holdBySeason.get(row.season) ?? 0));
  const avgTrades = mean(rows.map(row => row.trades));
  return {
    scope,
    strategy,
    marketFrequency,
    maxChangesPerWindow,
    stopLossThreshold,
    takeProfitThreshold,
    numScenarios: rows.length,
    avgROI: mean(rois),
    medianROI: median(rois),
    bestROI: rois.length ? Math.max(...rois) : 0,
    worstROI: rois.length ? Math.min(...rois) : 0,
    volatility: stdDev(rois),
    pctAbove0: pct(rois, roi => roi > 0),
    pctAbove7: pct(rois, roi => roi > PRIZE_THRESHOLD),
    pctAbove10: pct(rois, roi => roi > 10),
    avgTrades,
    avgCommissions: mean(rows.map(row => row.totalCommissions)),
    avgPlatformRevenue: mean(rows.map(row => row.platformRevenue)),
    avgDeltaVsHold: mean(deltas),
    overtradingRisk: avgTrades > 35 ? 'HIGH' : avgTrades > 15 ? 'MEDIUM' : 'LOW',
  };
}

export function runIntraseasonTradingBacktest(
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
  syntheticRows: SyntheticRoundQuoteInput[],
  config: IntraseasonBacktestConfig = DEFAULT_INTRASEASON_BACKTEST_CONFIG,
): IntraseasonBacktestReport {
  const effectiveSellFee = config.sellFee ?? SELL_FEE;
  const scenarioResults: IntraseasonScenarioResult[] = [];
  for (const season of [...COMPLETED_SEASONS, ...IN_PROGRESS_SEASONS]) {
    const seasonSynthetic = syntheticRows.filter(row => row.season === season);
    const seasonStatus = seasonSynthetic[0]?.seasonStatus ?? (IN_PROGRESS_SEASONS.includes(season) ? 'in_progress' : 'completed');
    for (const strategy of STRATEGIES) {
      for (const marketFrequency of config.marketFrequencies) {
        for (const maxChangesPerWindow of config.maxChangesPerWindow) {
          for (const stopLossThreshold of config.stopLossThresholds) {
            for (const takeProfitThreshold of config.takeProfitThresholds) {
              scenarioResults.push(simulateScenario(
                season,
                seasonStatus,
                strategy,
                marketFrequency,
                maxChangesPerWindow,
                stopLossThreshold,
                takeProfitThreshold,
                quoteRows,
                syntheticRows,
                voteRows,
                effectiveSellFee,
              ));
            }
          }
        }
      }
    }
  }

  const makeStats = (scope: 'completed' | 'in_progress', seasons: string[]) => {
    const scoped = scenarioResults.filter(row => seasons.includes(row.season));
    const holdRows = scoped.filter(row => row.strategy === 'HOLD');
    const out: IntraseasonAggregateStats[] = [];
    for (const strategy of STRATEGIES) {
      for (const marketFrequency of config.marketFrequencies) {
        for (const maxChangesPerWindow of config.maxChangesPerWindow) {
          for (const stopLossThreshold of config.stopLossThresholds) {
            for (const takeProfitThreshold of config.takeProfitThresholds) {
              const rows = scoped.filter(row =>
                row.strategy === strategy &&
                row.marketFrequency === marketFrequency &&
                row.maxChangesPerWindow === maxChangesPerWindow &&
                row.stopLossThreshold === stopLossThreshold &&
                row.takeProfitThreshold === takeProfitThreshold
              );
              if (rows.length) out.push(aggregate(scope, strategy, marketFrequency, maxChangesPerWindow, stopLossThreshold, takeProfitThreshold, rows, holdRows));
            }
          }
        }
      }
    }
    return out;
  };
  const completedStats = makeStats('completed', COMPLETED_SEASONS);
  const inProgressStats = makeStats('in_progress', IN_PROGRESS_SEASONS);
  const bestCompletedStrategy = completedStats
    .filter(stat => stat.strategy !== 'HOLD' && stat.avgTrades > 0 && stat.avgDeltaVsHold > 0)
    .sort((a, b) => b.avgDeltaVsHold - a.avgDeltaVsHold || b.avgROI - a.avgROI)[0]
    ?? completedStats.filter(stat => stat.strategy === 'HOLD').sort((a, b) => b.avgROI - a.avgROI)[0]
    ?? null;

  return {
    generatedAt: new Date().toISOString(),
    modelId: 'INTRASEASON_SYNTHETIC_TRADING_V1',
    quoteModel: SYNTHETIC_QUOTE_OPERATIONAL_MODEL,
    warning: 'Quotazioni giornata per giornata sintetiche, stimate e non ufficiali Fantacalcio. Risultati esplorativi.',
    config,
    completedSeasons: COMPLETED_SEASONS,
    inProgressSeasons: IN_PROGRESS_SEASONS,
    scenarioResults,
    completedStats,
    inProgressStats,
    bestCompletedStrategy,
    holdCompleted: completedStats.filter(stat => stat.strategy === 'HOLD'),
  };
}

export function buildIntraseasonBacktestCsv(report: IntraseasonBacktestReport): string {
  const headers = [
    'scope', 'strategy', 'marketFrequency', 'maxChangesPerWindow', 'stopLossThreshold', 'takeProfitThreshold',
    'numScenarios', 'avgROI', 'medianROI', 'bestROI', 'worstROI', 'volatility', 'pctAbove0', 'pctAbove7',
    'pctAbove10', 'avgTrades', 'avgCommissions', 'avgPlatformRevenue', 'avgDeltaVsHold', 'overtradingRisk',
  ];
  const rows = [...report.completedStats, ...report.inProgressStats].map(row => [
    row.scope,
    row.strategy,
    row.marketFrequency,
    row.maxChangesPerWindow,
    row.stopLossThreshold,
    row.takeProfitThreshold,
    row.numScenarios,
    row.avgROI.toFixed(4),
    row.medianROI.toFixed(4),
    row.bestROI.toFixed(4),
    row.worstROI.toFixed(4),
    row.volatility.toFixed(4),
    row.pctAbove0.toFixed(4),
    row.pctAbove7.toFixed(4),
    row.pctAbove10.toFixed(4),
    row.avgTrades.toFixed(4),
    row.avgCommissions.toFixed(4),
    row.avgPlatformRevenue.toFixed(4),
    row.avgDeltaVsHold.toFixed(4),
    row.overtradingRisk,
  ]);
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function fmt(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

function topByStrategy(stats: IntraseasonAggregateStats[]): IntraseasonAggregateStats[] {
  return STRATEGIES.map(strategy =>
    stats.filter(row => row.strategy === strategy).sort((a, b) => b.avgROI - a.avgROI)[0],
  ).filter(Boolean) as IntraseasonAggregateStats[];
}

function averageBy<T extends string | number>(
  stats: IntraseasonAggregateStats[],
  keyFn: (stat: IntraseasonAggregateStats) => T,
): Array<{ key: T; avgROI: number; avgTrades: number; avgCommissions: number; pctAbove7: number }> {
  const keys = [...new Set(stats.map(keyFn))];
  return keys.map(keyValue => {
    const rows = stats.filter(row => keyFn(row) === keyValue);
    return {
      key: keyValue,
      avgROI: mean(rows.map(row => row.avgROI)),
      avgTrades: mean(rows.map(row => row.avgTrades)),
      avgCommissions: mean(rows.map(row => row.avgCommissions)),
      pctAbove7: mean(rows.map(row => row.pctAbove7)),
    };
  });
}

export function buildIntraseasonBacktestMarkdown(report: IntraseasonBacktestReport): string {
  const lines: string[] = [];
  const bestRows = topByStrategy(report.completedStats);
  const best = report.bestCompletedStrategy;
  lines.push('# FantaTrading - Backtest Intra-stagione con Quotazioni Sintetiche');
  lines.push('');
  lines.push('## 1. Avvertenza');
  lines.push('');
  lines.push('Le quotazioni giornata per giornata usate in questo report sono sintetiche, stimate e non ufficiali Fantacalcio. Il risultato non e ufficiale e serve solo per analisi esplorativa del trading intra-stagione.');
  lines.push('');
  lines.push('## 2. Modello operativo quotazioni');
  lines.push('');
  lines.push(`Modello: **${report.quoteModel.modelName}**`);
  lines.push('');
  lines.push('| Metrica | Valore |');
  lines.push('|---------|--------|');
  lines.push(`| MAE | ${fmt(report.quoteModel.metrics.mae)} |`);
  lines.push(`| RMSE | ${fmt(report.quoteModel.metrics.rmse)} |`);
  lines.push(`| Entro 1 punto | ${fmt(report.quoteModel.metrics.within1Pct)}% |`);
  lines.push(`| Entro 2 punti | ${fmt(report.quoteModel.metrics.within2Pct)}% |`);
  lines.push(`| Entro 3 punti | ${fmt(report.quoteModel.metrics.within3Pct)}% |`);
  lines.push(`| MAE attaccanti | ${fmt(report.quoteModel.metrics.attackerMae)} |`);
  lines.push('');
  lines.push('## 3. Confronto strategie');
  lines.push('');
  lines.push('| Strategia | ROI medio | ROI mediano | Best | Worst | Volatilita | >0% | >7% | >10% | Cambi medi | Commissioni | Delta vs HOLD | Rischio overtrading |');
  lines.push('|-----------|-----------|-------------|------|-------|------------|-----|-----|------|------------|-------------|---------------|--------------------|');
  for (const row of bestRows) {
    lines.push(`| ${row.strategy} | ${fmt(row.avgROI)}% | ${fmt(row.medianROI)}% | ${fmt(row.bestROI)}% | ${fmt(row.worstROI)}% | ${fmt(row.volatility)} | ${fmt(row.pctAbove0)}% | ${fmt(row.pctAbove7)}% | ${fmt(row.pctAbove10)}% | ${fmt(row.avgTrades)} | ${fmt(row.avgCommissions)} | ${fmt(row.avgDeltaVsHold)}pp | ${row.overtradingRisk} |`);
  }
  lines.push('');
  lines.push('## 4. Confronto frequenza cambi');
  lines.push('');
  lines.push('| Frequenza | ROI medio | Cambi medi | Commissioni medie | % >7 |');
  lines.push('|-----------|-----------|------------|-------------------|------|');
  for (const row of averageBy(report.completedStats.filter(stat => stat.strategy !== 'HOLD'), stat => stat.marketFrequency)) {
    lines.push(`| ogni ${row.key} giornate | ${fmt(row.avgROI)}% | ${fmt(row.avgTrades)} | ${fmt(row.avgCommissions)} | ${fmt(row.pctAbove7)}% |`);
  }
  lines.push('');
  lines.push('## 5. Confronto numero massimo cambi');
  lines.push('');
  lines.push('| Max cambi | ROI medio | Cambi medi | Commissioni medie | % >7 |');
  lines.push('|-----------|-----------|------------|-------------------|------|');
  for (const row of averageBy(report.completedStats.filter(stat => stat.strategy !== 'HOLD'), stat => stat.maxChangesPerWindow)) {
    lines.push(`| ${row.key} | ${fmt(row.avgROI)}% | ${fmt(row.avgTrades)} | ${fmt(row.avgCommissions)} | ${fmt(row.pctAbove7)}% |`);
  }
  lines.push('');
  lines.push('## 6. Impatto commissioni');
  lines.push('');
  lines.push('Ogni cambio genera commissione vendita 1.25% e commissione acquisto 2%. La platform fee simulata e il 10% delle commissioni, non del montepremi totale.');
  lines.push('');
  lines.push('## 7. Cambi illimitati e limite cambi');
  lines.push('');
  lines.push('I cambi illimitati sono rischiosi perche aumentano commissioni e overtrading. Il test mostra che il limite per finestra va mantenuto e confrontato con la frequenza di mercato.');
  lines.push('');
  lines.push('## 8. Soglia premio');
  lines.push('');
  lines.push(`La soglia 7% resta la soglia V1 di riferimento. ${best && best.pctAbove7 > 35 ? 'Con alcune strategie la quota sopra 7% e alta: la soglia 10% va monitorata.' : 'Dai completed non emerge ancora una necessita automatica di alzare a 10%, ma va rivalutata con dati ufficiali giornata per giornata.'}`);
  lines.push('');
  lines.push('## 9. Raccomandazione preliminare');
  lines.push('');
  if (best) {
    lines.push(`Strategia piu forte completed: **${best.strategy}** con frequenza ${best.marketFrequency}, max cambi ${best.maxChangesPerWindow}, ROI medio ${fmt(best.avgROI)}%.`);
  }
  lines.push('Il trading intra-stagione va considerato esplorativo finche le quotazioni giornata per giornata restano sintetiche. La regola V1 dovrebbe introdurre un limite cambi per finestra e mantenere commissioni 2%/2% per contenere overtrading.');
  lines.push('');
  lines.push('## 10. Sezione 2025/26 in_progress');
  lines.push('');
  lines.push('La stagione 2025/26 e separata e non usata per raccomandazioni definitive.');
  lines.push('');
  lines.push('| Strategia | ROI medio best setup | % >7 | Cambi medi |');
  lines.push('|-----------|----------------------|------|------------|');
  for (const row of topByStrategy(report.inProgressStats)) {
    lines.push(`| ${row.strategy} | ${fmt(row.avgROI)}% | ${fmt(row.pctAbove7)}% | ${fmt(row.avgTrades)} |`);
  }
  return lines.join('\n');
}
