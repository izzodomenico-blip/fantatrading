import * as path from 'path';
import { loadPlayers } from '../src/services/dataLoader';
import { runRuleComparison, buildComparisonReport, ComparisonRow } from '../src/services/ruleComparisonEngine';
import { writeJSON, writeCSV, ensureDir } from '../src/services/reportWriter';
import { ALL_RULE_MODELS } from '../src/config/ruleModels';

// ─── Paths ────────────────────────────────────────────────────────────────────

const OUT_DIR = path.join(__dirname, '..', 'reports', 'rule-comparison');

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function rowsToCsvRecords(rows: ComparisonRow[]): Record<string, string | number | boolean>[] {
  return rows.map(r => ({
    model_id: r.modelId,
    model_name: r.modelName,
    num_participants: r.numParticipants,
    registration_fee: r.registrationFeePerTeam,
    avg_capital_invested_per_team: +r.avgCapitalInvestedPerTeam.toFixed(2),
    avg_ops_per_team_season: +r.avgOpsPerTeamSeason.toFixed(1),
    avg_total_commissions: +r.avgTotalCommissions.toFixed(2),
    avg_gross_inflow: +r.avgGrossInflow.toFixed(2),
    avg_prize_pool: +r.avgPrizePool.toFixed(2),
    avg_first_prize: +r.avgFirstPrize.toFixed(2),
    avg_second_prize: +r.avgSecondPrize.toFixed(2),
    avg_third_prize: +r.avgThirdPrize.toFixed(2),
    avg_platform_revenue: +r.avgPlatformRevenue.toFixed(2),
    organizer_margin_pct: +r.avgOrganizerMarginPct.toFixed(2),
    org_profit_per_participant: +r.orgProfitPerParticipant.toFixed(2),
    avg_participant_roi_pct: +r.avgParticipantROIPct.toFixed(2),
    avg_winner_roi_pct: +r.avgWinnerROIPct.toFixed(0),
    pct_above_0: +r.pctAbove0.toFixed(1),
    pct_above_5: +r.pctAbove5.toFixed(1),
    platform_loss_risk_pct: +r.platformLossRisk.toFixed(1),
    is_sustainable: r.isSustainable,
  }));
}

// ─── Markdown builder ─────────────────────────────────────────────────────────

function buildMarkdown(rows: ComparisonRow[], recommendations: string[]): string {
  const lines: string[] = [];

  lines.push('# FantaTrading — Confronto Modelli di Regolamento');
  lines.push('');
  lines.push(`**Generato il:** ${new Date().toLocaleString('it-IT')}`);
  lines.push('');
  lines.push('## Modelli analizzati');
  lines.push('');
  for (const m of ALL_RULE_MODELS) {
    lines.push(`- **${m.id} — ${m.name}:** ${m.description}`);
  }
  lines.push('');

  // Tabella per ogni N
  const participantCounts = [...new Set(rows.map(r => r.numParticipants))].sort((a, b) => a - b);

  for (const n of participantCounts) {
    const subset = rows.filter(r => r.numParticipants === n);
    lines.push(`## Scenario N=${n} partecipanti`);
    lines.push('');

    // Tabella metriche principali
    lines.push('### Economia generale');
    lines.push('');
    lines.push('| Modello | Quota | Flusso Lordo | Montepremi | Ricavo Piattaforma | Margine % | Profitto/Part. |');
    lines.push('|---------|-------|-------------|------------|-------------------|-----------|----------------|');
    for (const r of subset) {
      lines.push(
        `| ${r.modelId} — ${r.modelName} | ${r.registrationFeePerTeam} | ${r.avgGrossInflow.toFixed(0)} | ${r.avgPrizePool.toFixed(0)} | ${r.avgPlatformRevenue.toFixed(0)} | ${r.avgOrganizerMarginPct.toFixed(1)}% | ${r.orgProfitPerParticipant.toFixed(1)} |`,
      );
    }
    lines.push('');

    lines.push('### Premi distribuiti');
    lines.push('');
    lines.push('| Modello | Premio 1° | Premio 2° | Premio 3° | ROI Vincitore |');
    lines.push('|---------|----------|----------|----------|---------------|');
    for (const r of subset) {
      lines.push(
        `| ${r.modelId} | ${r.avgFirstPrize.toFixed(0)} | ${r.avgSecondPrize.toFixed(0)} | ${r.avgThirdPrize.toFixed(0)} | ${r.avgWinnerROIPct.toFixed(0)}% |`,
      );
    }
    lines.push('');

    lines.push('### ROI partecipanti');
    lines.push('');
    lines.push('| Modello | ROI Medio Part. | Break-even (≥0%) | Break-even (≥5%) | Rischio Piattaforma |');
    lines.push('|---------|----------------|-----------------|-----------------|---------------------|');
    for (const r of subset) {
      const risk = r.platformLossRisk > 0 ? `${r.platformLossRisk.toFixed(1)}%` : '0%';
      lines.push(
        `| ${r.modelId} | ${r.avgParticipantROIPct.toFixed(1)}% | ${r.pctAbove0.toFixed(1)}% | ${r.pctAbove5.toFixed(1)}% | ${risk} |`,
      );
    }
    lines.push('');
  }

  // Tabella riassuntiva cross-modello per N=100
  lines.push('## Quadro sinottico (N=100)');
  lines.push('');
  lines.push('| Modello | Margine % | Profitto/Part. | Break-even | ROI Vincitore | Sostenibile |');
  lines.push('|---------|-----------|---------------|------------|---------------|-------------|');
  for (const r of rows.filter(r => r.numParticipants === 100)) {
    const sust = r.isSustainable ? 'SI' : 'NO';
    lines.push(
      `| ${r.modelId} — ${r.modelName} | ${r.avgOrganizerMarginPct.toFixed(1)}% | ${r.orgProfitPerParticipant.toFixed(1)} | ${r.pctAbove0.toFixed(1)}% | ${r.avgWinnerROIPct.toFixed(0)}% | ${sust} |`,
    );
  }
  lines.push('');

  lines.push('## Raccomandazioni');
  lines.push('');
  for (const rec of recommendations) {
    lines.push(`- ${rec}`);
  }
  lines.push('');

  lines.push('---');
  lines.push('*Simulazione Monte Carlo — dati generati automaticamente dal motore FantaTrading.*');
  lines.push('');

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== FantaTrading — Fase 3: Confronto Modelli Regolamento ===\n');

  const players = loadPlayers();
  console.log(`Caricati ${players.length} calciatori.\n`);

  console.log('Avvio simulazioni (25 scenari: 5 modelli × 5 N)...\n');
  const t0 = Date.now();

  const rows = runRuleComparison(players, ALL_RULE_MODELS, undefined, (label, ms) => {
    console.log(`  [${label}] ${ms}ms`);
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nSimulazioni completate in ${elapsed}s.\n`);

  const report = buildComparisonReport(rows);

  ensureDir(OUT_DIR);

  // 1. JSON dettagliato
  const jsonPath = path.join(OUT_DIR, 'rule_comparison_detailed.json');
  writeJSON(jsonPath, report);
  console.log(`JSON dettagliato → ${jsonPath}`);

  // 2. CSV tabellare
  const csvPath = path.join(OUT_DIR, 'rule_comparison_summary.csv');
  const csvRecords = rowsToCsvRecords(rows);
  const csvHeaders = Object.keys(csvRecords[0]);
  const csvData = csvRecords.map(rec => csvHeaders.map(h => rec[h] as string | number | boolean));
  writeCSV(csvPath, csvHeaders, csvData);
  console.log(`CSV tabellare    → ${csvPath}`);

  // 3. Markdown leggibile
  const mdPath = path.join(OUT_DIR, 'rule_comparison_report.md');
  const md = buildMarkdown(rows, report.recommendations);
  const fs = await import('fs');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`Markdown report  → ${mdPath}`);

  console.log('\n── Raccomandazioni ────────────────────────────────────────');
  for (const rec of report.recommendations) {
    console.log(`• ${rec}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
