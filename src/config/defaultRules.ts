export interface TradingRules {
  /** Commissione percentuale applicata al lordo di ogni acquisto (es. 0.10 = 10%) */
  buyCommissionRate: number;
  /** Commissione percentuale applicata al lordo di ogni vendita (es. 0.10 = 10%) */
  sellCommissionRate: number;
  /** Numero massimo di calciatori nel portfolio di una squadra */
  maxPlayersPerPortfolio: number;
  /** Budget iniziale in crediti assegnato a ogni squadra */
  initialBudget: number;
  /** Budget minimo che una squadra deve sempre mantenere */
  minBudgetReserve: number;
  /** Valore minimo consentito per un calciatore */
  playerMinValue: number;
  /** Valore massimo consentito per un calciatore */
  playerMaxValue: number;
  /** Numero di giornate per stagione */
  roundsPerSeason: number;
  /** Quota delle commissioni destinate al montepremi (deve sommare 1 con platformFeeRate) */
  prizePoolContributionRate: number;
  /** Quota delle commissioni trattenuta dalla piattaforma */
  platformFeeRate: number;
}

export const DEFAULT_RULES: TradingRules = {
  buyCommissionRate: 0.10,
  sellCommissionRate: 0.10,
  maxPlayersPerPortfolio: 25,
  initialBudget: 500,
  minBudgetReserve: 0,
  playerMinValue: 1,
  playerMaxValue: 200,
  roundsPerSeason: 38,
  prizePoolContributionRate: 0.80,
  platformFeeRate: 0.20,
};

export function validateRules(rules: TradingRules): string[] {
  const errors: string[] = [];

  if (rules.buyCommissionRate < 0 || rules.buyCommissionRate > 1)
    errors.push('buyCommissionRate deve essere tra 0 e 1');
  if (rules.sellCommissionRate < 0 || rules.sellCommissionRate > 1)
    errors.push('sellCommissionRate deve essere tra 0 e 1');
  if (Math.abs(rules.prizePoolContributionRate + rules.platformFeeRate - 1) > 1e-9)
    errors.push('prizePoolContributionRate + platformFeeRate deve essere uguale a 1');
  if (rules.initialBudget <= 0)
    errors.push('initialBudget deve essere positivo');
  if (rules.roundsPerSeason <= 0)
    errors.push('roundsPerSeason deve essere positivo');
  if (rules.playerMinValue < 0)
    errors.push('playerMinValue non può essere negativo');
  if (rules.playerMaxValue <= rules.playerMinValue)
    errors.push('playerMaxValue deve essere maggiore di playerMinValue');

  return errors;
}
