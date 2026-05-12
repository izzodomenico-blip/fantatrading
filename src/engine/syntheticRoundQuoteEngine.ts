import { NormalizedQuoteRow, PlayerRole } from '../importers/realQuotesImporter';
import { NormalizedVoteRow } from '../importers/realVotesImporter';
import { clamp } from '../utils/mathUtils';

export interface SyntheticQuoteParams {
  lastPerformanceWeight: number;
  fantasyAverageWeight: number;
  presenceWeight: number;
  adjustmentRate: number;
  expectedStrength: number;
  absencePenalty: number;
  roleOverrides?: Partial<Record<PlayerRole, Partial<SyntheticQuoteParams>>>;
  quoteBandOverrides?: Partial<Record<QuoteBand, Partial<SyntheticQuoteParams>>>;
  offensiveBonusWeight?: number;
  recentOffensiveBonusWeight?: number;
  recentOffensiveBonusLast5Weight?: number;
  recentOffensiveBonusLast10Weight?: number;
  drySpellPenalty?: number;
  lowCostBreakoutWeight?: number;
  maxDailyMove?: number;
  freezeUpgradeIfNoPlay?: boolean;
  expectedCurve?: Partial<Record<PlayerRole, { base: number; slope: number; min: number; max: number }>>;
}

export type QuoteBand = '1-5' | '6-10' | '11-20' | '21-35' | '36+';

export interface OffensiveMetrics {
  goals: number;
  assists: number;
  usefulAppearances: number;
  goalRate: number;
  assistRate: number;
  offensiveBonusRate: number;
  recentGoalsLast5: number;
  recentAssistsLast5: number;
  recentGoalsLast10: number;
  recentAssistsLast10: number;
  recentOffensiveBonusLast5: number;
  recentOffensiveBonusLast10: number;
  drySpell: number;
}

export interface SyntheticRoundQuoteRow {
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
  qaaBeforeParachute: number;
  parachuteMinQaa: number;
  played: boolean;
  vote: number | null;
  fantasyVote: number | null;
  usefulAppearances: number;
  roundsProcessed: number;
  presenceRateSeason: number;
  presenceRateLast10: number;
  bestPresenceRate: number;
  expectedFantasyAverage: number;
  lastPerformanceDelta: number;
  seasonComponentDelta: number;
  absenceDelta: number;
  totalQaDelta: number;
  goalRate: number;
  assistRate: number;
  offensiveBonusRate: number;
  recentOffensiveBonusLast5: number;
  recentOffensiveBonusLast10: number;
  drySpell: number;
  offensiveBonusDelta: number;
  recentOffensiveBonusDelta: number;
  drySpellDelta: number;
}

export interface SyntheticPlayerFinal {
  season: string;
  seasonStatus: string;
  playerId: number;
  playerName: string;
  club: string;
  role: PlayerRole;
  initialQuote: number;
  realCurrentOrFinalQuote: number;
  finalQa: number;
  finalQaa: number;
  error: number;
  signedError: number;
  rounds: number;
  usefulAppearances: number;
  presenceRateSeason: number;
  presenceRateLast10: number;
}

export interface SyntheticSeasonResult {
  rows: SyntheticRoundQuoteRow[];
  finals: SyntheticPlayerFinal[];
}

function playerKey(season: string, playerId: number | string): string {
  return `${season}|${playerId}`;
}

function seasonRoundPlayerKey(season: string, round: number, playerId: number | string): string {
  return `${season}|${round}|${playerId}`;
}

export function getQuoteBand(initialQuote: number): QuoteBand {
  if (initialQuote <= 5) return '1-5';
  if (initialQuote <= 10) return '6-10';
  if (initialQuote <= 20) return '11-20';
  if (initialQuote <= 35) return '21-35';
  return '36+';
}

export function resolveSyntheticQuoteParams(
  params: SyntheticQuoteParams,
  role: PlayerRole,
  initialQuote: number,
): SyntheticQuoteParams {
  const quoteBand = getQuoteBand(initialQuote);
  const roleOverride = params.roleOverrides?.[role] ?? {};
  const quoteBandOverride = params.quoteBandOverrides?.[quoteBand] ?? {};
  return { ...params, ...roleOverride, ...quoteBandOverride, roleOverrides: params.roleOverrides, quoteBandOverrides: params.quoteBandOverrides };
}

export function roundQaToQaa(qa: number): number {
  if (!Number.isFinite(qa)) return 1;
  const integer = Math.floor(qa);
  const decimal = qa - integer;
  return decimal <= 0.5 ? integer : integer + 1;
}

export function getParachuteMinQaa(role: PlayerRole, initialQuote: number): number {
  const thresholds: Record<PlayerRole, number> = { P: 14, D: 12, C: 16, A: 24 };
  if (initialQuote < thresholds[role]) return 0;
  return initialQuote % 2 === 0 ? initialQuote / 2 : (initialQuote - 1) / 2;
}

export function applyPublicQuoteLimits(qaa: number, role: PlayerRole, initialQuote: number): number {
  const withParachute = Math.max(qaa, getParachuteMinQaa(role, initialQuote));
  return clamp(withParachute, 1, 60);
}

export function qaToPublicQuote(qa: number, role: PlayerRole, initialQuote: number): number {
  return applyPublicQuoteLimits(roundQaToQaa(qa), role, initialQuote);
}

export function expectedFantasyAverageByQuote(
  role: PlayerRole,
  currentQuote: number,
  params?: Pick<SyntheticQuoteParams, 'expectedCurve'>,
): number {
  const defaultCurve: Record<PlayerRole, { base: number; slope: number; min: number; max: number }> = {
    P: { base: 5.62, slope: 0.046, min: 5.45, max: 7.45 },
    D: { base: 5.66, slope: 0.044, min: 5.45, max: 7.45 },
    C: { base: 5.72, slope: 0.039, min: 5.45, max: 7.45 },
    A: { base: 5.78, slope: 0.034, min: 5.45, max: 7.45 },
  };
  const curve = params?.expectedCurve?.[role] ?? defaultCurve[role];
  return clamp(curve.base + curve.slope * currentQuote, curve.min, curve.max);
}

export function computePresenceRates(history: boolean[]): { season: number; last10: number; best: number } {
  if (history.length === 0) return { season: 0, last10: 0, best: 0 };
  const season = history.filter(Boolean).length / history.length;
  const lastWindow = history.slice(-10);
  const last10 = lastWindow.filter(Boolean).length / lastWindow.length;
  return { season, last10, best: Math.max(season, last10) };
}

function effectiveExpected(role: PlayerRole, qa: number, params: SyntheticQuoteParams): number {
  const expected = expectedFantasyAverageByQuote(role, qa, params);
  const expectedStrength = params.expectedStrength;
  return 6 + (expected - 6) * expectedStrength;
}

function fantasyValue(vote: NormalizedVoteRow | undefined): number | null {
  if (!vote || !vote.played) return null;
  return vote.fantasyVote ?? vote.vote;
}

function buildVoteIndex(voteRows: NormalizedVoteRow[]): Map<string, NormalizedVoteRow> {
  const index = new Map<string, NormalizedVoteRow>();
  for (const row of voteRows) {
    index.set(seasonRoundPlayerKey(row.season, row.round, row.playerId), row);
  }
  return index;
}

export function calculateOffensiveMetrics(votes: NormalizedVoteRow[]): OffensiveMetrics {
  const playedVotes = votes.filter(row => row.played);
  const usefulAppearances = playedVotes.length;
  const goals = playedVotes.reduce((sum, row) => sum + row.goals, 0);
  const assists = playedVotes.reduce((sum, row) => sum + row.assists, 0);
  const last5 = playedVotes.slice(-5);
  const last10 = playedVotes.slice(-10);
  const recentGoalsLast5 = last5.reduce((sum, row) => sum + row.goals, 0);
  const recentAssistsLast5 = last5.reduce((sum, row) => sum + row.assists, 0);
  const recentGoalsLast10 = last10.reduce((sum, row) => sum + row.goals, 0);
  const recentAssistsLast10 = last10.reduce((sum, row) => sum + row.assists, 0);
  let drySpell = 0;
  for (let i = playedVotes.length - 1; i >= 0; i--) {
    if (playedVotes[i].goals + playedVotes[i].assists > 0) break;
    drySpell++;
  }
  return {
    goals,
    assists,
    usefulAppearances,
    goalRate: usefulAppearances ? goals / usefulAppearances : 0,
    assistRate: usefulAppearances ? assists / usefulAppearances : 0,
    offensiveBonusRate: usefulAppearances ? (goals + assists * 0.55) / usefulAppearances : 0,
    recentGoalsLast5,
    recentAssistsLast5,
    recentGoalsLast10,
    recentAssistsLast10,
    recentOffensiveBonusLast5: recentGoalsLast5 + recentAssistsLast5 * 0.55,
    recentOffensiveBonusLast10: recentGoalsLast10 + recentAssistsLast10 * 0.55,
    drySpell,
  };
}

export function runSyntheticRoundQuoteModel(
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
  params: SyntheticQuoteParams,
  seasons?: string[],
): SyntheticSeasonResult {
  const selectedSeasons = seasons ?? [...new Set(voteRows.map(row => row.season))].sort();
  const voteIndex = buildVoteIndex(voteRows);
  const quoteByPlayer = new Map(quoteRows.map(row => [playerKey(row.season, row.playerId), row]));
  const votePlayerKeys = new Set(voteRows.map(row => playerKey(row.season, row.playerId)));
  const rows: SyntheticRoundQuoteRow[] = [];
  const finals: SyntheticPlayerFinal[] = [];

  for (const season of selectedSeasons) {
    const seasonVotes = voteRows.filter(row => row.season === season);
    const rounds = [...new Set(seasonVotes.map(row => row.round))].sort((a, b) => a - b);
    const seasonQuotes = quoteRows
      .filter(row => row.season === season && votePlayerKeys.has(playerKey(row.season, row.playerId)))
      .sort((a, b) => a.playerId - b.playerId);

    for (const quote of seasonQuotes) {
      if (!quoteByPlayer.has(playerKey(quote.season, quote.playerId))) continue;
      let qa = quote.initialQuote;
      let usefulAppearances = 0;
      let fantasySum = 0;
      const presenceHistory: boolean[] = [];
      const playerVoteHistory: NormalizedVoteRow[] = [];
      let lastPresenceRates = { season: 0, last10: 0, best: 0 };

      for (const round of rounds) {
        const vote = voteIndex.get(seasonRoundPlayerKey(season, round, quote.playerId));
        const played = Boolean(vote?.played && fantasyValue(vote) !== null);
        const fv = fantasyValue(vote);
        presenceHistory.push(played);
        if (vote) playerVoteHistory.push(vote);
        if (played && fv !== null) {
          usefulAppearances += 1;
          fantasySum += fv;
        }

        lastPresenceRates = computePresenceRates(presenceHistory);
        const effectiveParams = resolveSyntheticQuoteParams(params, quote.role, quote.initialQuote);
        const expected = effectiveExpected(quote.role, qa, effectiveParams);
        const lastPerformanceDelta = played && fv !== null
          ? (fv - expected) * effectiveParams.lastPerformanceWeight
          : 0;
        const absenceDelta = played ? 0 : effectiveParams.absencePenalty;
        const fantasyAverage = usefulAppearances > 0 ? fantasySum / usefulAppearances : expected;
        const rawSeasonComponent = usefulAppearances >= 5
          ? ((fantasyAverage - expected) * effectiveParams.fantasyAverageWeight) +
            ((lastPresenceRates.best - 0.65) * effectiveParams.presenceWeight)
          : 0;
        const freezeUpgradeIfNoPlay = effectiveParams.freezeUpgradeIfNoPlay ?? true;
        const seasonComponentDelta = freezeUpgradeIfNoPlay && !played && rawSeasonComponent > 0 ? 0 : rawSeasonComponent;
        const offensiveMetrics = calculateOffensiveMetrics(playerVoteHistory);
        const offensiveBonusWeight = effectiveParams.offensiveBonusWeight ?? 0;
        const recentOffensiveBonusWeight = effectiveParams.recentOffensiveBonusWeight ?? 0;
        const drySpellPenalty = effectiveParams.drySpellPenalty ?? 0;
        const lowCostBreakoutWeight = effectiveParams.lowCostBreakoutWeight ?? 0;
        const recentBonusSignal = offensiveMetrics.recentOffensiveBonusLast5 * 0.65 + offensiveMetrics.recentOffensiveBonusLast10 * 0.35;
        const offensiveBonusDelta = played ? offensiveMetrics.offensiveBonusRate * offensiveBonusWeight : 0;
        const recentOffensiveBonusDelta = played
          ? recentBonusSignal * recentOffensiveBonusWeight +
            offensiveMetrics.recentOffensiveBonusLast5 * (effectiveParams.recentOffensiveBonusLast5Weight ?? 0) +
            offensiveMetrics.recentOffensiveBonusLast10 * (effectiveParams.recentOffensiveBonusLast10Weight ?? 0) +
            (quote.initialQuote <= 10 ? recentBonusSignal * lowCostBreakoutWeight : 0)
          : 0;
        const drySpellDelta = quote.role === 'A' && quote.initialQuote >= 21
          ? -Math.min(1, offensiveMetrics.drySpell / 8) * drySpellPenalty
          : 0;
        const rawTotalQaDelta = effectiveParams.adjustmentRate * (
          lastPerformanceDelta +
          seasonComponentDelta +
          absenceDelta +
          offensiveBonusDelta +
          recentOffensiveBonusDelta +
          drySpellDelta
        );
        const totalQaDelta = effectiveParams.maxDailyMove === undefined
          ? rawTotalQaDelta
          : clamp(rawTotalQaDelta, -effectiveParams.maxDailyMove, effectiveParams.maxDailyMove);
        qa = clamp(qa + totalQaDelta, 0.01, 60);
        const qaaBeforeParachute = roundQaToQaa(qa);
        const qaa = applyPublicQuoteLimits(qaaBeforeParachute, quote.role, quote.initialQuote);

        rows.push({
          season,
          seasonStatus: quote.seasonStatus,
          round,
          playerId: quote.playerId,
          playerName: quote.playerName,
          club: quote.club,
          role: quote.role,
          initialQuote: quote.initialQuote,
          realCurrentOrFinalQuote: quote.currentOrFinalQuote,
          qa: +qa.toFixed(4),
          qaa,
          qaaBeforeParachute,
          parachuteMinQaa: getParachuteMinQaa(quote.role, quote.initialQuote),
          played,
          vote: vote?.vote ?? null,
          fantasyVote: vote?.fantasyVote ?? null,
          usefulAppearances,
          roundsProcessed: presenceHistory.length,
          presenceRateSeason: +lastPresenceRates.season.toFixed(4),
          presenceRateLast10: +lastPresenceRates.last10.toFixed(4),
          bestPresenceRate: +lastPresenceRates.best.toFixed(4),
          expectedFantasyAverage: +expected.toFixed(4),
          lastPerformanceDelta: +lastPerformanceDelta.toFixed(4),
          seasonComponentDelta: +seasonComponentDelta.toFixed(4),
          absenceDelta: +absenceDelta.toFixed(4),
          totalQaDelta: +totalQaDelta.toFixed(4),
          goalRate: +offensiveMetrics.goalRate.toFixed(4),
          assistRate: +offensiveMetrics.assistRate.toFixed(4),
          offensiveBonusRate: +offensiveMetrics.offensiveBonusRate.toFixed(4),
          recentOffensiveBonusLast5: +offensiveMetrics.recentOffensiveBonusLast5.toFixed(4),
          recentOffensiveBonusLast10: +offensiveMetrics.recentOffensiveBonusLast10.toFixed(4),
          drySpell: offensiveMetrics.drySpell,
          offensiveBonusDelta: +offensiveBonusDelta.toFixed(4),
          recentOffensiveBonusDelta: +recentOffensiveBonusDelta.toFixed(4),
          drySpellDelta: +drySpellDelta.toFixed(4),
        });
      }

      const finalQaa = qaToPublicQuote(qa, quote.role, quote.initialQuote);
      finals.push({
        season,
        seasonStatus: quote.seasonStatus,
        playerId: quote.playerId,
        playerName: quote.playerName,
        club: quote.club,
        role: quote.role,
        initialQuote: quote.initialQuote,
        realCurrentOrFinalQuote: quote.currentOrFinalQuote,
        finalQa: +qa.toFixed(4),
        finalQaa,
        error: Math.abs(finalQaa - quote.currentOrFinalQuote),
        signedError: finalQaa - quote.currentOrFinalQuote,
        rounds: rounds.length,
        usefulAppearances,
        presenceRateSeason: +lastPresenceRates.season.toFixed(4),
        presenceRateLast10: +lastPresenceRates.last10.toFixed(4),
      });
    }
  }

  return { rows, finals };
}

export const DEFAULT_SYNTHETIC_QUOTE_PARAMS: SyntheticQuoteParams = {
  lastPerformanceWeight: 0.34,
  fantasyAverageWeight: 0.28,
  presenceWeight: 0.45,
  adjustmentRate: 0.42,
  expectedStrength: 1,
  absencePenalty: -0.05,
};

export function makeSyntheticRoundQuoteCsv(rows: SyntheticRoundQuoteRow[]): string {
  const headers = [
    'season', 'seasonStatus', 'round', 'playerId', 'playerName', 'club', 'role',
    'initialQuote', 'realCurrentOrFinalQuote', 'qa', 'qaa', 'qaaBeforeParachute',
    'parachuteMinQaa', 'played', 'vote', 'fantasyVote', 'usefulAppearances',
    'roundsProcessed', 'presenceRateSeason', 'presenceRateLast10', 'bestPresenceRate',
    'expectedFantasyAverage', 'lastPerformanceDelta', 'seasonComponentDelta',
    'absenceDelta', 'totalQaDelta', 'goalRate', 'assistRate', 'offensiveBonusRate',
    'recentOffensiveBonusLast5', 'recentOffensiveBonusLast10', 'drySpell',
    'offensiveBonusDelta', 'recentOffensiveBonusDelta', 'drySpellDelta',
  ];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => escape(row[header as keyof SyntheticRoundQuoteRow])).join(',')),
  ].join('\n');
}
