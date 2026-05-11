import { Player } from './Player';

export interface PortfolioEntry {
  player: Player;
  shares: number;
  avgPurchasePrice: number;
}

export interface Portfolio {
  teamId: string;
  entries: Map<string, PortfolioEntry>;
}

export function createPortfolio(teamId: string): Portfolio {
  return { teamId, entries: new Map() };
}

export function getPortfolioValue(portfolio: Portfolio): number {
  let total = 0;
  for (const entry of portfolio.entries.values()) {
    total += entry.player.currentValue * entry.shares;
  }
  return total;
}

export function addShares(
  portfolio: Portfolio,
  player: Player,
  shares: number,
  purchasePricePerShare: number,
): Portfolio {
  const existing = portfolio.entries.get(player.id);
  const newEntries = new Map(portfolio.entries);

  if (existing) {
    const totalShares = existing.shares + shares;
    const totalCost = existing.avgPurchasePrice * existing.shares + purchasePricePerShare * shares;
    newEntries.set(player.id, {
      player,
      shares: totalShares,
      avgPurchasePrice: totalCost / totalShares,
    });
  } else {
    newEntries.set(player.id, { player, shares, avgPurchasePrice: purchasePricePerShare });
  }

  return { ...portfolio, entries: newEntries };
}

export function removeShares(portfolio: Portfolio, playerId: string, shares: number): Portfolio {
  const existing = portfolio.entries.get(playerId);
  if (!existing) throw new Error(`Calciatore ${playerId} non trovato nel portfolio`);
  if (existing.shares < shares) throw new Error(`Quote insufficienti: richieste ${shares}, disponibili ${existing.shares}`);

  const newEntries = new Map(portfolio.entries);
  const remainingShares = existing.shares - shares;

  if (remainingShares === 0) {
    newEntries.delete(playerId);
  } else {
    newEntries.set(playerId, { ...existing, shares: remainingShares });
  }

  return { ...portfolio, entries: newEntries };
}

export function getPortfolioPlayerCount(portfolio: Portfolio): number {
  return portfolio.entries.size;
}
