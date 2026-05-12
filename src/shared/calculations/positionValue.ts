/**
 * Formula FantaTrading per il valore corrente di una posizione.
 *
 * Regola fondamentale V1:
 *   +1 punto di variazione quotazione = +5% del valore del giocatore.
 *
 * Formula:
 *   returnPct = (Qt.corrente − Qt.I) × 5
 *   sellValue  = max(0, Qt.I × fantasyMultiplier × (1 + returnPct / 100))
 *
 * Floor a zero: il valore non può diventare negativo (perdita massima −100%).
 *
 * Attenzione: Qt.I = 1 → Qt.corrente = 2 produce +5%, NON +100%.
 * La formula è lineare sul delta di punti, non sul rapporto percentuale classico.
 */

/**
 * Calcola il rendimento percentuale da variazione quotazione.
 * @param qtI  Quotazione iniziale del giocatore.
 * @param qtA  Quotazione corrente (o finale).
 * @returns    Rendimento in punti percentuali. Es: +1 punto → +5%.
 */
export function calculateQuoteStepReturn(qtI: number, qtA: number): number {
  return (qtA - qtI) * 5;
}

/**
 * Calcola il valore corrente (sell value) di una posizione.
 *
 * @param initialQuote     Quotazione al momento dell'acquisto (Qt.I).
 * @param currentQuote     Quotazione corrente del giocatore.
 * @param fantasyMultiplier  Moltiplicatore composto dei bonus/malus accumulati giornata per giornata.
 *                           Default 1.0 (nessun bonus/malus).
 * @returns                Valore corrente della posizione, floor a zero.
 */
export function calculatePositionValue(
  initialQuote: number,
  currentQuote: number,
  fantasyMultiplier: number,
): number {
  const tradingReturnPct = calculateQuoteStepReturn(initialQuote, currentQuote);
  return Math.max(0, initialQuote * fantasyMultiplier * (1 + tradingReturnPct / 100));
}
