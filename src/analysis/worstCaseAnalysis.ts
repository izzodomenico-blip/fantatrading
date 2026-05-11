import { MonteCarloResult } from '../simulation/monteCarloSimulator';

export interface WorstCaseResult {
  /** Montepremi minimo osservato in tutte le simulazioni */
  worstPrizePool: number;
  /** Ricavo piattaforma minimo osservato */
  worstPlatformRevenue: number;
  /** Premio al vincitore nel peggior caso */
  worstWinnerPrize: number;
  /** Percentuale di simulazioni in cui il montepremi è sotto la soglia */
  pctBelowPrizePoolThreshold: number;
  /** Percentuale di simulazioni in cui la piattaforma è sotto i costi fissi */
  pctBelowFixedCosts: number;
  /** Value at Risk 5%: il montepremi è sopra questo valore nel 95% dei casi */
  var5PrizePool: number;
}

export function analyzeWorstCase(
  result: MonteCarloResult,
  minAcceptablePrizePool: number = 0,
  fixedCosts: number = 0,
): WorstCaseResult {
  const runs = result.runs;
  if (runs.length === 0) throw new Error('Nessuna simulazione disponibile');

  const pools = runs.map(r => r.prizePool).sort((a, b) => a - b);
  const platformRevs = runs.map(r => r.platformRevenue).sort((a, b) => a - b);
  const winnerPrizes = runs.map(r => r.ranking[0]?.prize ?? 0).sort((a, b) => a - b);

  const n = runs.length;
  const pctBelowPrizePool = (pools.filter(p => p < minAcceptablePrizePool).length / n) * 100;
  const pctBelowCosts = (platformRevs.filter(r => r < fixedCosts).length / n) * 100;
  const var5 = pools[Math.floor(n * 0.05)] ?? pools[0];

  return {
    worstPrizePool: pools[0],
    worstPlatformRevenue: platformRevs[0],
    worstWinnerPrize: winnerPrizes[0],
    pctBelowPrizePoolThreshold: pctBelowPrizePool,
    pctBelowFixedCosts: pctBelowCosts,
    var5PrizePool: var5,
  };
}
