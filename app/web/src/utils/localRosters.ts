import type { FavcRole } from '../mock/favcDemoData';
import { BUY_COMMISSION_RATE, SELL_COMMISSION_RATE } from '../mock/favcDemoData';

export const LOCAL_ROSTERS_KEY = 'fantatrading.localRosters.v1';
export const ACTIVE_LOCAL_ROSTER_KEY = 'fantatrading.activeLocalRosterId';

export type LocalRosterPlayer = {
  playerId: string;
  backendPlayerId?: string;
  playerName: string;
  realTeam: string;
  role: FavcRole;
  initialQuote: number;
};

export type LocalRosterTrade = {
  id: string;
  round: number;
  type: 'BUY' | 'SELL';
  playerId: string;
  backendPlayerId?: string;
  playerName: string;
  realTeam: string;
  role: FavcRole;
  quoteAtTrade: number;
  grossAmount: number;
  commission: number;
  netAmount: number;
  cashBefore: number;
  cashAfter: number;
  capitalAdded: number;
  createdAt: string;
};

export type LocalRoster = {
  id: string;
  name: string;
  seasonId?: string;
  seasonLabel: string;
  initialCapital: number;
  capitalAddedAtCreation: number;
  initialRosterCost: number;
  initialBuyCommissions: number;
  initialCashAfterBuys: number;
  initialPlayers: LocalRosterPlayer[];
  trades: LocalRosterTrade[];
  currentRound: number;
  backendTeamId?: string;
  createdAt: string;
  updatedAt: string;
};

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function getStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLocalRosters(): LocalRoster[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(LOCAL_ROSTERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalRoster[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalRosters(rosters: LocalRoster[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(LOCAL_ROSTERS_KEY, JSON.stringify(rosters));
  } catch {
    // quota or unavailable
  }
}

export function getActiveLocalRosterId(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(ACTIVE_LOCAL_ROSTER_KEY);
}

export function setActiveLocalRosterId(id: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  if (id) storage.setItem(ACTIVE_LOCAL_ROSTER_KEY, id);
  else storage.removeItem(ACTIVE_LOCAL_ROSTER_KEY);
}

export function upsertLocalRoster(roster: LocalRoster): LocalRoster[] {
  const all = readLocalRosters();
  const next = [...all.filter(item => item.id !== roster.id), { ...roster, updatedAt: new Date().toISOString() }];
  writeLocalRosters(next);
  return next;
}

export function deleteLocalRoster(id: string): LocalRoster[] {
  const all = readLocalRosters();
  const next = all.filter(item => item.id !== id);
  writeLocalRosters(next);
  const active = getActiveLocalRosterId();
  if (active === id) {
    setActiveLocalRosterId(next[0]?.id ?? null);
  }
  return next;
}

export function findLocalRoster(id: string | null | undefined): LocalRoster | null {
  if (!id) return null;
  return readLocalRosters().find(item => item.id === id) ?? null;
}

export type CreateLocalRosterInput = {
  name: string;
  seasonId?: string;
  seasonLabel: string;
  initialCapital: number;
  initialPlayers: LocalRosterPlayer[];
  backendTeamId?: string;
};

export function createLocalRoster(input: CreateLocalRosterInput): LocalRoster {
  const initialRosterCost = input.initialPlayers.reduce((sum, player) => sum + player.initialQuote, 0);
  const initialBuyCommissions = initialRosterCost * BUY_COMMISSION_RATE;
  const totalInitialCost = initialRosterCost + initialBuyCommissions;
  const capitalAddedAtCreation = Math.max(0, totalInitialCost - input.initialCapital);
  const finalInitialCapital = input.initialCapital + capitalAddedAtCreation;
  const initialCashAfterBuys = Math.max(0, finalInitialCapital - totalInitialCost);
  const now = new Date().toISOString();

  return {
    id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim() || 'Rosa senza nome',
    seasonId: input.seasonId,
    seasonLabel: input.seasonLabel,
    initialCapital: finalInitialCapital,
    capitalAddedAtCreation,
    initialRosterCost,
    initialBuyCommissions,
    initialCashAfterBuys,
    initialPlayers: input.initialPlayers,
    trades: [],
    currentRound: 1,
    backendTeamId: input.backendTeamId,
    createdAt: now,
    updatedAt: now,
  };
}

export type LocalRosterPositionState = {
  playerId: string;
  backendPlayerId?: string;
  playerName: string;
  realTeam: string;
  role: FavcRole;
  initialQuote: number;
  acquiredAtRound: number;
  status: 'ACTIVE' | 'SOLD';
  soldAtRound?: number;
  soldAtQuote?: number;
};

export type LocalRosterFinancials = {
  initialCapital: number;
  capitalAdded: number;
  totalCapitalDeposited: number;
  cashBalance: number;
  totalBuyCommissions: number;
  totalSellCommissions: number;
  totalSpentPlayers: number;
  totalProceedsFromSells: number;
};

export function buildLocalRosterStateAtRound(roster: LocalRoster, round: number): {
  positions: LocalRosterPositionState[];
  financials: LocalRosterFinancials;
} {
  const positions = new Map<string, LocalRosterPositionState>();
  for (const player of roster.initialPlayers) {
    positions.set(player.playerId, {
      playerId: player.playerId,
      backendPlayerId: player.backendPlayerId,
      playerName: player.playerName,
      realTeam: player.realTeam,
      role: player.role,
      initialQuote: player.initialQuote,
      acquiredAtRound: 0,
      status: 'ACTIVE',
    });
  }

  let cash = roster.initialCashAfterBuys;
  let capitalAdded = roster.capitalAddedAtCreation;
  let buyComms = roster.initialBuyCommissions;
  let sellComms = 0;
  let totalSpent = roster.initialRosterCost;
  let totalProceeds = 0;

  const tradesInWindow = roster.trades.filter(trade => trade.round <= round).sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.createdAt.localeCompare(b.createdAt);
  });

  for (const trade of tradesInWindow) {
    if (trade.type === 'BUY') {
      positions.set(trade.playerId, {
        playerId: trade.playerId,
        backendPlayerId: trade.backendPlayerId,
        playerName: trade.playerName,
        realTeam: trade.realTeam,
        role: trade.role,
        initialQuote: trade.quoteAtTrade,
        acquiredAtRound: trade.round,
        status: 'ACTIVE',
      });
      cash = trade.cashAfter;
      capitalAdded += trade.capitalAdded;
      buyComms += trade.commission;
      totalSpent += trade.grossAmount;
    } else {
      const existing = positions.get(trade.playerId);
      if (existing) {
        positions.set(trade.playerId, {
          ...existing,
          status: 'SOLD',
          soldAtRound: trade.round,
          soldAtQuote: trade.quoteAtTrade,
        });
      }
      cash = trade.cashAfter;
      sellComms += trade.commission;
      totalProceeds += trade.netAmount;
    }
  }

  const totalCapitalDeposited = roster.initialCapital + (capitalAdded - roster.capitalAddedAtCreation);

  return {
    positions: Array.from(positions.values()),
    financials: {
      initialCapital: roster.initialCapital,
      capitalAdded,
      totalCapitalDeposited,
      cashBalance: cash,
      totalBuyCommissions: buyComms,
      totalSellCommissions: sellComms,
      totalSpentPlayers: totalSpent,
      totalProceedsFromSells: totalProceeds,
    },
  };
}

export function computeBuyTrade(input: {
  cashBefore: number;
  quote: number;
}): { commission: number; grossAmount: number; netAmount: number; cashAfter: number; capitalAdded: number } {
  const grossAmount = input.quote;
  const commission = Number((grossAmount * BUY_COMMISSION_RATE).toFixed(2));
  const netAmount = Number((grossAmount + commission).toFixed(2));
  const cashNeeded = netAmount;
  const capitalAdded = Math.max(0, Number((cashNeeded - input.cashBefore).toFixed(2)));
  const cashAfter = Number((input.cashBefore + capitalAdded - cashNeeded).toFixed(2));
  return { commission, grossAmount, netAmount, cashAfter, capitalAdded };
}

export function computeSellTrade(input: {
  cashBefore: number;
  quote: number;
}): { commission: number; grossAmount: number; netAmount: number; cashAfter: number } {
  const grossAmount = input.quote;
  const commission = Number((grossAmount * SELL_COMMISSION_RATE).toFixed(2));
  const netAmount = Number((grossAmount - commission).toFixed(2));
  const cashAfter = Number((input.cashBefore + netAmount).toFixed(2));
  return { commission, grossAmount, netAmount, cashAfter };
}

export function rosterRoleCount(players: LocalRosterPlayer[]): Record<FavcRole, number> {
  const counts: Record<FavcRole, number> = { P: 0, D: 0, C: 0, A: 0 };
  for (const player of players) {
    counts[player.role] += 1;
  }
  return counts;
}
