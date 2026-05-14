import { buildTeamTrendFromPositions } from '../../app/web/src/utils/teamTrend';
import { simulateTradeChange } from '../../app/web/src/utils/tradeSimulation';
import { filterAndSortMarketPlayers } from '../../app/web/src/utils/marketFilters';
import { buildBuyConfirmation, buildSellConfirmation } from '../../app/web/src/utils/tradeConfirmation';
import { buildRosterDraftSummary, canAddPlayerToDraft } from '../../app/web/src/utils/teamBuilder';
import type { DemoMarketPlayer, DemoPosition } from '../../app/web/src/mock/favcDemoData';
import { readFileSync } from 'fs';

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
  it('has 2025/26 processed market, votes and synthetic trend data for the builder', () => {
    const quotes = JSON.parse(readFileSync('data/real/processed/fantacalcio_quotes_history.json', 'utf8')).rows;
    const votes = JSON.parse(readFileSync('data/real/processed/votes/fantacalcio_votes_history.json', 'utf8')).rows;
    const synthetic = JSON.parse(readFileSync('data/real/processed/round-quotes/synthetic_round_quotes_history.json', 'utf8')).rows;
    const votes2025 = votes.filter((row: { season: string }) => row.season === '2025/26');
    const synthetic2025 = synthetic.filter((row: { season: string }) => row.season === '2025/26');

    expect(quotes.filter((row: { season: string }) => row.season === '2025/26')).toHaveLength(531);
    expect(votes2025.length).toBeGreaterThan(0);
    expect(Math.max(...votes2025.map((row: { round: number }) => row.round))).toBe(36);
    expect(synthetic2025.length).toBeGreaterThan(0);
    expect(Math.max(...synthetic2025.map((row: { round: number }) => row.round))).toBe(36);
  });

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

  it('sorts market players by ascending and descending price', () => {
    const cheap = { ...marketPlayer, id: 'cheap', playerId: 'cheap', quote: 4, playerName: 'Cheap' };
    const expensive = { ...marketPlayer, id: 'expensive', playerId: 'expensive', quote: 20, playerName: 'Expensive' };
    const baseFilters = {
      search: '',
      role: 'all' as const,
      team: 'Tutte',
      price: 'all' as const,
      trend: 'all' as const,
      onlyWithTrend: false,
      sortBy: 'priceAsc' as const,
    };

    expect(filterAndSortMarketPlayers([expensive, cheap], baseFilters).map(player => player.id)).toEqual(['cheap', 'expensive']);
    expect(filterAndSortMarketPlayers([cheap, expensive], { ...baseFilters, sortBy: 'priceDesc' }).map(player => player.id)).toEqual(['expensive', 'cheap']);
  });

  it('builds buy confirmation without mutating data and blocks a full roster', () => {
    const fullRoster = Array.from({ length: 25 }, (_, index) => ({
      ...position,
      id: `pos-${index}`,
      playerId: `owned-${index}`,
      role: index < 3 ? 'P' : index < 11 ? 'D' : index < 19 ? 'C' : 'A',
    })) as DemoPosition[];
    const beforeRoster = JSON.stringify(fullRoster);
    const beforeMarket = JSON.stringify(marketPlayer);

    const confirmation = buildBuyConfirmation(marketPlayer, fullRoster, 4, 100);

    expect(confirmation.canConfirm).toBe(false);
    expect(confirmation.isRosterFull).toBe(true);
    expect(confirmation.capitalAdded).toBeGreaterThan(0);
    expect(JSON.stringify(fullRoster)).toBe(beforeRoster);
    expect(JSON.stringify(marketPlayer)).toBe(beforeMarket);
  });

  it('builds sell confirmation without mutating data', () => {
    const before = JSON.stringify(position);
    const confirmation = buildSellConfirmation(position, [position], 3);

    expect(confirmation.grossAmount).toBeGreaterThan(0);
    expect(confirmation.netAmount).toBeLessThan(confirmation.grossAmount);
    expect(confirmation.cashAfter).toBeGreaterThan(confirmation.cashBefore);
    expect(confirmation.leavesRoleShort).toBe(true);
    expect(JSON.stringify(position)).toBe(before);
  });

  it('builds roster draft summary with initial cash, 2% fees and extra virtual capital', () => {
    const roster = [
      ...Array.from({ length: 3 }, (_, index) => ({ ...marketPlayer, id: `gk-${index}`, playerId: `gk-${index}`, role: 'P' as const, quote: 10 })),
      ...Array.from({ length: 8 }, (_, index) => ({ ...marketPlayer, id: `def-${index}`, playerId: `def-${index}`, role: 'D' as const, quote: 10 })),
      ...Array.from({ length: 8 }, (_, index) => ({ ...marketPlayer, id: `mid-${index}`, playerId: `mid-${index}`, role: 'C' as const, quote: 10 })),
      ...Array.from({ length: 6 }, (_, index) => ({ ...marketPlayer, id: `fwd-${index}`, playerId: `fwd-${index}`, role: 'A' as const, quote: 10 })),
    ];

    const summary = buildRosterDraftSummary(roster, 200);

    expect(summary.isValid).toBe(true);
    expect(summary.playerCost).toBe(250);
    expect(summary.buyCommissions).toBeCloseTo(5);
    expect(summary.extraCapitalAdded).toBeCloseTo(55);
    expect(summary.residualCash).toBe(0);
    expect(summary.status).toBe('completa');
  });

  it('blocks duplicate and role-exceeding additions in draft builder', () => {
    const goalkeepers = Array.from({ length: 3 }, (_, index) => ({
      ...marketPlayer,
      id: `gk-${index}`,
      playerId: `gk-${index}`,
      role: 'P' as const,
    }));

    expect(canAddPlayerToDraft(goalkeepers[0], goalkeepers).ok).toBe(false);
    expect(canAddPlayerToDraft({ ...marketPlayer, id: 'gk-4', playerId: 'gk-4', role: 'P' }, goalkeepers).ok).toBe(false);
  });
});
