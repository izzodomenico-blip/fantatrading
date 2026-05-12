/**
 * Calcolo ROI e soglie di premiazione V1.
 *
 * ROI = (valoreTotalePortafoglio − budgetIniziale) / budgetIniziale × 100
 *
 * Soglie V1:
 *   - sopravvivenza: ROI ≥ 0%
 *   - premio:        ROI ≥ 7%
 */

/**
 * Calcola il ROI corrente del partecipante.
 *
 * @param portfolioValue   Valore corrente di tutte le posizioni aperte (sell value).
 * @param availableBudget  Budget liquido disponibile (crediti non investiti).
 * @param initialBudget    Budget iniziale assegnato all'inizio della stagione.
 * @returns                ROI in punti percentuali. Es: 4.5 = +4.5%.
 */
export function calculateROI(
  portfolioValue: number,
  availableBudget: number,
  initialBudget: number,
): number {
  if (initialBudget <= 0) return 0;
  const totalWealth = portfolioValue + availableBudget;
  return ((totalWealth - initialBudget) / initialBudget) * 100;
}

/**
 * Determina se il ROI supera la soglia premio.
 *
 * @param roi              ROI corrente in punti percentuali.
 * @param prizeThreshold   Soglia in punti percentuali (V1: 7).
 * @returns                true se il partecipante ha diritto al premio.
 */
export function calculatePrizeEligibility(
  roi: number,
  prizeThreshold: number,
): boolean {
  return roi >= prizeThreshold;
}
