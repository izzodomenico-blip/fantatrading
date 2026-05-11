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
  const headers = [
    'role', 'totalPlayers',
    'avgRawReturnPct', 'pctPositiveRaw',
    'avgTradingReturnPct', 'pctPositiveTrading',
    'avgInitialQuote', 'avgFinalQuote',
  ];
  const lines = [headers.join(',')];
  for (const r of roleStats) {
    lines.push([
      r.role, r.totalPlayers,
      r.avgReturnPct.toFixed(2),
      r.pctPositive.toFixed(1),
      r.avgTradingReturnPct.toFixed(2),
      r.pctPositiveTrading.toFixed(1),
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

  // ── Nota metodologica ──────────────────────────────────────────────────────
  lines.push('## Nota sulle Metriche di Rendimento');
  lines.push('');
  lines.push('Questo report distingue **due metriche di rendimento** con scopi diversi:');
  lines.push('');
  lines.push('### Rendimento Statistico Grezzo (RSG)');
  lines.push('Formula classica: `(Qt.A − Qt.I) / Qt.I × 100`');
  lines.push('');
  lines.push('Misura la variazione percentuale della quotazione rispetto al valore iniziale.');
  lines.push('Utile per confronti statistici ma **non usata nel gioco FantaTrading**.');
  lines.push('');
  lines.push('Esempi:');
  lines.push('- Qt.I 20 → Qt.A 25: RSG = (25−20)/20×100 = **+25%**');
  lines.push('- Qt.I 1 → Qt.A 2:   RSG = (2−1)/1×100 = **+100%** ← distorto per quotazioni basse');
  lines.push('');
  lines.push('### Rendimento FantaTrading (RFT)');
  lines.push('Formula FantaTrading: `(Qt.A − Qt.I) × 5`');
  lines.push('');
  lines.push('**Ogni variazione di 1 punto quotazione = 5% del valore dell\'azione.**');
  lines.push('Questo è il rendimento che conta per il gioco FantaTrading.');
  lines.push('');
  lines.push('Esempi:');
  lines.push('- Qt.I 34 → Qt.A 35: RFT = (35−34)×5 = **+5%**');
  lines.push('- Qt.I 34 → Qt.A 33: RFT = (33−34)×5 = **−5%**');
  lines.push('- Qt.I 1  → Qt.A 2:  RFT = (2−1)×5 = **+5%** ← corretto, non +100%');
  lines.push('- Qt.I 1  → Qt.A 3:  RFT = (3−1)×5 = **+10%**');
  lines.push('- Qt.I 20 → Qt.A 25: RFT = (25−20)×5 = **+25%**');
  lines.push('');

  // ── Sintesi Globale ────────────────────────────────────────────────────────
  lines.push('## Sintesi Globale');
  lines.push('');
  lines.push('| Metrica | Statistico Grezzo | FantaTrading |');
  lines.push('|---------|-------------------|--------------|');
  lines.push(`| Rendimento medio storico | ${fmt(a.overallAvgReturnPct)}% | ${fmt(a.overallAvgTradingReturnPct)}% |`);
  lines.push(`| % giocatori rivalutati (Δ > 0) | ${fmt(a.overallPctPositive)}% | ${fmt(a.overallPctPositiveTrading)}% |`);
  lines.push(`| % giocatori rivalutati > 5% | ${fmt(a.overallPctAbove5)}% | ${fmt(a.overallPctAbove5Trading)}% |`);
  lines.push('');

  // ── Rendimento per Stagione (grezzo) ────────────────────────────────────────
  lines.push('## Rendimento Statistico Grezzo per Stagione');
  lines.push('');
  lines.push('| Stagione | Status | N | Rend.Medio | Mediana | % Pos. | % >5% | % <0% |');
  lines.push('|----------|--------|---|-----------|---------|--------|-------|-------|');
  for (const s of a.seasonStats) {
    lines.push(`| ${s.season} | ${s.status} | ${s.totalPlayers} | ${fmt(s.avgReturnPct)}% | ${fmt(s.medianReturnPct)}% | ${fmt(s.pctPositive)}% | ${fmt(s.pctAbove5)}% | ${fmt(s.pctBelow0)}% |`);
  }
  lines.push('');

  // ── Rendimento per Stagione (FantaTrading) ──────────────────────────────────
  lines.push('## Rendimento FantaTrading per Stagione');
  lines.push('');
  lines.push('> Formula: (Qt.A − Qt.I) × 5 — ogni punto quotazione = 5%');
  lines.push('');
  lines.push('| Stagione | Status | N | Rend.Medio | Mediana | % Pos. | % >5% | % <0% |');
  lines.push('|----------|--------|---|-----------|---------|--------|-------|-------|');
  for (const s of a.seasonStats) {
    lines.push(`| ${s.season} | ${s.status} | ${s.totalPlayers} | ${fmt(s.avgTradingReturnPct)}% | ${fmt(s.medianTradingReturnPct)}% | ${fmt(s.pctPositiveTrading)}% | ${fmt(s.pctAbove5Trading)}% | ${fmt(s.pctBelow0Trading)}% |`);
  }
  lines.push('');

  // ── Rendimento per ruolo e stagione (grezzo) ────────────────────────────────
  lines.push('## Rendimento Statistico Grezzo per Stagione e per Ruolo');
  lines.push('');
  lines.push('| Stagione | P | D | C | A |');
  lines.push('|----------|---|---|---|---|');
  for (const s of a.seasonStats) {
    const rb = s.avgReturnByRole;
    lines.push(`| ${s.season} | ${fmt(rb['P'] ?? 0)}% | ${fmt(rb['D'] ?? 0)}% | ${fmt(rb['C'] ?? 0)}% | ${fmt(rb['A'] ?? 0)}% |`);
  }
  lines.push('');

  // ── Rendimento per ruolo e stagione (FantaTrading) ──────────────────────────
  lines.push('## Rendimento FantaTrading per Stagione e per Ruolo');
  lines.push('');
  lines.push('| Stagione | P | D | C | A |');
  lines.push('|----------|---|---|---|---|');
  for (const s of a.seasonStats) {
    const rb = s.avgTradingReturnByRole;
    lines.push(`| ${s.season} | ${fmt(rb['P'] ?? 0)}% | ${fmt(rb['D'] ?? 0)}% | ${fmt(rb['C'] ?? 0)}% | ${fmt(rb['A'] ?? 0)}% |`);
  }
  lines.push('');

  // ── Rendimento aggregato per ruolo ──────────────────────────────────────────
  lines.push('## Rendimento Aggregato per Ruolo (tutte le stagioni)');
  lines.push('');
  lines.push('| Ruolo | N | Grezzo Medio | Grezzo % Pos. | FT Medio | FT % Pos. | Qt.I Media | Qt.A Media |');
  lines.push('|-------|---|-------------|--------------|---------|----------|-----------|-----------|');
  for (const r of a.roleStats) {
    lines.push(`| ${r.role} | ${r.totalPlayers} | ${fmt(r.avgReturnPct)}% | ${fmt(r.pctPositive)}% | ${fmt(r.avgTradingReturnPct)}% | ${fmt(r.pctPositiveTrading)}% | ${fmt(r.avgInitialQuote)} | ${fmt(r.avgFinalQuote)} |`);
  }
  lines.push('');

  // ── Top 20 rivalutazioni (per rendimento statistico grezzo) ─────────────────
  lines.push('## Top 20 Rivalutazioni (Rendimento Statistico Grezzo)');
  lines.push('');
  lines.push('> Ordinato per RSG = (Qt.A−Qt.I)/Qt.I×100. Attenzione: valori estremi per quotazioni basse.');
  lines.push('');
  lines.push('| # | Giocatore | R | Club | Stagione | Qt.I | Qt.A | RSG | RFT |');
  lines.push('|---|-----------|---|------|----------|------|------|-----|-----|');
  a.topGainers.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.playerName} | ${r.role} | ${r.club} | ${r.season} | ${r.initialQuote} | ${r.currentOrFinalQuote} | +${fmt(r.quoteRawReturnPct)}% | +${fmt(r.quoteTradingReturnPct)}% |`);
  });
  lines.push('');

  // ── Top 20 svalutazioni ─────────────────────────────────────────────────────
  lines.push('## Top 20 Svalutazioni (Rendimento Statistico Grezzo)');
  lines.push('');
  lines.push('| # | Giocatore | R | Club | Stagione | Qt.I | Qt.A | RSG | RFT |');
  lines.push('|---|-----------|---|------|----------|------|------|-----|-----|');
  a.topLosers.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.playerName} | ${r.role} | ${r.club} | ${r.season} | ${r.initialQuote} | ${r.currentOrFinalQuote} | ${fmt(r.quoteRawReturnPct)}% | ${fmt(r.quoteTradingReturnPct)}% |`);
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

  console.log('\n── Sintesi ─────────────────────────────────────────────────────────');
  console.log(`Stagioni analizzate: ${analysis.seasons.join(', ')}`);
  console.log(`                        [Statistico Grezzo]   [FantaTrading]`);
  console.log(`Rendimento medio:        ${fmt(analysis.overallAvgReturnPct).padStart(7)}%              ${fmt(analysis.overallAvgTradingReturnPct).padStart(7)}%`);
  console.log(`% rivalutati:            ${fmt(analysis.overallPctPositive).padStart(7)}%              ${fmt(analysis.overallPctPositiveTrading).padStart(7)}%`);
  console.log(`% rivalutati >5%:        ${fmt(analysis.overallPctAbove5).padStart(7)}%              ${fmt(analysis.overallPctAbove5Trading).padStart(7)}%`);

  console.log('\nPer stagione [FantaTrading]:');
  for (const s of analysis.seasonStats) {
    console.log(`  ${s.season} [${s.status}]: N=${s.totalPlayers}, FT medio=${fmt(s.avgTradingReturnPct)}%, FT mediana=${fmt(s.medianTradingReturnPct)}%, FT %pos=${fmt(s.pctPositiveTrading)}%`);
  }

  console.log('\nPer ruolo (aggregato):');
  for (const r of analysis.roleStats) {
    if (r.totalPlayers > 0)
      console.log(`  ${r.role}: N=${r.totalPlayers}, RSG=${fmt(r.avgReturnPct)}%, RFT=${fmt(r.avgTradingReturnPct)}%, %pos(FT)=${fmt(r.pctPositiveTrading)}%`);
  }

  if (analysis.topGainers.length > 0) {
    const g = analysis.topGainers[0];
    console.log(`\nMassima rivalutazione (RSG): ${g.playerName} (${g.role}, ${g.club}, ${g.season}): RSG=+${fmt(g.quoteRawReturnPct)}%, RFT=+${fmt(g.quoteTradingReturnPct)}%`);
  }
  if (analysis.topLosers.length > 0) {
    const l = analysis.topLosers[0];
    console.log(`Massima svalutazione (RSG):  ${l.playerName} (${l.role}, ${l.club}, ${l.season}): RSG=${fmt(l.quoteRawReturnPct)}%, RFT=${fmt(l.quoteTradingReturnPct)}%\n`);
  }
}

main();
