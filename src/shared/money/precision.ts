/**
 * Utilità di precisione numerica per valori monetari.
 *
 * I valori monetari in FantaTrading devono usare arrotondamento esplicito
 * per evitare drift da floating-point su operazioni cumulative (38 giornate).
 * In produzione, il database usa NUMERIC(15,6): la precisione a 6 decimali
 * è il riferimento canonico per crediti e commissioni.
 */

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Arrotonda a 2 decimali (es. display prezzi all'utente). */
export const roundTo2 = (v: number): number => roundTo(v, 2);

/** Arrotonda a 4 decimali (es. quotazioni). */
export const roundTo4 = (v: number): number => roundTo(v, 4);

/** Arrotonda a 6 decimali (es. valori monetari, commissioni, ROI — allineato con NUMERIC(15,6) su DB). */
export const roundTo6 = (v: number): number => roundTo(v, 6);
