import {
  BUY_COMMISSION_RATE,
  SELL_COMMISSION_RATE,
  calculatePositionValue,
  roleLimits,
  type DemoMarketPlayer,
  type DemoPosition,
  type FavcRole,
} from '../mock/favcDemoData';

export type BuyConfirmation = {
  grossAmount: number;
  commissionAmount: number;
  totalCost: number;
  cashAvailable: number;
  capitalAdded: number;
  totalCapitalAfter: number;
  isDuplicate: boolean;
  isRosterFull: boolean;
  isRoleFull: boolean;
  canConfirm: boolean;
  blockingReason?: string;
};

export type SellConfirmation = {
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  cashBefore: number;
  cashAfter: number;
  roleCountAfterSell: number;
  leavesRoleShort: boolean;
};

export function countActiveByRole(positions: DemoPosition[]) {
  return positions
    .filter(position => position.status === 'ACTIVE')
    .reduce(
      (counts, position) => ({ ...counts, [position.role]: counts[position.role] + 1 }),
      { P: 0, D: 0, C: 0, A: 0 } as Record<FavcRole, number>,
    );
}

export function buildBuyConfirmation(
  player: DemoMarketPlayer,
  positions: DemoPosition[],
  virtualCashBalance: number,
  totalCapitalDeposited: number,
): BuyConfirmation {
  const activePositions = positions.filter(position => position.status === 'ACTIVE');
  const counts = countActiveByRole(positions);
  const grossAmount = player.quote;
  const commissionAmount = grossAmount * BUY_COMMISSION_RATE;
  const totalCost = grossAmount + commissionAmount;
  const capitalAdded = Math.max(0, totalCost - virtualCashBalance);
  const isDuplicate = activePositions.some(position => position.playerId === player.playerId || position.id === player.id);
  const isRosterFull = activePositions.length >= 25;
  const isRoleFull = counts[player.role] >= roleLimits[player.role];
  const blockingReason = isDuplicate
    ? 'Giocatore gia presente nella rosa attiva.'
    : isRosterFull
      ? 'Rosa piena: vendi un giocatore prima di comprare.'
      : isRoleFull
        ? `${roleLimits[player.role]} ${player.role} gia in rosa: vendi un giocatore dello stesso ruolo.`
        : undefined;

  return {
    grossAmount,
    commissionAmount,
    totalCost,
    cashAvailable: virtualCashBalance,
    capitalAdded,
    totalCapitalAfter: totalCapitalDeposited + capitalAdded,
    isDuplicate,
    isRosterFull,
    isRoleFull,
    canConfirm: !blockingReason,
    blockingReason,
  };
}

export function buildSellConfirmation(
  position: DemoPosition,
  positions: DemoPosition[],
  virtualCashBalance: number,
): SellConfirmation {
  const grossAmount = calculatePositionValue(position);
  const commissionAmount = grossAmount * SELL_COMMISSION_RATE;
  const netAmount = grossAmount - commissionAmount;
  const counts = countActiveByRole(positions);
  const roleCountAfterSell = Math.max(0, counts[position.role] - 1);

  return {
    grossAmount,
    commissionAmount,
    netAmount,
    cashBefore: virtualCashBalance,
    cashAfter: virtualCashBalance + netAmount,
    roleCountAfterSell,
    leavesRoleShort: roleCountAfterSell < roleLimits[position.role],
  };
}
