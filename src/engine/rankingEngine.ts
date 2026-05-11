import { Portfolio, getPortfolioValue } from '../domain/Portfolio';
import { Team } from '../domain/Team';
import { PrizeAward } from './prizePoolEngine';

export interface RankingEntry {
  rank: number;
  teamId: string;
  teamName: string;
  portfolioValue: number;
  budget: number;
  totalWealth: number;
  prize: number;
}

export function calculateRanking(
  teams: Team[],
  portfolios: Map<string, Portfolio>,
  prizes: PrizeAward[] = [],
): RankingEntry[] {
  const entries: RankingEntry[] = teams.map(team => {
    const portfolio = portfolios.get(team.id);
    const portfolioValue = portfolio ? getPortfolioValue(portfolio) : 0;
    return {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      portfolioValue,
      budget: team.budget,
      totalWealth: portfolioValue + team.budget,
      prize: 0,
    };
  });

  entries.sort((a, b) => b.totalWealth - a.totalWealth);

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
    const prizeEntry = prizes.find(p => p.rank === entry.rank);
    if (prizeEntry) entry.prize = prizeEntry.amount;
  });

  return entries;
}

export function getRankingByTeamId(ranking: RankingEntry[], teamId: string): RankingEntry | undefined {
  return ranking.find(e => e.teamId === teamId);
}

export function getTopN(ranking: RankingEntry[], n: number): RankingEntry[] {
  return ranking.filter(e => e.rank <= n);
}
