import {
  BUY_COMMISSION_RATE,
  roleLimits,
  type DemoMarketPlayer,
  type FavcRole,
} from '../mock/favcDemoData';

export type RosterDraftSummary = {
  counts: Record<FavcRole, number>;
  initialCapital: number;
  playerCost: number;
  buyCommissions: number;
  totalCost: number;
  extraCapitalAdded: number;
  residualCash: number;
  rosterValue: number;
  duplicatePlayerIds: string[];
  exceededRoles: FavcRole[];
  isComplete: boolean;
  isValid: boolean;
  status: 'incompleta' | 'completa' | 'ruolo eccedente' | 'duplicato' | 'pronta per salvataggio';
};

export function buildRosterDraftSummary(players: DemoMarketPlayer[], initialCapital: number): RosterDraftSummary {
  const counts = { P: 0, D: 0, C: 0, A: 0 } as Record<FavcRole, number>;
  const seen = new Set<string>();
  const duplicatePlayerIds = new Set<string>();
  let playerCost = 0;
  let buyCommissions = 0;
  let residualCash = Math.max(0, initialCapital);
  let extraCapitalAdded = 0;

  for (const player of players) {
    counts[player.role] += 1;
    const key = player.playerId ?? player.id;
    if (seen.has(key)) duplicatePlayerIds.add(key);
    seen.add(key);

    const commission = player.quote * BUY_COMMISSION_RATE;
    const total = player.quote + commission;
    playerCost += player.quote;
    buyCommissions += commission;
    if (residualCash >= total) {
      residualCash -= total;
    } else {
      extraCapitalAdded += total - residualCash;
      residualCash = 0;
    }
  }

  const exceededRoles = (Object.keys(roleLimits) as FavcRole[]).filter(role => counts[role] > roleLimits[role]);
  const compositionComplete = (Object.keys(roleLimits) as FavcRole[]).every(role => counts[role] === roleLimits[role]);
  const isComplete = players.length === 25 && compositionComplete;
  const isValid = isComplete && duplicatePlayerIds.size === 0 && exceededRoles.length === 0;
  const status = duplicatePlayerIds.size > 0
    ? 'duplicato'
    : exceededRoles.length > 0
      ? 'ruolo eccedente'
      : isValid
        ? 'pronta per salvataggio'
        : 'incompleta';

  return {
    counts,
    initialCapital,
    playerCost,
    buyCommissions,
    totalCost: playerCost + buyCommissions,
    extraCapitalAdded,
    residualCash,
    rosterValue: playerCost,
    duplicatePlayerIds: Array.from(duplicatePlayerIds),
    exceededRoles,
    isComplete,
    isValid,
    status,
  };
}

export function canAddPlayerToDraft(player: DemoMarketPlayer, players: DemoMarketPlayer[]) {
  const summary = buildRosterDraftSummary(players, 0);
  const key = player.playerId ?? player.id;
  if (players.some(item => (item.playerId ?? item.id) === key)) {
    return { ok: false, reason: 'Giocatore gia selezionato.' };
  }
  if (players.length >= 25) {
    return { ok: false, reason: 'Rosa gia completa a 25 giocatori.' };
  }
  if (summary.counts[player.role] >= roleLimits[player.role]) {
    return { ok: false, reason: `Limite ruolo ${player.role} raggiunto.` };
  }
  return { ok: true };
}
