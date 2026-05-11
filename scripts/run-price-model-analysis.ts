import * as path from 'path';
import * as fs from 'fs';
import { loadPlayers } from '../src/services/dataLoader';
import {
  runPriceModelAnalysis,
  DEFAULT_PRICE_MODEL_CONFIG,
  PriceModelPoint,
  PriceModelReport,
} from '../src/analysis/priceModelAnalysis';
import { writeJSON, writeCSV, ensureDir } from '../src/services/reportWriter';

const OUT_DIR = path.join(__dirname, '..', 'reports', 'price-model');

function buildCsv(points: PriceModelPoint[]): { headers: string[]; rows: (string | number)[][] } {
  const headers = [
    'mean_reversion_rate', 'avg_price_drift_abs', 'avg_price_drift_rel_pct',
    'avg_price_std_dev', 'avg_prize_pool', 'avg_platform_revenue',
    'pct_above_0', 'avg_winner_roi_pct', 'avg_squad_capital_at_end',
  ];
  const rows = points.map(p => [
    p.meanReversionRate,
    +p.avgPriceDriftAbs.toFixed(2),
    +p.avgPriceDriftRel.toFixed(2),
    +p.avgPriceStdDev.toFixed(2),
    +p.avgPrizePool.toFixed(2),
    +p.avgPlatformRevenue.toFixed(2),
    +p.pctAbove0.toFixed(1),
    +p.avgWinnerROIPct.toFixed(0),
    +p.avgSquadCapitalAtEnd.toFixed(2),
  ]);
  return { headers, rows };
}

function buildMarkdown(report: PriceModelReport): string {
  const lines: string[] = [];

  lines.push('# FantaTrading — Analisi Modello di Prezzo Calciatori');
  lines.push('');
  lines.push(`**Generato il:** ${new Date().toLocaleString('it-IT')}`);
  lines.push(`**Config:** N=${report.numParticipants}, ${report.numSimulations} run/punto, ${report.roundsPerSeason} giornate`);
  lines.push('');

  lines.push('## Confronto Random Walk vs Mean-Reverting');
  lines.push('');
  lines.push('| Rate | Drift Medio | Drift % | Std Dev Prezzi | Montepremi | Ricavo Piatt. | Break-even | ROI Vincitore | Capitale Finale |');
  lines.push('|------|------------|---------|---------------|-----------|--------------|------------|---------------|-----------------|');
  for (const p of report.points) {
    const isBaseline = p.meanReversionRate === 0 ? ' ← RW' : '';
    const isRec = p.meanReversionRate === report.recommendedRate && p.meanReversionRate > 0 ? ' ← REC' : '';
    lines.push(
      `| **${p.meanReversionRate}**${isBaseline}${isRec} | ${p.avgPriceDriftAbs.toFixed(1)} | ${p.avgPriceDriftRel.toFixed(1)}% | ${p.avgPriceStdDev.toFixed(1)} | ${p.avgPrizePool.toFixed(0)} | ${p.avgPlatformRevenue.toFixed(0)} | ${p.pctAbove0.toFixed(1)}% | ${p.avgWinnerROIPct.toFixed(0)}% | ${p.avgSquadCapitalAtEnd.toFixed(0)} |`,
    );
  }
  lines.push('');

  lines.push('## Raccomandazione');
  lines.push('');
  lines.push(`**Tasso consigliato: \`meanReversionRate = ${report.recommendedRate}\`**`);
  lines.push('');
  lines.push(report.recommendedRationale);
  lines.push('');

  lines.push('## Risultati chiave');
  lines.push('');
  for (const f of report.keyFindings) {
    lines.push(`- ${f}`);
  }
  lines.push('');

  lines.push('## Interpretazione economica');
  lines.push('');
  lines.push('Con il **random walk puro** (rate=0):');
  lines.push('- I valori dei calciatori possono derivare lontano dal loro valore di mercato reale.');
  lines.push('- Squadre fortunate accumulano asset sopravvalutati; squadre sfortunate si trovano con asset svalutati.');
  lines.push('- Il capital gain/loss da variazione prezzi diventa componente rilevante della ricchezza finale.');
  lines.push('');
  lines.push('Con la **mean reversion** (rate>0):');
  lines.push('- I prezzi oscillano attorno al baseValue, rappresentando meglio un mercato efficiente.');
  lines.push('- Il vantaggio competitivo viene dall\'**abilità di trading** (timing, scelta calciatori), non dalla fortuna nei prezzi.');
  lines.push('- Le conclusioni economiche della Fase 3 restano valide: il montepremi e il margine organizzatore sono robusti al modello di prezzo.');
  lines.push('');

  lines.push('---');
  lines.push('*Dati generati automaticamente dal motore FantaTrading.*');
  return lines.join('\n');
}

async function main() {
  console.log('=== FantaTrading — Analisi Modello di Prezzo ===\n');

  const players = loadPlayers();
  const cfg = DEFAULT_PRICE_MODEL_CONFIG;
  console.log(`Caricati ${players.length} calciatori.`);
  console.log(`Rate da testare: ${cfg.meanReversionRates.join(', ')}\n`);

  const t0 = Date.now();
  const report = runPriceModelAnalysis(players, cfg, (rate, ms) => {
    console.log(`  rate=${rate} → ${ms}ms`);
  });
  console.log(`\nCompletato in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log(`Tasso raccomandato: ${report.recommendedRate}\n`);

  ensureDir(OUT_DIR);

  writeJSON(path.join(OUT_DIR, 'price_model_analysis.json'), report);
  console.log(`JSON → ${path.join(OUT_DIR, 'price_model_analysis.json')}`);

  const { headers, rows } = buildCsv(report.points);
  writeCSV(path.join(OUT_DIR, 'price_model_analysis.csv'), headers, rows);
  console.log(`CSV  → ${path.join(OUT_DIR, 'price_model_analysis.csv')}`);

  fs.writeFileSync(path.join(OUT_DIR, 'price_model_analysis.md'), buildMarkdown(report), 'utf8');
  console.log(`MD   → ${path.join(OUT_DIR, 'price_model_analysis.md')}`);

  console.log('\n── Risultati chiave ────────────────────────────────────────');
  for (const f of report.keyFindings) {
    console.log(`• ${f}`);
  }
  console.log(`\n★  Raccomandazione: meanReversionRate = ${report.recommendedRate}`);
  console.log(`   ${report.recommendedRationale}`);
}

main().catch(err => { console.error(err); process.exit(1); });
