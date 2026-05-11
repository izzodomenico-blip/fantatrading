import { TradingRules } from '../config/defaultRules';
import { MarketOperation, OperationType, createOperationId } from '../domain/MarketOperation';
import { Portfolio, addShares, removeShares } from '../domain/Portfolio';
import { Team, debitTeam, creditTeam, addCommission } from '../domain/Team';
import { Player } from '../domain/Player';

// ─── Calcoli puri (no side effects) ─────────────────────────────────────────

export function calculateBuyCommission(grossAmount: number, rules: TradingRules): number {
  return grossAmount * rules.buyCommissionRate;
}

export function calculateSellCommission(grossAmount: number, rules: TradingRules): number {
  return grossAmount * rules.sellCommissionRate;
}

export interface BuyCostBreakdown {
  shares: number;
  pricePerShare: number;
  grossAmount: number;
  commission: number;
  totalCost: number;
}

export function calculateBuyCost(
  shares: number,
  pricePerShare: number,
  rules: TradingRules,
): BuyCostBreakdown {
  const grossAmount = shares * pricePerShare;
  const commission = calculateBuyCommission(grossAmount, rules);
  return { shares, pricePerShare, grossAmount, commission, totalCost: grossAmount + commission };
}

export interface SellProceedsBreakdown {
  shares: number;
  pricePerShare: number;
  grossAmount: number;
  commission: number;
  netProceeds: number;
}

export function calculateSellProceeds(
  shares: number,
  pricePerShare: number,
  rules: TradingRules,
): SellProceedsBreakdown {
  const grossAmount = shares * pricePerShare;
  const commission = calculateSellCommission(grossAmount, rules);
  return { shares, pricePerShare, grossAmount, commission, netProceeds: grossAmount - commission };
}

export function canAffordBuy(team: Team, totalCost: number, rules: TradingRules): boolean {
  return team.budget - totalCost >= rules.minBudgetReserve;
}

// ─── Esecuzione operazioni ────────────────────────────────────────────────────

export interface BuyResult {
  operation: MarketOperation;
  team: Team;
  portfolio: Portfolio;
}

export function executeBuy(
  team: Team,
  portfolio: Portfolio,
  player: Player,
  shares: number,
  roundNumber: number,
  opIndex: number,
  rules: TradingRules,
): BuyResult {
  const { grossAmount, commission, totalCost } = calculateBuyCost(shares, player.currentValue, rules);

  if (!canAffordBuy(team, totalCost, rules)) {
    throw new Error(`Squadra ${team.id}: budget insufficiente per acquistare ${shares} quote di ${player.name}`);
  }

  const operation: MarketOperation = {
    id: createOperationId(team.id, roundNumber, opIndex),
    teamId: team.id,
    playerId: player.id,
    type: 'BUY',
    shares,
    pricePerShare: player.currentValue,
    grossAmount,
    commission,
    netAmount: totalCost,
    roundNumber,
    timestamp: new Date(),
  };

  const updatedTeam = addCommission(debitTeam(team, totalCost), commission);
  const updatedPortfolio = addShares(portfolio, player, shares, player.currentValue);

  return { operation, team: updatedTeam, portfolio: updatedPortfolio };
}

export interface SellResult {
  operation: MarketOperation;
  team: Team;
  portfolio: Portfolio;
}

export function executeSell(
  team: Team,
  portfolio: Portfolio,
  player: Player,
  shares: number,
  roundNumber: number,
  opIndex: number,
  rules: TradingRules,
): SellResult {
  const { grossAmount, commission, netProceeds } = calculateSellProceeds(shares, player.currentValue, rules);

  const operation: MarketOperation = {
    id: createOperationId(team.id, roundNumber, opIndex),
    teamId: team.id,
    playerId: player.id,
    type: 'SELL',
    shares,
    pricePerShare: player.currentValue,
    grossAmount,
    commission,
    netAmount: netProceeds,
    roundNumber,
    timestamp: new Date(),
  };

  const updatedPortfolio = removeShares(portfolio, player.id, shares);
  const updatedTeam = addCommission(creditTeam(team, netProceeds), commission);

  return { operation, team: updatedTeam, portfolio: updatedPortfolio };
}
