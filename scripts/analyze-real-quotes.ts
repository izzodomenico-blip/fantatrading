import * as fs from 'fs';
import * as path from 'path';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import {
  analyzeHistory,
  RoleStats,
  HistoricalAnalysis,
} from '../src/analysis/realQuotesAnalysis';

const OUT_DIR = path.resolve(__dirname, '../data/real/processed');
const REPORT_DIR = path.resolve(__dirname, '../reports/real-data');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fmt(n: number, d = 1): string {
  return n.toFixed(d);
}

function roleReturnCsv(roleStats: RoleStats[]): string {
  const headers = ['role', 'totalPlayers', 'avgReturnPct', 'pctPositive', 'avgInitialQuote', 'avgFinalQuote'];
  const lines = [headers.join(',')];
  for (const r of roleStats) {
    lines.push([
      r.role, r.totalPlayers,
      r.avgReturnPct.toFixed(2),
      r.pctPositive.toFixed(1),
      r.avgInitialQuote.toFixed(1),
      r.avgFinalQuote.toFixed(1),
    ].join(','));
  }
  return lines.join('\n');
}

function buildMarkdown(a: HistoricalAnalysis): string {
  const lines: string[] = [];

  lines.push('# Analisi Storica Quotazioni Fantacalcio');
  lines.push('');
  lines.push(`*Generato: ${a.generatedAt}*`);
  lines.push(`*Stagioni: ${a.seasons.join(', ')}*`);
  lines.push(`*Giocatori-stagione totali: ${a.totalRows.toLocaleString('it-IT')}*`);
  lines.push('');

  lines.push('## Sintesi Globale');
  lines.push('');
  lines.push('| Metrica | Valore |');
  lines.push('|---------|--------|');
  lines.push(`| Rendimento medio storico | ${fmt(a.overallAvgReturnPct)}% |`);
  lines.push(`| % giocatori rivalutati (Δ > 0) | ${fmt(a.overallPctPositive)}% |`);
  lines.push(`| % giocatori rivalutati > 5% | ${fmt(a.overallPctAbove5)}% |`);
  lines.push('');

  lines.push('## Rendimento per Stagione');
  lines.push('');
  lines.push('| Stagione | Status | N | Rend.Medio | Mediana | % Pos. | % >5% | % <0% |');
  lines.push('|----------|--------|---|-----------|---------|--------|-------|-------|');
  for (const s of a.seasonStats) {
    lines.push(`| ${s.season} | ${s.status} | ${s.totalPlayers} | ${fmt(s.avgReturnPct)}% | ${fmt(s.medianReturnPct)}% | ${fmt(s.pctPositive)}% | ${fmt(s.pctAbove5)}% | ${fmt(s.pctBelow0)}% |`);
  }
  lines.push('');

  lines.push('## Rendimento Medio per Stagione e per Ruolo');
  lines.push('');
  lines.push('| Stagione | P | D | C | A |');
  lines.push('|----------|---|---|---|---|');
  for (const s of a.seasonStats) {
    const rb = s.avgReturnByRole;
    lines.push(`| ${s.season} | ${fmt(rb['P'] ?? 0)}% | ${fmt(rb['D'] ?? 0)}% | ${fmt(rb['C'] ?? 0)}% | ${fmt(rb['A'] ?? 0)}% |`);
  }
  lines.push('');

  lines.push('## Rendimento Aggregato per Ruolo (tutte le stagioni)');
  lines.push('');
  lines.push('| Ruolo | N | Rend.Medio | % Rivalutati | Qt.Iniziale Media | Qt.Finale Media |');
  lines.push('|-------|---|-----------|-------------|-------------------|-----------------|');
  for (const r of a.roleStats) {
    lines.push(`| ${r.role} | ${r.totalPlayers} | ${fmt(r.avgReturnPct)}% | ${fmt(r.pctPositive)}% | ${fmt(r.avgInitialQuote)} | ${fmt(r.avgFinalQuote)} |`);
  }
  lines.push('');

  lines.push('## Top 20 Rivalutazioni');
  lines.push('');
  lines.push('| # | Giocatore | R | Club | Stagione | Qt.I | Qt.A | Δ% |');
  lines.push('|---|-----------|---|------|----------|------|------|----|');
  a.topGainers.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.playerName} | ${r.role} | ${r.club} | ${r.season} | ${r.initialQuote} | ${r.currentOrFinalQuote} | +${fmt(r.quoteReturnPct)}% |`);
  });
  lines.push('');

  lines.push('## Top 20 Svalutazioni');
  lines.push('');
  lines.push('| # | Giocatore | R | Club | Stagione | Qt.I | Qt.A | Δ% |');
  lines.push('|---|-----------|---|------|----------|------|------|----|');
  a.topLosers.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.playerName} | ${r.role} | ${r.club} | ${r.season} | ${r.initialQuote} | ${r.currentOrFinalQuote} | ${fmt(r.quoteReturnPct)}% |`);
  });
  lines.push('');

  return lines.join('\n');
}

function main(): void {
  console.log('── FantaTrading: Analisi Storica Quotazioni ───────────────────────');

  const jsonPath = path.join(OUT_DIR, 'fantacalcio_quotes_history.json');
  if (!fs.existsSync(jsonPath)) {
    console.log(`\nFile dati non trovato: ${jsonPath}`);
    console.log('Esegui prima: npm run import:real-quotes\n');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const rows: NormalizedQuoteRow[] = raw.rows ?? [];

  if (rows.length === 0) {
    console.log('\nNessun dato da analizzare. Importa prima i file Excel delle quotazioni.\n');
    return;
  }

  console.log(`\nRighe caricate: ${rows.length}`);

  const analysis = analyzeHistory(rows);

  ensureDir(REPORT_DIR);
  ensureDir(OUT_DIR);

  const roleReturnPath = path.join(OUT_DIR, 'role_return_summary.csv');
  fs.writeFileSync(roleReturnPath, roleReturnCsv(analysis.roleStats), 'utf-8');

  const reportPath = path.join(REPORT_DIR, 'historical_quotes_analysis.md');
  fs.writeFileSync(reportPath, buildMarkdown(analysis), 'utf-8');

  console.log(`\nOutput generati:`);
  console.log(`  ${roleReturnPath}`);
  console.log(`  ${reportPath}`);

  // Sintesi console
  console.log('\n── Sintesi ─────────────────────────────────────────────────────────');
  console.log(`Stagioni analizzate: ${analysis.seasons.join(', ')}`);
  console.log(`Rendimento medio: ${fmt(analysis.overallAvgReturnPct)}%`);
  console.log(`% rivalutati: ${fmt(analysis.overallPctPositive)}%`);
  console.log(`% rivalutati >5%: ${fmt(analysis.overallPctAbove5)}%`);

  console.log('\nPer stagione:');
  for (const s of analysis.seasonStats) {
    console.log(`  ${s.season} [${s.status}]: N=${s.totalPlayers}, medio=${fmt(s.avgReturnPct)}%, mediana=${fmt(s.medianReturnPct)}%, %pos=${fmt(s.pctPositive)}%`);
  }

  console.log('\nPer ruolo (aggregato):');
  for (const r of analysis.roleStats) {
    if (r.totalPlayers > 0)
      console.log(`  ${r.role}: N=${r.totalPlayers}, medio=${fmt(r.avgReturnPct)}%, %pos=${fmt(r.pctPositive)}%`);
  }

  if (analysis.topGainers.length > 0) {
    const g = analysis.topGainers[0];
    console.log(`\nMassima rivalutazione: ${g.playerName} (${g.role}, ${g.club}, ${g.season}): +${fmt(g.quoteReturnPct)}%`);
  }
  if (analysis.topLosers.length > 0) {
    const l = analysis.topLosers[0];
    console.log(`Massima svalutazione:  ${l.playerName} (${l.role}, ${l.club}, ${l.season}): ${fmt(l.quoteReturnPct)}%\n`);
  }
}

main();
