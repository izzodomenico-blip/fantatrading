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
 * Calcola il valore netto liquidabile del portafoglio applicando la commissione di vendita.
 *
 * @param portfolioValue      Valore lordo corrente di tutte le posizioni aperte.
 * @param sellCommissionRate  Tasso commissione vendita (es. 0.02 = 2%).
 * @returns                   Valore netto incassabile vendendo tutte le posizioni.
 */
export function calculateNetLiquidationValue(
  portfolioValue: number,
  sellCommissionRate: number,
): number {
  return portfolioValue * (1 - sellCommissionRate);
}

/**
 * Calcola il ROI per il modello FREE_ACCESS_VARIABLE_CAPITAL.
 *
 * Formula:
 *   ROI = (netLiquidationValue + virtualCashBalance − totalCapitalDeposited)
 *         / totalCapitalDeposited × 100
 *
 * Regola: nessun doppio conteggio.
 * Se totalCapitalDeposited = 285 e (netLiquidationValue + virtualCashBalance) = 310:
 *   ROI = 25 / 285 × 100 = 8.77%
 *
 * @param netLiquidationValue    Valore netto della rosa venduta (dopo commissioni vendita).
 * @param virtualCashBalance     Cash disponibile (budget non investito + proventi vendite).
 * @param totalCapitalDeposited  Totale capitale versato dall'utente dall'inizio della stagione.
 * @returns                      ROI in punti percentuali.
 */
export function calculateVariableCapitalROI(
  netLiquidationValue: number,
  virtualCashBalance: number,
  totalCapitalDeposited: number,
): number {
  if (totalCapitalDeposited <= 0) return 0;
  const totalFinalValue = netLiquidationValue + virtualCashBalance;
  return ((totalFinalValue - totalCapitalDeposited) / totalCapitalDeposited) * 100;
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
