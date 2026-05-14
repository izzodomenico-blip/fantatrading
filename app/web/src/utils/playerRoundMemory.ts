import {
  calculateEstimatedPositionValue,
  calculateFantaTradingReturnPct,
  type PlayerTrendPoint,
  type RawSyntheticRoundQuote,
  type RawVoteRow,
} from './playerTrend';

export type { RawSyntheticRoundQuote, RawVoteRow } from './playerTrend';

export type SourceQuote = 'official' | 'synthetic' | 'mock';
export type SourceVote = 'official' | 'missing';

export type ReplayPlayerInput = {
  playerId: string;
  backendPlayerId?: string;
  externalId?: string | null;
  playerName: string;
  role: string;
  club: string;
  season: string;
  initialQuote: number;
  currentQuote: number;
  fantasyMultiplier?: number;
};

export type PlayerRoundPoint = PlayerTrendPoint & {
  fantasyVote?: number | null;
  played: boolean;
  isSv: boolean;
  goals?: number | null;
  assists?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  ownGoals?: number | null;
  penaltySaved?: number | null;
  penaltyMissed?: number | null;
  sourceQuote: SourceQuote;
  sourceVote: SourceVote;
};

export type PlayerRoundMemory = {
  playerId: string;
  backendPlayerId?: string;
  externalId?: string | null;
  playerName: string;
  role: string;
  club: string;
  season: string;
  initialQuote: number;
  rounds: PlayerRoundPoint[];
};

export function applyNoVotePolicy(vote?: number | null, played?: boolean) {
  return !(played === true && typeof vote === 'number' && Number.isFinite(vote));
}

export function buildPlayerRoundMemory(
  players: ReplayPlayerInput[],
  votes: RawVoteRow[],
  syntheticRows: RawSyntheticRoundQuote[],
  options: {
    season: string;
    maxRound: number;
  },
) {
  return new Map(players.map(player => [
    player.playerId,
    buildSinglePlayerRoundMemory(player, votes, syntheticRows, options),
  ]));
}

export function buildSinglePlayerRoundMemory(
  player: ReplayPlayerInput,
  votes: RawVoteRow[],
  syntheticRows: RawSyntheticRoundQuote[],
  options: {
    season: string;
    maxRound: number;
  },
): PlayerRoundMemory {
  const playerKeys = [player.playerId, player.backendPlayerId, player.externalId]
    .filter((value): value is string => Boolean(value))
    .map(String);
  const quoteRows = syntheticRows
    .filter(row => row.season === options.season || !row.season)
    .filter(row =>
      playerKeys.includes(String(row.playerId)) ||
      row.playerName.toLowerCase() === player.playerName.toLowerCase(),
    )
    .sort((a, b) => a.round - b.round);
  const voteRows = votes.filter(row => playerKeys.includes(String(row.playerId)));
  let previousQuote = player.initialQuote;

  const rounds = Array.from({ length: options.maxRound }, (_, index): PlayerRoundPoint => {
    const round = index + 1;
    const quoteRow = quoteRows.find(row => row.round === round);
    const fallbackQuote = interpolateQuote(player.initialQuote, player.currentQuote, round, options.maxRound);
    const quote = Number((quoteRow?.qaa ?? quoteRow?.qa ?? fallbackQuote).toFixed(2));
    const quoteChange = round === 1 ? Number((quote - player.initialQuote).toFixed(2)) : Number((quote - previousQuote).toFixed(2));
    previousQuote = quote;

    const voteRow = voteRows.find(row => row.round === round);
    const vote = typeof voteRow?.vote === 'number' ? voteRow.vote : null;
    const fantasyVote = typeof voteRow?.fantasyVote === 'number' ? voteRow.fantasyVote : null;
    const played = voteRow?.played === true || typeof vote === 'number';
    const isSv = applyNoVotePolicy(vote, played);
    const fantasyBonusPct = isSv || fantasyVote === null || vote === null
      ? 0
      : Number(((fantasyVote - vote) * 2).toFixed(2));
    const quoteReturnPct = calculateFantaTradingReturnPct(player.initialQuote, quote);
    const quoteOnlyValue = calculateEstimatedPositionValue(player.initialQuote, quote, player.fantasyMultiplier ?? 1);
    const estimatedValue = Number((quoteOnlyValue * (1 + fantasyBonusPct / 100)).toFixed(2));

    return {
      round,
      quote,
      quoteChange,
      fantaTradingReturnPct: quoteReturnPct,
      vote,
      fantasyVote,
      played,
      isSv,
      goals: voteRow?.goals ?? null,
      assists: voteRow?.assists ?? null,
      yellowCards: voteRow?.yellowCards ?? null,
      redCards: voteRow?.redCards ?? null,
      ownGoals: voteRow?.ownGoals ?? null,
      penaltySaved: voteRow?.penaltySaved ?? null,
      penaltyMissed: voteRow?.penaltyMissed ?? null,
      fantasyBonusPct,
      estimatedValue,
      source: quoteRows.length > 0 ? 'synthetic' : 'mock',
      sourceQuote: quoteRows.length > 0 ? 'synthetic' : 'mock',
      sourceVote: voteRow ? 'official' : 'missing',
    };
  });

  return {
    playerId: player.playerId,
    backendPlayerId: player.backendPlayerId,
    externalId: player.externalId,
    playerName: player.playerName,
    role: player.role,
    club: player.club,
    season: player.season,
    initialQuote: player.initialQuote,
    rounds,
  };
}

export function getPlayerRoundSnapshot(memory: PlayerRoundMemory | undefined, round: number) {
  return memory?.rounds.find(point => point.round === round)
    ?? memory?.rounds.filter(point => point.round <= round).at(-1)
    ?? memory?.rounds[0]
    ?? null;
}

function interpolateQuote(initialQuote: number, currentQuote: number, round: number, maxRound: number) {
  if (maxRound <= 1) return currentQuote;
  const progress = (round - 1) / (maxRound - 1);
  return initialQuote + (currentQuote - initialQuote) * progress;
}
