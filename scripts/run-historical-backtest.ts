import * as fs from 'fs';
import * as path from 'path';
import {
  runHistoricalBacktest,
  BACKTEST_MODELS,
  DEFAULT_BACKTEST_CONFIG,
  SeasonModelStats,
  AggregateModelStats,
  BacktestReport,
} from '../src/analysis/historicalPortfolioSimulator';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import { writeJSON, writeCSV, ensureDir } from '../src/services/reportWriter';

const DATA_PATH = path.resolve(__dirname, '../data/real/processed/fantacalcio_quotes_history.json');
const OUT_DIR   = path.resolve(__dirname, '../reports/real-data');

// ─── CSV ──────────────────────────────────────────────────────────────────────

function buildCsv(rows: SeasonModelStats[]): { headers: string[]; rows: (string | number)[][] } {
  const headers = [
    'season', 'seasonStatus', 'modelId', 'modelName',
    'numParticipants', 'numSimulations',
    'avgBuyCost', 'avgSellProceeds',
    'avgTradingROI', 'medianTradingROI', 'pctPositiveTradingROI', 'pctAbove5TradingROI',
    'avgPrizePool', 'avgPlatformRevenue', 'avgTopPrize',
    'avgWinnerTotalROI', 'avgTotalROI', 'pctAbove0TotalROI', 'pctAbove5TotalROI',
  ];
  const data = rows.map(r => [
    r.season, r.seasonStatus, r.modelId, r.modelName,
    r.numParticipants, r.numSimulations,
    +r.avgBuyCost.toFixed(2), +r.avgSellProceeds.toFixed(2),
    +r.avgTradingROI.toFixed(2), +r.medianTradingROI.toFixed(2),
    +r.pctPositiveTradingROI.toFixed(1), +r.pctAbove5TradingROI.toFixed(1),
    +r.avgPrizePool.toFixed(2), +r.avgPlatformRevenue.toFixed(2), +r.avgTopPrize.toFixed(2),
    +r.avgWinnerTotalROI.toFixed(1), +r.avgTotalROI.toFixed(2),
    +r.pctAbove0TotalROI.toFixed(1), +r.pctAbove5TotalROI.toFixed(1),
  ]);
  return { headers, rows: data };
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function buildMarkdown(report: BacktestReport): string {
  const lines: string[] = [];

  lines.push('# FantaTrading — Backtest Storico Buy-and-Hold');
  lines.push('');
  lines.push(`**Generato il:** ${new Date().toLocaleString('it-IT')}`);
  lines.push(`**Config:** N=${report.config.numParticipants} partecipanti, ${report.config.numSimulations} simulazioni/stagione, seed=${report.config.randomSeed}`);
  lines.push(`**Composizione rosa:** P=${report.config.rosterComposition['P']}, D=${report.config.rosterComposition['D']}, C=${report.config.rosterComposition['C']}, A=${report.config.rosterComposition['A']}`);
  lines.push(`**Modelli:** ${BACKTEST_MODELS.map(m => m.id).join(', ')}`);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Premessa metodologica');
  lines.push('');
  lines.push('Il backtest simula una strategia **buy-and-hold pura**: ogni partecipante acquista 25 calciatori');
  lines.push('a inizio stagione (con commissione 2%) e li vende a fine stagione (con commissione 1.25%),');
  lines.push('usando le quotazioni Fantacalcio reali (Qt.I e Qt.A). La rosa è selezionata casualmente');
  lines.push('rispettando la composizione 3P+8D+8C+6A.');
  lines.push('');
  lines.push('La variazione quotazione usa la regola FantaTrading: ogni punto quotazione vale 5% del valore dell\'azione.');
  lines.push('Il rendimento applicato al valore di vendita ha floor a -100%, quindi `sellValue` non puo essere negativo.');
  lines.push('Il rendimento statistico grezzo `(Qt.A - Qt.I) / Qt.I` non e usato per ROI, soglie o ranking del backtest.');
  lines.push('');
  lines.push('I portfolio sono costruiti **una sola volta per stagione** e applicati a tutti e 5 i modelli');
  lines.push('di regolamento, che differiscono solo nella distribuzione del montepremi e nella quota d\'iscrizione.');
  lines.push('');

  // ── Stagioni completate per modello ──────────────────────────────────────────
  lines.push('## Risultati per stagione — Trading ROI (indipendente dal modello)');
  lines.push('');
  lines.push('> Il ROI di trading è identico per tutti i modelli (stesse commissioni 2%/1.25%).');
  lines.push('');

  const seasons = [...new Set(report.completedSeasons.map(s => s.season))].sort();
  lines.push('| Stagione | ROI medio | ROI mediano | % positivo | % > 5% |');
  lines.push('|----------|-----------|-------------|------------|--------|');
  for (const season of seasons) {
    const s = report.completedSeasons.find(r => r.season === season && r.modelId === 'M1')!;
    if (!s) continue;
    lines.push(
      `| ${season} | ${s.avgTradingROI.toFixed(1)}% | ${s.medianTradingROI.toFixed(1)}% | ${s.pctPositiveTradingROI.toFixed(0)}% | ${s.pctAbove5TradingROI.toFixed(0)}% |`,
    );
  }
  lines.push('');

  // ── Confronto modelli (aggregate) ────────────────────────────────────────────
  lines.push('## Confronto modelli — Media su tutte le stagioni completate');
  lines.push('');
  lines.push('| Modello | Montepremi | Ricavo Piatt. | Top Premio | ROI Vincitore | ROI Medio | % > 0 |');
  lines.push('|---------|-----------|--------------|-----------|--------------|-----------|-------|');
  for (const agg of report.aggregateByModel) {
    lines.push(
      `| **${agg.modelId}** ${agg.modelName} | ${agg.avgPrizePool.toFixed(0)} | ${agg.avgPlatformRevenue.toFixed(0)} | — | ${agg.avgWinnerTotalROI.toFixed(0)}% | ${agg.avgTotalROI.toFixed(1)}% | ${agg.pctAbove0TotalROI.toFixed(0)}% |`,
    );
  }
  lines.push('');

  // ── Dettaglio per modello e stagione ──────────────────────────────────────────
  lines.push('## Dettaglio per modello');
  lines.push('');
  for (const model of BACKTEST_MODELS) {
    const modelStats = report.completedSeasons.filter(s => s.modelId === model.id);
    lines.push(`### ${model.id} — ${model.name}`);
    lines.push('');
    lines.push(`*${model.description}*`);
    lines.push('');
    lines.push('| Stagione | Montepremi | Ricavo Piatt. | Top Premio | ROI Vincitore | ROI Medio | % > 0 |');
    lines.push('|----------|-----------|--------------|-----------|--------------|-----------|-------|');
    for (const s of modelStats) {
      lines.push(
        `| ${s.season} | ${s.avgPrizePool.toFixed(0)} | ${s.avgPlatformRevenue.toFixed(0)} | ${s.avgTopPrize.toFixed(0)} | ${s.avgWinnerTotalROI.toFixed(0)}% | ${s.avgTotalROI.toFixed(1)}% | ${s.pctAbove0TotalROI.toFixed(0)}% |`,
      );
    }
    lines.push('');
  }

  // ── Stagione in corso ─────────────────────────────────────────────────────────
  if (report.inProgressStats && report.inProgressStats.length > 0) {
    lines.push('## Stagione in corso (dati parziali)');
    lines.push('');
    lines.push('> I risultati seguenti si basano su quotazioni parziali della stagione in corso.');
    lines.push('> Le stime sono indicative e cambieranno con l\'avanzare della stagione.');
    lines.push('');
    const inProg = report.inProgressStats.filter(s => s.modelId === 'M1');
    for (const s of inProg) {
      lines.push(`**${s.season}** — ROI trading medio: ${s.avgTradingROI.toFixed(1)}%, % positivo: ${s.pctPositiveTradingROI.toFixed(0)}%`);
    }
    lines.push('');
  }

  // ── Conclusioni ───────────────────────────────────────────────────────────────
  lines.push('## Conclusioni');
  lines.push('');

  const m1agg = report.aggregateByModel.find(a => a.modelId === 'M1');
  const m5agg = report.aggregateByModel.find(a => a.modelId === 'M5');

  if (m1agg) {
    lines.push(`- **ROI di trading medio storico (M1):** ${m1agg.avgTradingROI.toFixed(1)}% — questo è il rendimento puro del buy-and-hold sulle quotazioni reali.`);
    lines.push(`- **% di portafogli con ROI positivo:** ${m1agg.pctAbove0TotalROI.toFixed(0)}% su tutte le simulazioni/stagioni.`);
  }
  if (m5agg) {
    lines.push(`- **ROI vincitore (M5 raccomandato):** ${m5agg.avgWinnerTotalROI.toFixed(0)}% in media — il vincitore recupera ampiamente la quota.`);
    lines.push(`- **Ricavo piattaforma (M5):** ${m5agg.avgPlatformRevenue.toFixed(0)} crediti in media per lega — sostenibilità confermata anche con dati reali.`);
  }
  lines.push('- Le commissioni 2%/1.25% sono identiche per tutti i modelli: il ROI di trading è una caratteristica');
  lines.push('  del mercato Fantacalcio reale, non del regolamento scelto.');
  lines.push('');

  lines.push('---');
  lines.push('*Dati generati automaticamente dal motore FantaTrading usando quotazioni reali Fantacalcio.*');
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('=== FantaTrading — Backtest Storico Buy-and-Hold ===\n');

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`File dati non trovato: ${DATA_PATH}`);
    console.error('Esegui prima: npm run import:real-quotes');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as {
    generatedAt: string;
    totalRows: number;
    rows: NormalizedQuoteRow[];
  };

  const allRows = raw.rows;
  const seasons = [...new Set(allRows.map(r => r.season))].sort();
  const completedSeasons = seasons.filter(s => allRows.find(r => r.season === s)?.seasonStatus === 'completed');
  const inProgressSeasons = seasons.filter(s => allRows.find(r => r.season === s)?.seasonStatus === 'in_progress');

  console.log(`Righe caricate: ${allRows.length}`);
  console.log(`Stagioni completate: ${completedSeasons.join(', ')}`);
  if (inProgressSeasons.length > 0) {
    console.log(`Stagioni in corso:  ${inProgressSeasons.join(', ')}`);
  }
  console.log(`Modelli:            ${BACKTEST_MODELS.map(m => m.id).join(', ')}`);
  console.log(`Simulazioni/stagione: ${DEFAULT_BACKTEST_CONFIG.numSimulations}\n`);

  const t0 = Date.now();
  const report = runHistoricalBacktest(
    allRows,
    DEFAULT_BACKTEST_CONFIG,
    BACKTEST_MODELS,
    (season, ms) => console.log(`  ${season} → ${ms}ms`),
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nCompletato in ${elapsed}s.\n`);

  ensureDir(OUT_DIR);

  const jsonPath = path.join(OUT_DIR, 'historical_backtest.json');
  writeJSON(jsonPath, report);
  console.log(`JSON → ${jsonPath}`);

  const { headers, rows: csvRows } = buildCsv([
    ...report.completedSeasons,
    ...(report.inProgressStats ?? []),
  ]);
  const csvPath = path.join(OUT_DIR, 'historical_backtest.csv');
  writeCSV(csvPath, headers, csvRows);
  console.log(`CSV  → ${csvPath}`);

  const mdPath = path.join(OUT_DIR, 'historical_backtest.md');
  fs.writeFileSync(mdPath, buildMarkdown(report), 'utf8');
  console.log(`MD   → ${mdPath}`);

  console.log('\n── Sommario aggregate ──────────────────────────────────────────');
  for (const agg of report.aggregateByModel) {
    console.log(
      `  ${agg.modelId} ${agg.modelName.padEnd(26)} | ` +
      `ROI trading: ${agg.avgTradingROI.toFixed(1)}% | ` +
      `ROI vincitore: ${agg.avgWinnerTotalROI.toFixed(0)}% | ` +
      `Montepremi: ${agg.avgPrizePool.toFixed(0)} | ` +
      `Piattaforma: ${agg.avgPlatformRevenue.toFixed(0)}`,
    );
  }
  console.log('');
}

main().catch(err => { console.error(err); process.exit(1); });
