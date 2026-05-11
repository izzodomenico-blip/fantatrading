import {
  calculateBuyCommission,
  calculateSellCommission,
  calculateBuyCost,
  calculateSellProceeds,
  canAffordBuy,
  executeBuy,
  executeSell,
} from '../../src/engine/marketEngine';
import { DEFAULT_RULES, TradingRules } from '../../src/config/defaultRules';
import { createTeam } from '../../src/domain/Team';
import { createPortfolio, addShares } from '../../src/domain/Portfolio';
import { createPlayer } from '../../src/domain/Player';

// Commissioni esplicite 10%/10% per mantenere i valori attesi nei test del motore
const rules: TradingRules = { ...DEFAULT_RULES, buyCommissionRate: 0.10, sellCommissionRate: 0.10 };

const player = createPlayer({
  id: 'p1',
  name: 'Test Player',
  role: 'FWD',
  clubTeam: 'Test Club',
  baseValue: 20,
  currentValue: 20,
});

// ─── Commissione Acquisto ────────────────────────────────────────────────────

describe('calculateBuyCommission', () => {
  test('commissione 10% su lordo 100 = 10', () => {
    expect(calculateBuyCommission(100, rules)).toBe(10);
  });

  test('commissione 0% quando buyCommissionRate = 0', () => {
    const zeroRules: TradingRules = { ...rules, buyCommissionRate: 0 };
    expect(calculateBuyCommission(100, zeroRules)).toBe(0);
  });

  test('commissione 15% su lordo 200 = 30', () => {
    const highRules: TradingRules = { ...rules, buyCommissionRate: 0.15 };
    expect(calculateBuyCommission(200, highRules)).toBe(30);
  });

  test('commissione su importo zero è zero', () => {
    expect(calculateBuyCommission(0, rules)).toBe(0);
  });
});

// ─── Commissione Vendita ─────────────────────────────────────────────────────

describe('calculateSellCommission', () => {
  test('commissione 10% su lordo 50 = 5', () => {
    expect(calculateSellCommission(50, rules)).toBe(5);
  });

  test('commissione asimmetrica: sell diverso da buy', () => {
    const asymRules: TradingRules = { ...rules, buyCommissionRate: 0.10, sellCommissionRate: 0.05 };
    expect(calculateSellCommission(100, asymRules)).toBe(5);
    expect(calculateBuyCommission(100, asymRules)).toBe(10);
  });

  test('round-trip cost con commissioni uguali = 2x tasso', () => {
    // Acquisto 100, vendo 100: perdo buyRate*100 + sellRate*100 = 20
    const buyCost = calculateBuyCommission(100, rules);
    const sellCost = calculateSellCommission(100, rules);
    expect(buyCost + sellCost).toBeCloseTo(20);
  });
});

// ─── calculateBuyCost ────────────────────────────────────────────────────────

describe('calculateBuyCost', () => {
  test('3 quote a 20 → lordo=60, commissione=6, totalCost=66', () => {
    const result = calculateBuyCost(3, 20, rules);
    expect(result.grossAmount).toBe(60);
    expect(result.commission).toBe(6);
    expect(result.totalCost).toBe(66);
  });

  test('totalCost = grossAmount + commission', () => {
    const result = calculateBuyCost(5, 15, rules);
    expect(result.totalCost).toBe(result.grossAmount + result.commission);
  });

  test('shares e pricePerShare riportati nel breakdown', () => {
    const result = calculateBuyCost(2, 30, rules);
    expect(result.shares).toBe(2);
    expect(result.pricePerShare).toBe(30);
  });
});

// ─── calculateSellProceeds ───────────────────────────────────────────────────

describe('calculateSellProceeds', () => {
  test('2 quote a 25 → lordo=50, commissione=5, netProceeds=45', () => {
    const result = calculateSellProceeds(2, 25, rules);
    expect(result.grossAmount).toBe(50);
    expect(result.commission).toBe(5);
    expect(result.netProceeds).toBe(45);
  });

  test('netProceeds = grossAmount - commission', () => {
    const result = calculateSellProceeds(4, 10, rules);
    expect(result.netProceeds).toBe(result.grossAmount - result.commission);
  });

  test('netProceeds sempre positivo con commissioni < 100%', () => {
    const result = calculateSellProceeds(1, 100, rules);
    expect(result.netProceeds).toBeGreaterThan(0);
  });
});

// ─── canAffordBuy ────────────────────────────────────────────────────────────

describe('canAffordBuy', () => {
  test('può acquistare se budget sufficiente', () => {
    const team = createTeam('t1', 'Team', 'Owner', 100);
    expect(canAffordBuy(team, 66, rules)).toBe(true);
  });

  test('non può acquistare se totalCost > budget', () => {
    const team = createTeam('t1', 'Team', 'Owner', 50);
    expect(canAffordBuy(team, 66, rules)).toBe(false);
  });

  test('rispetta minBudgetReserve', () => {
    const reserveRules: TradingRules = { ...rules, minBudgetReserve: 50 };
    const team = createTeam('t1', 'Team', 'Owner', 100);
    // budget=100, totalCost=60, rimarrebbero 40 < minBudgetReserve=50 → no
    expect(canAffordBuy(team, 60, reserveRules)).toBe(false);
    // budget=100, totalCost=40, rimarrebbero 60 >= 50 → sì
    expect(canAffordBuy(team, 40, reserveRules)).toBe(true);
  });
});

// ─── executeBuy ──────────────────────────────────────────────────────────────

describe('executeBuy', () => {
  test('esegue acquisto e aggiorna correttamente budget e portfolio', () => {
    const team = createTeam('t1', 'Team', 'Owner', 500);
    const portfolio = createPortfolio('t1');
    const { operation, team: updatedTeam, portfolio: updatedPortfolio } = executeBuy(team, portfolio, player, 2, 1, 0, rules);

    const expectedGross = 2 * 20;
    const expectedCommission = expectedGross * 0.10;
    const expectedCost = expectedGross + expectedCommission;

    expect(operation.type).toBe('BUY');
    expect(operation.grossAmount).toBe(expectedGross);
    expect(operation.commission).toBe(expectedCommission);
    expect(operation.netAmount).toBe(expectedCost);
    expect(updatedTeam.budget).toBeCloseTo(500 - expectedCost);
    expect(updatedTeam.totalCommissionsPaid).toBeCloseTo(expectedCommission);
    expect(updatedPortfolio.entries.get('p1')?.shares).toBe(2);
  });

  test('lancia errore se budget insufficiente', () => {
    const team = createTeam('t1', 'Team', 'Owner', 10);
    const portfolio = createPortfolio('t1');
    expect(() => executeBuy(team, portfolio, player, 100, 1, 0, rules)).toThrow();
  });
});

// ─── executeSell ─────────────────────────────────────────────────────────────

describe('executeSell', () => {
  test('esegue vendita e aggiorna correttamente budget e portfolio', () => {
    const team = createTeam('t1', 'Team', 'Owner', 100);
    const portfolio = addShares(createPortfolio('t1'), player, 3, 20);
    const { operation, team: updatedTeam, portfolio: updatedPortfolio } = executeSell(team, portfolio, player, 2, 1, 0, rules);

    const expectedGross = 2 * 20;
    const expectedCommission = expectedGross * 0.10;
    const expectedNet = expectedGross - expectedCommission;

    expect(operation.type).toBe('SELL');
    expect(operation.commission).toBeCloseTo(expectedCommission);
    expect(updatedTeam.budget).toBeCloseTo(100 + expectedNet);
    expect(updatedPortfolio.entries.get('p1')?.shares).toBe(1);
  });

  test('lancia errore se non si possiedono le quote', () => {
    const team = createTeam('t1', 'Team', 'Owner', 100);
    const portfolio = createPortfolio('t1');
    expect(() => executeSell(team, portfolio, player, 1, 1, 0, rules)).toThrow();
  });
});
