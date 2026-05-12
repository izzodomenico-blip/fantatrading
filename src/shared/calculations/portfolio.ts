/**
 * Calcolo del valore totale del portafoglio.
 * Valore totale = somma dei sell value di tutte le posizioni + budget disponibile.
 */
export function calculatePortfolioValue(
  positionValues: number[],
  availableBudget: number,
): number {
  return positionValues.reduce((sum, v) => sum + v, 0) + availableBudget;
}
