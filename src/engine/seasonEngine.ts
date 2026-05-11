import { Season, SeasonConfig, createSeason } from '../domain/Season';
import { Team, createTeam } from '../domain/Team';
import { Portfolio, createPortfolio } from '../domain/Portfolio';
import { TradingRules } from '../config/defaultRules';
import { PrizeDistribution } from '../config/prizeTables';
import { splitCommission, calculatePrizeDistribution, PrizePoolSummary } from './prizePoolEngine';
import { calculateRanking, RankingEntry } from './rankingEngine';
import { MarketOperation } from '../domain/MarketOperation';

export interface SeasonState {
  season: Season;
  portfolios: Map<string, Portfolio>;
  allOperations: MarketOperation[];
}

export function initializeSeason(
  config: SeasonConfig,
  teamNames: string[],
  rules: TradingRules,
): SeasonState {
  const teams: Team[] = teamNames.map((name, i) =>
    createTeam(`team_${i}`, name, name, rules.initialBudget),
  );

  const portfolios = new Map<string, Portfolio>();
  teams.forEach(team => portfolios.set(team.id, createPortfolio(team.id)));

  const season = createSeason(config, teams);

  return { season, portfolios, allOperations: [] };
}

export function accumulateCommission(
  state: SeasonState,
  commission: number,
  rules: TradingRules,
): SeasonState {
  const { toPrizePool, toPlatform } = splitCommission(commission, rules);
  return {
    ...state,
    season: {
      ...state.season,
      totalCommissionsCollected: state.season.totalCommissionsCollected + commission,
      totalPrizePool: state.season.totalPrizePool + toPrizePool,
      platformRevenue: state.season.platformRevenue + toPlatform,
    },
  };
}

export interface SeasonSummary {
  prizePool: number;
  platformRevenue: number;
  totalCommissions: number;
  ranking: RankingEntry[];
  roundsPlayed: number;
}

export function finalizeSeason(
  state: SeasonState,
  prizeTable: PrizeDistribution[],
): SeasonSummary {
  const prizes = calculatePrizeDistribution(state.season.totalPrizePool, prizeTable);
  const ranking = calculateRanking(state.season.teams, state.portfolios, prizes);

  return {
    prizePool: state.season.totalPrizePool,
    platformRevenue: state.season.platformRevenue,
    totalCommissions: state.season.totalCommissionsCollected,
    ranking,
    roundsPlayed: state.season.rounds.length,
  };
}
