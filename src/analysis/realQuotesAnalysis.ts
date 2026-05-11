import { NormalizedQuoteRow, SeasonStatus } from '../importers/realQuotesImporter';

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface SeasonStats {
  season: string;
  status: SeasonStatus;
  totalPlayers: number;
  avgInitialQuote: number;
  avgFinalQuote: number;
  // ── Rendimento statistico classico: (Qt.A − Qt.I) / Qt.I × 100 ─────────────
  avgReturnPct: number;
  medianReturnPct: number;
  pctPositive: number;
  pctAbove5: number;
  pctBelow0: number;
  avgReturnByRole: Record<string, number>;
  // ── Rendimento FantaTrading: (Qt.A − Qt.I) × 5 — 1 punto = 5% ─────────────
  avgTradingReturnPct: number;
  medianTradingReturnPct: number;
  pctPositiveTrading: number;
  pctAbove5Trading: number;
  pctBelow0Trading: number;
  avgTradingReturnByRole: Record<string, number>;
  topGainer: NormalizedQuoteRow | null;
  topLoser: NormalizedQuoteRow | null;
}

export interface RoleStats {
  role: string;
  totalPlayers: number;
  avgReturnPct: number;
  avgTradingReturnPct: number;
  pctPositive: number;
  pctPositiveTrading: number;
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
  // ── Statistiche aggregate ──────────────────────────────────────────────────
  overallAvgReturnPct: number;
  overallPctPositive: number;
  overallPctAbove5: number;
  overallAvgTradingReturnPct: number;
  overallPctPositiveTrading: number;
  overallPctAbove5Trading: number;
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

function pctOf(values: number[], pred: (v: number) => boolean): number {
  return values.length === 0 ? 0 : values.filter(pred).length / values.length * 100;
}

// ─── Statistiche per stagione ─────────────────────────────────────────────────

export function computeSeasonStats(rows: NormalizedQuoteRow[]): SeasonStats {
  const season = rows[0]?.season ?? 'unknown';
  const status = rows[0]?.seasonStatus ?? 'completed';
  const rawReturns = rows.map(r => r.quoteRawReturnPct);
  const tradingReturns = rows.map(r => r.quoteTradingReturnPct);

  const avgReturnByRole: Record<string, number> = {};
  const avgTradingReturnByRole: Record<string, number> = {};
  for (const role of ['P', 'D', 'C', 'A']) {
    const roleRows = rows.filter(r => r.role === role);
    avgReturnByRole[role] = avg(roleRows.map(r => r.quoteRawReturnPct));
    avgTradingReturnByRole[role] = avg(roleRows.map(r => r.quoteTradingReturnPct));
  }

  const sorted = [...rows].sort((a, b) => b.quoteRawReturnPct - a.quoteRawReturnPct);

  return {
    season, status,
    totalPlayers: rows.length,
    avgInitialQuote: avg(rows.map(r => r.initialQuote)),
    avgFinalQuote: avg(rows.map(r => r.currentOrFinalQuote)),
    avgReturnPct: avg(rawReturns),
    medianReturnPct: median(rawReturns),
    pctPositive: pctOf(rawReturns, r => r > 0),
    pctAbove5: pctOf(rawReturns, r => r > 5),
    pctBelow0: pctOf(rawReturns, r => r < 0),
    avgReturnByRole,
    avgTradingReturnPct: avg(tradingReturns),
    medianTradingReturnPct: median(tradingReturns),
    pctPositiveTrading: pctOf(tradingReturns, r => r > 0),
    pctAbove5Trading: pctOf(tradingReturns, r => r > 5),
    pctBelow0Trading: pctOf(tradingReturns, r => r < 0),
    avgTradingReturnByRole,
    topGainer: sorted[0] ?? null,
    topLoser: sorted[sorted.length - 1] ?? null,
  };
}

// ─── Statistiche per ruolo (aggregato su tutte le stagioni) ───────────────────

export function computeRoleStats(rows: NormalizedQuoteRow[]): RoleStats[] {
  return ['P', 'D', 'C', 'A'].map(role => {
    const roleRows = rows.filter(r => r.role === role);
    const rawReturns = roleRows.map(r => r.quoteRawReturnPct);
    const tradingReturns = roleRows.map(r => r.quoteTradingReturnPct);
    return {
      role,
      totalPlayers: roleRows.length,
      avgReturnPct: avg(rawReturns),
      avgTradingReturnPct: avg(tradingReturns),
      pctPositive: pctOf(rawReturns, r => r > 0),
      pctPositiveTrading: pctOf(tradingReturns, r => r > 0),
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

  const rawReturns = rows.map(r => r.quoteRawReturnPct);
  const tradingReturns = rows.map(r => r.quoteTradingReturnPct);
  const sorted = [...rows].sort((a, b) => b.quoteRawReturnPct - a.quoteRawReturnPct);

  return {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    seasons, seasonStats,
    roleStats: computeRoleStats(rows),
    topGainers: sorted.slice(0, 20),
    topLosers: sorted.slice(-20).reverse(),
    overallAvgReturnPct: avg(rawReturns),
    overallPctPositive: pctOf(rawReturns, r => r > 0),
    overallPctAbove5: pctOf(rawReturns, r => r > 5),
    overallAvgTradingReturnPct: avg(tradingReturns),
    overallPctPositiveTrading: pctOf(tradingReturns, r => r > 0),
    overallPctAbove5Trading: pctOf(tradingReturns, r => r > 5),
  };
}
