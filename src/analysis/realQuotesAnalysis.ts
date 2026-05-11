import { NormalizedQuoteRow, SeasonStatus } from '../importers/realQuotesImporter';

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface SeasonStats {
  season: string;
  status: SeasonStatus;
  totalPlayers: number;
  avgInitialQuote: number;
  avgFinalQuote: number;
  avgReturnPct: number;
  medianReturnPct: number;
  pctPositive: number;
  pctAbove5: number;
  pctBelow0: number;
  avgReturnByRole: Record<string, number>;
  topGainer: NormalizedQuoteRow | null;
  topLoser: NormalizedQuoteRow | null;
}

export interface RoleStats {
  role: string;
  totalPlayers: number;
  avgReturnPct: number;
  pctPositive: number;
  avgInitialQuote: number;
  avgFinalQuote: number;
}

export interface HistoricalAnalysis {
  generatedAt: string;
  totalRows: number;
  seasons: string[];
  seasonStats: SeasonStats[];
  roleStats: RoleStats[];
  topGainers: NormalizedQuoteRow[];
  topLosers: NormalizedQuoteRow[];
  overallAvgReturnPct: number;
  overallPctPositive: number;
  overallPctAbove5: number;
}

// ─── Utility statistiche ──────────────────────────────────────────────────────

export function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Statistiche per stagione ─────────────────────────────────────────────────

export function computeSeasonStats(rows: NormalizedQuoteRow[]): SeasonStats {
  const season = rows[0]?.season ?? 'unknown';
  const status = rows[0]?.seasonStatus ?? 'completed';
  const returns = rows.map(r => r.quoteReturnPct);

  const avgReturnByRole: Record<string, number> = {};
  for (const role of ['P', 'D', 'C', 'A']) {
    const roleReturns = rows.filter(r => r.role === role).map(r => r.quoteReturnPct);
    avgReturnByRole[role] = avg(roleReturns);
  }

  const sorted = [...rows].sort((a, b) => b.quoteReturnPct - a.quoteReturnPct);

  return {
    season,
    status,
    totalPlayers: rows.length,
    avgInitialQuote: avg(rows.map(r => r.initialQuote)),
    avgFinalQuote: avg(rows.map(r => r.currentOrFinalQuote)),
    avgReturnPct: avg(returns),
    medianReturnPct: median(returns),
    pctPositive: returns.length > 0 ? returns.filter(r => r > 0).length / returns.length * 100 : 0,
    pctAbove5: returns.length > 0 ? returns.filter(r => r > 5).length / returns.length * 100 : 0,
    pctBelow0: returns.length > 0 ? returns.filter(r => r < 0).length / returns.length * 100 : 0,
    avgReturnByRole,
    topGainer: sorted[0] ?? null,
    topLoser: sorted[sorted.length - 1] ?? null,
  };
}

// ─── Statistiche per ruolo (aggregato su tutte le stagioni) ───────────────────

export function computeRoleStats(rows: NormalizedQuoteRow[]): RoleStats[] {
  return ['P', 'D', 'C', 'A'].map(role => {
    const roleRows = rows.filter(r => r.role === role);
    const returns = roleRows.map(r => r.quoteReturnPct);
    return {
      role,
      totalPlayers: roleRows.length,
      avgReturnPct: avg(returns),
      pctPositive: returns.length > 0 ? returns.filter(r => r > 0).length / returns.length * 100 : 0,
      avgInitialQuote: avg(roleRows.map(r => r.initialQuote)),
      avgFinalQuote: avg(roleRows.map(r => r.currentOrFinalQuote)),
    };
  });
}

// ─── Analisi storica completa ─────────────────────────────────────────────────

export function analyzeHistory(rows: NormalizedQuoteRow[]): HistoricalAnalysis {
  const seasons = [...new Set(rows.map(r => r.season))].sort();
  const seasonStats = seasons.map(s =>
    computeSeasonStats(rows.filter(r => r.season === s))
  );

  const allReturns = rows.map(r => r.quoteReturnPct);
  const sorted = [...rows].sort((a, b) => b.quoteReturnPct - a.quoteReturnPct);

  return {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    seasons,
    seasonStats,
    roleStats: computeRoleStats(rows),
    topGainers: sorted.slice(0, 20),
    topLosers: sorted.slice(-20).reverse(),
    overallAvgReturnPct: avg(allReturns),
    overallPctPositive: allReturns.length > 0
      ? allReturns.filter(r => r > 0).length / allReturns.length * 100 : 0,
    overallPctAbove5: allReturns.length > 0
      ? allReturns.filter(r => r > 5).length / allReturns.length * 100 : 0,
  };
}
