export interface TradingRules {
  /** Commissione percentuale applicata al lordo di ogni acquisto (es. 0.02 = 2%) */
  buyCommissionRate: number;
  /** Commissione percentuale applicata al lordo di ogni vendita (es. 0.0125 = 1.25%) */
  sellCommissionRate: number;
  /** Numero massimo di calciatori distinti nel portfolio di una squadra */
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
  /**
   * Velocità di mean-reversion del valore del calciatore verso il suo baseValue ogni giornata.
   * 0 = random walk puro; 0.05 = 5% pull verso baseValue a ogni round.
   * Valori tipici: 0.02–0.10.
   */
  meanReversionRate: number;
  /** Numero massimo di calciatori distinti per ruolo che una squadra può detenere */
  rosterComposition: { GK: number; DEF: number; MID: number; FWD: number };
}

/** Parametri del regolamento FantaTrading originale (Modello M1 — nessun margine piattaforma) */
export const DEFAULT_RULES: TradingRules = {
  buyCommissionRate: 0.02,
  sellCommissionRate: 0.0125,
  maxPlayersPerPortfolio: 25,
  initialBudget: 500,
  minBudgetReserve: 0,
  playerMinValue: 1,
  playerMaxValue: 200,
  roundsPerSeason: 38,
  prizePoolContributionRate: 1.0,
  platformFeeRate: 0.0,
  meanReversionRate: 0.05,
  rosterComposition: { GK: 3, DEF: 8, MID: 8, FWD: 6 },
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
  const rc = rules.rosterComposition;
  if (rc.GK < 0 || rc.DEF < 0 || rc.MID < 0 || rc.FWD < 0)
    errors.push('rosterComposition: tutti i valori per ruolo devono essere >= 0');
  if (rc.GK + rc.DEF + rc.MID + rc.FWD !== rules.maxPlayersPerPortfolio)
    errors.push('rosterComposition: la somma dei ruoli deve essere uguale a maxPlayersPerPortfolio');

  return errors;
}
