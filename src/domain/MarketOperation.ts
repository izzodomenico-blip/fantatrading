export type OperationType = 'BUY' | 'SELL';

export interface MarketOperation {
  id: string;
  teamId: string;
  playerId: string;
  type: OperationType;
  shares: number;
  pricePerShare: number;
  grossAmount: number;
  commission: number;
  netAmount: number;
  roundNumber: number;
  timestamp: Date;
}

export function createOperationId(teamId: string, roundNumber: number, index: number): string {
  return `${teamId}_r${roundNumber}_op${index}`;
}
