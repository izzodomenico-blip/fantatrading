import type { DemoPosition } from '../mock/favcDemoData';

export type RosterStatus = 'in_forma' | 'stabile' | 'rischio_sv' | 'in_calo';

export type RosterVoteStats = {
  avgVote: number | null;
  avgFantasy: number | null;
  presences: number;
  sv: number;
  bestVote: number | null;
  worstVote: number | null;
  bonusAvg: number;
  contribution: number;
  status: RosterStatus;
};

export function computeRosterVoteStats(position: DemoPosition): RosterVoteStats {
  const trend = position.trend ?? [];
  const playedPoints = trend.filter(point => !point.isSv && typeof point.vote === 'number');
  const votes = playedPoints.map(p => p.vote as number);
  const fantasy = playedPoints
    .map(p => p.fantasyVote)
    .filter((v): v is number => typeof v === 'number');
  const bonusSum = trend.reduce((sum, p) => sum + (p.fantasyBonusPct ?? 0), 0);
  const contributionSum = trend.reduce((sum, p) => sum + (p.estimatedValue - position.initialQuote), 0);

  const lastFive = trend.slice(-5);
  const recentPlayed = lastFive.filter(p => !p.isSv && typeof p.vote === 'number');
  const recentSv = lastFive.filter(p => p.isSv).length;
  const recentVoteAvg = recentPlayed.length
    ? recentPlayed.reduce((sum, p) => sum + (p.vote ?? 0), 0) / recentPlayed.length
    : null;

  let status: RosterStatus = 'stabile';
  if (recentSv >= 3) {
    status = 'rischio_sv';
  } else if (recentVoteAvg !== null && recentVoteAvg >= 6.5) {
    status = 'in_forma';
  } else if (recentVoteAvg !== null && recentVoteAvg < 5.5) {
    status = 'in_calo';
  }

  return {
    avgVote: votes.length ? Number((votes.reduce((s, v) => s + v, 0) / votes.length).toFixed(2)) : null,
    avgFantasy: fantasy.length ? Number((fantasy.reduce((s, v) => s + v, 0) / fantasy.length).toFixed(2)) : null,
    presences: playedPoints.length,
    sv: trend.length - playedPoints.length,
    bestVote: votes.length ? Math.max(...votes) : null,
    worstVote: votes.length ? Math.min(...votes) : null,
    bonusAvg: trend.length ? Number((bonusSum / trend.length).toFixed(2)) : 0,
    contribution: Number(contributionSum.toFixed(2)),
    status,
  };
}

export function statusLabel(status: RosterStatus): string {
  switch (status) {
    case 'in_forma':
      return 'in forma';
    case 'in_calo':
      return 'in calo';
    case 'rischio_sv':
      return 'rischio SV';
    case 'stabile':
    default:
      return 'stabile';
  }
}
