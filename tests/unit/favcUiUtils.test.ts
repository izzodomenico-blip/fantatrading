import { buildTeamTrendFromPositions } from '../../app/web/src/utils/teamTrend';
import { simulateTradeChange } from '../../app/web/src/utils/tradeSimulation';
import { filterAndSortMarketPlayers } from '../../app/web/src/utils/marketFilters';
import type { DemoMarketPlayer, DemoPosition } from '../../app/web/src/mock/favcDemoData';

const position: DemoPosition = {
  id: 'pos-1',
  playerName: 'Svilar',
  realTeam: 'Roma',
  role: 'P',
  initialQuote: 10,
  currentQuote: 12,
  fantasyMultiplier: 1,
  status: 'ACTIVE',
  trend: [
    { round: 1, quote: 10, quoteChange: 0, fantaTradingReturnPct: 0, estimatedValue: 10, source: 'synthetic' },
    { round: 2, quote: 11, quoteChange: 1, fantaTradingReturnPct: 5, estimatedValue: 10.5, source: 'synthetic' },
    { round: 3, quote: 12, quoteChange: 1, fantaTradingReturnPct: 10, estimatedValue: 11, source: 'synthetic' },
  ],
};

const marketPlayer: DemoMarketPlayer = {
  id: 'm-1',
  playerName: 'Retegui',
  realTeam: 'Atalanta',
  role: 'A',
  quote: 18,
  trendPct: 12,
  performancePct: 12,
  available: true,
  trend: [
    { round: 1, quote: 14, quoteChange: 0, fantaTradingReturnPct: 0, estimatedValue: 14, source: 'synthetic' },
    { round: 2, quote: 18, quoteChange: 4, fantaTradingReturnPct: 20, estimatedValue: 16.8, source: 'synthetic' },
  ],
};

describe('FAVC UI utilities', () => {
  it('builds team trend without mutating positions', () => {
    const before = JSON.stringify(position);
    const trend = buildTeamTrendFromPositions([position], {
      virtualCashBalance: 2,
      totalCapitalDeposited: 12,
    });

    expect(trend).toEqual([
      { round: 1, portfolioValue: 10, totalValue: 12, roiPct: 0 },
      { round: 2, portfolioValue: 10.5, totalValue: 12.5, roiPct: 4.17 },
      { round: 3, portfolioValue: 11, totalValue: 13, roiPct: 8.33 },
    ]);
    expect(JSON.stringify(position)).toBe(before);
  });

  it('simulates trade changes locally without mutating inputs', () => {
    const beforePosition = JSON.stringify(position);
    const beforeMarket = JSON.stringify(marketPlayer);
    const result = simulateTradeChange(position, marketPlayer, {
      virtualCashBalance: 0,
      totalCapitalDeposited: 12,
      currentPortfolioValue: 11,
    });

    expect(result.sellNetProceeds).toBeGreaterThan(0);
    expect(result.buyTotalCost).toBeGreaterThan(marketPlayer.quote);
    expect(result.totalCapitalDepositedAfter).toBeGreaterThanOrEqual(12);
    expect(JSON.stringify(position)).toBe(beforePosition);
    expect(JSON.stringify(marketPlayer)).toBe(beforeMarket);
  });

  it('filters market players by role, trend and available trend data', () => {
    const filtered = filterAndSortMarketPlayers([marketPlayer], {
      search: 'rete',
      role: 'A',
      team: 'Tutte',
      price: 'high',
      trend: 'up',
      onlyWithTrend: true,
      sortBy: 'return',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].playerName).toBe('Retegui');
  });
});
