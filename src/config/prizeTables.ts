export interface PrizeDistribution {
  rank: number;
  percentageOfPool: number;
  label: string;
}

/** Distribuzione standard per leghe di qualsiasi dimensione (top 6) */
export const DEFAULT_PRIZE_TABLE: PrizeDistribution[] = [
  { rank: 1, percentageOfPool: 0.40, label: '1° posto' },
  { rank: 2, percentageOfPool: 0.25, label: '2° posto' },
  { rank: 3, percentageOfPool: 0.15, label: '3° posto' },
  { rank: 4, percentageOfPool: 0.10, label: '4° posto' },
  { rank: 5, percentageOfPool: 0.06, label: '5° posto' },
  { rank: 6, percentageOfPool: 0.04, label: '6° posto' },
];

/** Distribuzione per leghe piccole (top 3) */
export const SMALL_LEAGUE_PRIZE_TABLE: PrizeDistribution[] = [
  { rank: 1, percentageOfPool: 0.60, label: '1° posto' },
  { rank: 2, percentageOfPool: 0.30, label: '2° posto' },
  { rank: 3, percentageOfPool: 0.10, label: '3° posto' },
];

/** Distribuzione winner-takes-all */
export const WINNER_TAKES_ALL_TABLE: PrizeDistribution[] = [
  { rank: 1, percentageOfPool: 1.00, label: '1° posto' },
];

export function validatePrizeTable(table: PrizeDistribution[]): string[] {
  const errors: string[] = [];
  const total = table.reduce((sum, e) => sum + e.percentageOfPool, 0);

  if (Math.abs(total - 1.0) > 1e-9)
    errors.push(`La somma delle percentuali deve essere 1, trovato: ${total.toFixed(4)}`);

  const ranks = table.map(e => e.rank);
  const uniqueRanks = new Set(ranks);
  if (ranks.length !== uniqueRanks.size)
    errors.push('Ci sono rank duplicati nella tabella premi');

  table.forEach(e => {
    if (e.percentageOfPool < 0)
      errors.push(`percentageOfPool non può essere negativo per rank ${e.rank}`);
  });

  return errors;
}
