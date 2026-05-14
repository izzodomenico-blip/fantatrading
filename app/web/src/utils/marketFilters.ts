import type { DemoMarketPlayer, FavcRole } from '../mock/favcDemoData';
import { getTrendTone } from './playerTrend';

export type MarketPriceFilter = 'all' | 'low' | 'mid' | 'high';
export type MarketTrendFilter = 'all' | 'up' | 'stable' | 'down';
export type MarketSortKey = 'price' | 'priceAsc' | 'priceDesc' | 'return' | 'name' | 'role' | 'quoteChange';

export type MarketFilterState = {
  search: string;
  role: FavcRole | 'all';
  team: string;
  price: MarketPriceFilter;
  trend: MarketTrendFilter;
  onlyWithTrend: boolean;
  sortBy: MarketSortKey;
};

export function filterAndSortMarketPlayers(players: DemoMarketPlayer[], filters: MarketFilterState) {
  return players
    .filter(player => {
      const trend = getTrendTone(player.trend ?? []);
      if (filters.search && !player.playerName.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.role !== 'all' && player.role !== filters.role) return false;
      if (filters.team !== 'Tutte' && player.realTeam !== filters.team) return false;
      if (filters.trend !== 'all' && trend !== filters.trend) return false;
      if (filters.onlyWithTrend && (!player.trend || player.trend.length === 0)) return false;
      if (filters.price === 'low' && player.quote > 8) return false;
      if (filters.price === 'mid' && (player.quote < 9 || player.quote > 12)) return false;
      if (filters.price === 'high' && player.quote < 13) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'price' || filters.sortBy === 'priceDesc') return b.quote - a.quote;
      if (filters.sortBy === 'priceAsc') return a.quote - b.quote;
      if (filters.sortBy === 'return') return b.performancePct - a.performancePct;
      if (filters.sortBy === 'role') return a.role.localeCompare(b.role) || a.playerName.localeCompare(b.playerName);
      if (filters.sortBy === 'quoteChange') return b.trendPct - a.trendPct;
      return a.playerName.localeCompare(b.playerName);
    });
}
