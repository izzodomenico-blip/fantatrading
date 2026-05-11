import * as path from 'path';
import * as fs from 'fs';
import { loadPlayers } from '../src/services/dataLoader';
import {
  runAllSensitivitySweeps,
  buildSensitivityReport,
  DEFAULT_SENSITIVITY_BASELINE,
  SensitivityPoint,
  SensitivitySweep,
} from '../src/analysis/sensitivityAnalysis';
import { writeJSON, writeCSV, ensureDir } from '../src/services/reportWriter';

const OUT_DIR = path.join(__dirname, '..', 'reports', 'sensitivity');

// ─── CSV: una riga per punto, con paramName come colonna aggiuntiva ───────────

function buildCsvData(sweeps: SensitivitySweep[]): {
  headers: string[];
  rows: (string | number | boolean)[][];
} {
  const headers = [
    'param_name', 'param_display_name', 'param_unit', 'baseline_value', 'param_value',
    'avg_organizer_margin_pct', 'org_profit_per_participant',
    'avg_platform_revenue', 'avg_prize_pool', 'avg_first_prize',
    'avg_winner_roi_pct', 'pct_above_0', 'platform_loss_risk_pct', 'is_sustainable',
  ];

  const rows: (string | number | boolean)[][] = [];
  for (const sweep of sweeps) {
    for (const p of sweep.points) {
      rows.push([
        sweep.paramName,
        sweep.paramDisplayName,
        sweep.paramUnit,
        sweep.baselineValue,
        p.paramValue,
        +p.avgOrganizerMarginPct.toFixed(2),
        +p.orgProfitPerParticipant.toFixed(2),
        +p.avgPlatformRevenue.toFixed(2),
        +p.avgPrizePool.toFixed(2),
        +p.avgFirstPrize.toFixed(2),
        +p.avgWinnerROIPct.toFixed(0),
        +p.pctAbove0.toFixed(1),
        +p.platformLossRisk.toFixed(1),
        p.isSustainable,
      ]);
    }
  }
  return { headers, rows };
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function buildMarkdown(report: ReturnType<typeof buildSensitivityReport>): string {
  const lines: string[] = [];
  lines.push('# FantaTrading — Analisi di Sensibilità');
  lines.push('');
  lines.push(`**Generato il:** ${new Date().toLocaleString('it-IT')}`);
  lines.push(`**Baseline:** ${report.baselineDescription}`);
  lines.push('');

  lines.push('## Risultati chiave');
  lines.push('');
  for (const f of report.keyFindings) {
    lines.push(`- ${f}`);
  }
  lines.push('');

  for (const sweep of report.sweeps) {
    lines.push(`## Sweep: ${sweep.paramDisplayName} (${sweep.paramUnit})`);
    lines.push('');
    lines.push(`*Valore baseline: ${sweep.baselineValue}*`);
    lines.push('');
    lines.push(`| ${sweep.paramDisplayName} | Margine % | Profitto/Part. | Montepremi | Premio 1° | ROI Vincitore | Break-even % | Rischio Piatt. |`);
    lines.push(`|${'-'.repeat(sweep.paramDisplayName.length + 2)}|-----------|---------------|------------|-----------|---------------|--------------|----------------|`);
    for (const p of sweep.points) {
      const baseline = p.paramValue === sweep.baselineValue ? ' ← baseline' : '';
      lines.push(
        `| **${p.paramValue}**${baseline} | ${p.avgOrganizerMarginPct.toFixed(1)}% | ${p.orgProfitPerParticipant.toFixed(1)} | ${p.avgPrizePool.toFixed(0)} | ${p.avgFirstPrize.toFixed(0)} | ${p.avgWinnerROIPct.toFixed(0)}% | ${p.pctAbove0.toFixed(1)}% | ${p.platformLossRisk.toFixed(0)}% |`,
      );
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Simulazione Monte Carlo — dati generati automaticamente dal motore FantaTrading.*');
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== FantaTrading — Analisi di Sensibilità ===\n');

  const players = loadPlayers();
  console.log(`Caricati ${players.length} calciatori.`);
  console.log(`Baseline: N=${DEFAULT_SENSITIVITY_BASELINE.numParticipants}, ${DEFAULT_SENSITIVITY_BASELINE.numSimulations} run/punto\n`);

  const t0 = Date.now();
  const sweeps = runAllSensitivitySweeps(
    players,
    DEFAULT_SENSITIVITY_BASELINE,
    undefined,
    (sweep, label, ms) => console.log(`  [${sweep}] ${label} → ${ms}ms`),
  );
  console.log(`\nSweep completati in ${((Date.now() - t0) / 1000).toFixed(1)}s.\n`);

  const report = buildSensitivityReport(sweeps, DEFAULT_SENSITIVITY_BASELINE);

  ensureDir(OUT_DIR);

  const jsonPath = path.join(OUT_DIR, 'sensitivity_analysis.json');
  writeJSON(jsonPath, report);
  console.log(`JSON → ${jsonPath}`);

  const { headers, rows } = buildCsvData(sweeps);
  const csvPath = path.join(OUT_DIR, 'sensitivity_analysis.csv');
  writeCSV(csvPath, headers, rows);
  console.log(`CSV  → ${csvPath}`);

  const mdPath = path.join(OUT_DIR, 'sensitivity_analysis.md');
  fs.writeFileSync(mdPath, buildMarkdown(report), 'utf8');
  console.log(`MD   → ${mdPath}`);

  console.log('\n── Risultati chiave ───────────────────────────────────────');
  for (const f of report.keyFindings) {
    console.log(`• ${f}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Errore:', err);
  process.exit(1);
});
