/**
 * Calcoli puri per commissioni di acquisto, vendita e platform fee.
 * V1: acquisto 2%, vendita 2%, platform fee 10% delle commissioni.
 *
 * Queste funzioni sono indipendenti da TradingRules e dal motore di simulazione:
 * ricevono i tassi come parametri e restituiscono numeri. Possono essere usate
 * sia nei backtest sia nel backend NestJS senza dipendenze aggiuntive.
 */

// ─── Commissioni singola operazione ──────────────────────────────────────────

export function calculateBuyCommission(grossValue: number, rate: number): number {
  return grossValue * rate;
}

export function calculateSellCommission(grossValue: number, rate: number): number {
  return grossValue * rate;
}

// ─── Breakdown costo acquisto ─────────────────────────────────────────────────

export interface BuyCostResult {
  grossValue: number;
  commission: number;
  totalCost: number;
}

export function calculateBuyCost(grossValue: number, rate: number): BuyCostResult {
  const commission = calculateBuyCommission(grossValue, rate);
  return { grossValue, commission, totalCost: grossValue + commission };
}

// ─── Breakdown incasso vendita ────────────────────────────────────────────────

export interface SellProceedsResult {
  grossValue: number;
  commission: number;
  netProceeds: number;
}

export function calculateSellProceeds(grossValue: number, rate: number): SellProceedsResult {
  const commission = calculateSellCommission(grossValue, rate);
  return { grossValue, commission, netProceeds: grossValue - commission };
}

// ─── Platform fee ─────────────────────────────────────────────────────────────

/**
 * Calcola la quota piattaforma sulle commissioni totali.
 * V1: platformFeeRate = 0.10 (10% delle commissioni, non del montepremi totale).
 */
export function calculatePlatformFee(totalCommissions: number, feeRate: number): number {
  return totalCommissions * feeRate;
}
