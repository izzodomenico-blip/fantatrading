import {
  calculateROI,
  calculateRealizedGains,
  compareROIs,
} from '../../src/engine/roiEngine';
import { createTeam } from '../../src/domain/Team';
import { createPortfolio, addShares } from '../../src/domain/Portfolio';
import { createPlayer } from '../../src/domain/Player';
import { MarketOperation } from '../../src/domain/MarketOperation';

const player = createPlayer({
  id: 'p1',
  name: 'Tizio',
  role: 'MID',
  clubTeam: 'FC Test',
  baseValue: 20,
  currentValue: 30, // valore aumentato
});

function makeOp(type: 'BUY' | 'SELL', grossAmount: number, commission: number): MarketOperation {
  return {
    id: 'op1',
    teamId: 't1',
    playerId: 'p1',
    type,
    shares: 1,
    pricePerShare: grossAmount,
    grossAmount,
    commission,
    netAmount: type === 'BUY' ? grossAmount + commission : grossAmount - commission,
    roundNumber: 1,
    timestamp: new Date(),
  };
}

// ─── calculateRealizedGains ──────────────────────────────────────────────────

describe('calculateRealizedGains', () => {
  test('nessuna operazione → 0', () => {
    expect(calculateRealizedGains([])).toBe(0);
  });

  test('solo acquisti → gains negativi (costo)', () => {
    const ops = [makeOp('BUY', 100, 10)];
    expect(calculateRealizedGains(ops)).toBe(-100);
  });

  test('solo vendite → gains positivi', () => {
    const ops = [makeOp('SELL', 120, 12)];
    expect(calculateRealizedGains(ops)).toBe(120);
  });

  test('acquisto a 100 poi vendita a 120 → realized gain = 20', () => {
    const ops = [makeOp('BUY', 100, 10), makeOp('SELL', 120, 12)];
    expect(calculateRealizedGains(ops)).toBe(20);
  });
});

// ─── calculateROI ────────────────────────────────────────────────────────────

describe('calculateROI', () => {
  test('nessuna operazione, portfolio vuoto → ROI = 0', () => {
    const team = createTeam('t1', 'Team', 'Owner', 500);
    const portfolio = createPortfolio('t1');
    const result = calculateROI(team, portfolio, 500, []);

    expect(result.netROIPercent).toBe(0);
    expect(result.grossROIPercent).toBe(0);
    expect(result.portfolioValue).toBe(0);
    expect(result.totalWealth).toBe(500);
  });

  test('portfolio aumenta di valore → ROI positivo', () => {
    // Compra player a 20, ora vale 30 → +10 unrealized
    const team = { ...createTeam('t1', 'Team', 'Owner', 480), totalCommissionsPaid: 2 };
    const portfolio = addShares(createPortfolio('t1'), player, 1, 20);
    const result = calculateROI(team, portfolio, 500, [makeOp('BUY', 20, 2)]);

    // totalWealth = 480 + 30 = 510, initialBudget = 500 → netROI = +2%
    expect(result.totalWealth).toBe(510);
    expect(result.netROIPercent).toBeCloseTo(2);
  });

  test('le commissioni pagano erodono il netROI', () => {
    const team = { ...createTeam('t1', 'Team', 'Owner', 500), totalCommissionsPaid: 50 };
    const portfolio = createPortfolio('t1');
    const result = calculateROI(team, portfolio, 500, []);

    // totalWealth = 500, initialBudget = 500 → netROI = 0
    // commissioni già incluse nella riduzione del budget
    expect(result.commissionDragPercent).toBe(10); // 50/500 = 10%
  });

  test('teamId viene riportato correttamente', () => {
    const team = createTeam('team_abc', 'Team', 'Owner', 500);
    const result = calculateROI(team, createPortfolio('team_abc'), 500, []);
    expect(result.teamId).toBe('team_abc');
  });
});

// ─── compareROIs ─────────────────────────────────────────────────────────────

describe('compareROIs', () => {
  const makeROI = (netROIPercent: number) => ({
    teamId: 't',
    initialBudget: 500,
    currentBudget: 500,
    portfolioValue: 0,
    totalWealth: 500,
    totalCommissionsPaid: 0,
    realizedGains: 0,
    unrealizedGains: 0,
    netROIPercent,
    grossROIPercent: netROIPercent,
    commissionDragPercent: 0,
  });

  test('identifica best e worst', () => {
    const results = [makeROI(5), makeROI(-3), makeROI(10), makeROI(0)];
    const cmp = compareROIs(results);
    expect(cmp.best.netROIPercent).toBe(10);
    expect(cmp.worst.netROIPercent).toBe(-3);
  });

  test('media calcolata correttamente', () => {
    const results = [makeROI(0), makeROI(10), makeROI(20)];
    expect(compareROIs(results).average).toBeCloseTo(10);
  });

  test('mediana su numero dispari', () => {
    const results = [makeROI(1), makeROI(5), makeROI(9)];
    expect(compareROIs(results).median).toBe(5);
  });

  test('lancia errore con lista vuota', () => {
    expect(() => compareROIs([])).toThrow();
  });
});
