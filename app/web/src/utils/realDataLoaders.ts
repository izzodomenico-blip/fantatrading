import type { DemoMarketPlayer, FavcRole } from '../mock/favcDemoData';
import type { RawSyntheticRoundQuote, RawVoteRow } from './playerTrend';

export type RealQuoteRow = {
  season: string;
  seasonStatus: string;
  playerId: number | string;
  role: string;
  roleExtended?: string;
  playerName: string;
  club: string;
  initialQuote: number;
  currentOrFinalQuote?: number;
  quoteDiff?: number;
  quoteRawReturnPct?: number;
  quoteTradingReturnPct?: number;
  fvm?: number;
};

export type RealVoteRow = {
  season: string;
  seasonStatus: string;
  round: number;
  playerId: number | string;
  playerName: string;
  club: string;
  role: string;
  vote: number | null;
  fantasyVote: number | null;
  minutesPlayed: number | null;
  played: boolean;
  starter: boolean | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  penaltiesMissed: number;
  ownGoals: number;
};

const quotesModules = import.meta.glob<{ rows: RealQuoteRow[] }>(
  '@data/real/processed/fantacalcio_quotes_history.json',
  { import: 'default' },
);

const votesModules = import.meta.glob<{ rows: RealVoteRow[] }>(
  '@data/real/processed/votes/fantacalcio_votes_history.json',
  { import: 'default' },
);

const syntheticModules = import.meta.glob<{ rows: RawSyntheticRoundQuote[] }>(
  '@data/real/processed/round-quotes/synthetic_round_quotes_history.json',
  { import: 'default' },
);

let cachedQuotes: RealQuoteRow[] | null = null;
let cachedVotes: RealVoteRow[] | null = null;
let cachedSynthetic: RawSyntheticRoundQuote[] | null = null;

export async function loadRealQuotes(season?: string): Promise<RealQuoteRow[]> {
  if (cachedQuotes === null) {
    const loaders = Object.values(quotesModules);
    if (loaders.length === 0) {
      cachedQuotes = [];
    } else {
      const report = await loaders[0]();
      cachedQuotes = report.rows ?? [];
    }
  }
  if (!season) return cachedQuotes;
  return cachedQuotes.filter(row => row.season === season);
}

export async function loadRealVotes(season?: string): Promise<RealVoteRow[]> {
  if (cachedVotes === null) {
    const loaders = Object.values(votesModules);
    if (loaders.length === 0) {
      cachedVotes = [];
    } else {
      const report = await loaders[0]();
      cachedVotes = report.rows ?? [];
    }
  }
  if (!season) return cachedVotes;
  return cachedVotes.filter(row => row.season === season);
}

export async function loadSyntheticRows(season?: string): Promise<RawSyntheticRoundQuote[]> {
  if (cachedSynthetic === null) {
    const loaders = Object.values(syntheticModules);
    if (loaders.length === 0) {
      cachedSynthetic = [];
    } else {
      const report = await loaders[0]();
      cachedSynthetic = report.rows ?? [];
    }
  }
  if (!season) return cachedSynthetic;
  return cachedSynthetic.filter(row => !row.season || row.season === season);
}

function mapFantacalcioRole(role: string): FavcRole {
  const normalized = role.toUpperCase();
  if (normalized === 'P' || normalized === 'GK') return 'P';
  if (normalized === 'D' || normalized === 'DEF') return 'D';
  if (normalized === 'C' || normalized === 'MID') return 'C';
  return 'A';
}

export function realQuoteToMarketPlayer(row: RealQuoteRow): DemoMarketPlayer {
  const id = String(row.playerId);
  const initialQuote = Number(row.initialQuote) || 1;
  const currentQuote = Number(row.currentOrFinalQuote ?? row.initialQuote) || initialQuote;
  const trendPct = Number(row.quoteTradingReturnPct ?? 0);
  return {
    id,
    playerId: id,
    playerName: row.playerName,
    realTeam: row.club,
    role: mapFantacalcioRole(row.role),
    quote: currentQuote,
    trendPct,
    performancePct: trendPct,
    available: true,
  };
}

export function realVoteToRawVote(row: RealVoteRow): RawVoteRow {
  return {
    round: row.round,
    playerId: row.playerId,
    playerName: row.playerName,
    club: row.club,
    role: row.role,
    season: row.season,
    vote: row.vote,
    fantasyVote: row.fantasyVote,
    played: row.played,
    goals: row.goals,
    assists: row.assists,
    yellowCards: row.yellowCards,
    redCards: row.redCards,
    ownGoals: row.ownGoals,
    penaltySaved: null,
    penaltyMissed: row.penaltiesMissed,
  };
}

export async function loadOfflineMarketAndVotes(season: string) {
  const [quotes, votes, synthetic] = await Promise.all([
    loadRealQuotes(season),
    loadRealVotes(season),
    loadSyntheticRows(season),
  ]);
  const marketPlayers = quotes.map(realQuoteToMarketPlayer);
  const voteRows = votes.map(realVoteToRawVote);
  const votesMaxRound = votes.length > 0
    ? Math.max(...votes.map(row => Number(row.round)).filter(Number.isFinite))
    : 0;
  return { marketPlayers, voteRows, syntheticRows: synthetic, votesMaxRound };
}
