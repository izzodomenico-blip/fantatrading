export type PlayerTrendPoint = {
  round: number;
  quote: number;
  quoteChange: number;
  fantaTradingReturnPct: number;
  estimatedValue: number;
  vote?: number | null;
  fantasyBonusPct?: number;
  source: 'synthetic' | 'official' | 'mock';
};

export type RawSyntheticRoundQuote = {
  round: number;
  playerId: number | string;
  playerName: string;
  club: string;
  role: string;
  initialQuote: number;
  qa?: number;
  qaa?: number;
  vote?: number | null;
  fantasyVote?: number | null;
  season?: string;
};

export type RawVoteRow = {
  round: number;
  playerId: number | string;
  vote?: number | null;
  fantasyVote?: number | null;
};

export function calculateFantaTradingReturnPct(initialQuote: number, currentQuote: number) {
  return (currentQuote - initialQuote) * 5;
}

export function calculateEstimatedPositionValue(
  initialQuote: number,
  currentQuote: number,
  fantasyMultiplier = 1,
) {
  return Math.max(
    0,
    initialQuote * fantasyMultiplier * (1 + calculateFantaTradingReturnPct(initialQuote, currentQuote) / 100),
  );
}

export function getTrendTone(points: PlayerTrendPoint[]) {
  if (points.length < 2) return 'stable' as const;
  const diff = points[points.length - 1].quote - points[0].quote;
  if (diff > 0.25) return 'up' as const;
  if (diff < -0.25) return 'down' as const;
  return 'stable' as const;
}

export function normalizeSyntheticTrend(
  rows: RawSyntheticRoundQuote[],
  playerId: string | number | undefined,
  fallback: {
    initialQuote: number;
    currentQuote: number;
    fantasyMultiplier?: number;
    playerName?: string;
  },
): PlayerTrendPoint[] {
  const playerIdText = playerId === undefined ? undefined : String(playerId);
  const matchedRows = rows
    .filter(row => {
      if (playerIdText !== undefined && String(row.playerId) === playerIdText) return true;
      if (fallback.playerName && row.playerName.toLowerCase() === fallback.playerName.toLowerCase()) return true;
      return false;
    })
    .sort((a, b) => a.round - b.round);

  if (matchedRows.length > 0) {
    let previousQuote = fallback.initialQuote;
    return matchedRows.map((row, index) => {
      const quote = Number((row.qaa ?? row.qa ?? fallback.currentQuote).toFixed(2));
      const initialQuote = row.initialQuote || fallback.initialQuote;
      const quoteChange = index === 0 ? quote - initialQuote : quote - previousQuote;
      previousQuote = quote;

      return {
        round: row.round,
        quote,
        quoteChange,
        fantaTradingReturnPct: calculateFantaTradingReturnPct(initialQuote, quote),
        estimatedValue: calculateEstimatedPositionValue(initialQuote, quote, fallback.fantasyMultiplier ?? 1),
        vote: row.vote ?? row.fantasyVote ?? null,
        fantasyBonusPct: row.fantasyVote && row.vote ? (row.fantasyVote - row.vote) * 2 : 0,
        source: 'synthetic',
      };
    });
  }

  return createMockTrend(fallback.initialQuote, fallback.currentQuote, fallback.fantasyMultiplier ?? 1);
}

export function createMockTrend(initialQuote: number, currentQuote: number, fantasyMultiplier = 1): PlayerTrendPoint[] {
  const totalRounds = 8;
  return Array.from({ length: totalRounds }, (_, index) => {
    const progress = index / (totalRounds - 1);
    const wave = Math.sin(index * 1.3) * 0.35;
    const quote = Number((initialQuote + (currentQuote - initialQuote) * progress + wave).toFixed(2));
    const prevProgress = Math.max(0, (index - 1) / (totalRounds - 1));
    const prevQuote = index === 0
      ? initialQuote
      : initialQuote + (currentQuote - initialQuote) * prevProgress + Math.sin((index - 1) * 1.3) * 0.35;

    return {
      round: index + 1,
      quote,
      quoteChange: Number((quote - prevQuote).toFixed(2)),
      fantaTradingReturnPct: calculateFantaTradingReturnPct(initialQuote, quote),
      estimatedValue: calculateEstimatedPositionValue(initialQuote, quote, fantasyMultiplier),
      vote: index % 3 === 0 ? 6.5 : index % 4 === 0 ? 5.5 : 6,
      fantasyBonusPct: index % 4 === 0 ? -1 : index % 3 === 0 ? 1 : 0,
      source: 'mock',
    };
  });
}

export function mergeVotesIntoTrend(
  trend: PlayerTrendPoint[],
  votes: RawVoteRow[],
  playerId?: string | number,
): PlayerTrendPoint[] {
  const playerIdText = playerId === undefined ? undefined : String(playerId);
  return trend.map(point => {
    const vote = votes.find(row =>
      row.round === point.round &&
      (playerIdText === undefined || String(row.playerId) === playerIdText),
    );

    if (!vote) return point;

    return {
      ...point,
      vote: vote.vote ?? point.vote ?? null,
      fantasyBonusPct: vote.fantasyVote && vote.vote ? (vote.fantasyVote - vote.vote) * 2 : point.fantasyBonusPct,
    };
  });
}
