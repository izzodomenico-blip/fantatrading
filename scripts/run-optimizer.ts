import * as path from 'path';
import * as fs from 'fs';
import { loadPlayers } from '../src/services/dataLoader';
import {
  runGridSearch,
  DEFAULT_SEARCH_SPACE,
  DEFAULT_OPTIMIZER_RUN_CONFIG,
  OptimizerCandidate,
  OptimizerResult,
  OBJECTIVE_LABELS,
} from '../src/analysis/ruleOptimizer';
import { writeJSON, writeCSV, ensureDir } from '../src/services/reportWriter';

const OUT_DIR = path.join(__dirname, '..', 'reports', 'optimizer');

// ─── CSV ──────────────────────────────────────────────────────────────────────

function candidatesToCsv(candidates: OptimizerCandidate[]): {
  headers: string[];
  rows: (string | number | boolean)[][];
} {
  const headers = [
    'buy_commission_pct', 'sell_commission_pct', 'platform_fee_pct',
    'avg_organizer_margin_pct', 'org_profit_per_participant',
    'avg_platform_revenue', 'avg_prize_pool', 'avg_first_prize',
    'avg_winner_roi_pct', 'pct_above_0', 'platform_loss_risk_pct',
    'is_sustainable', 'is_pareto_optimal',
    'score_max_organizer', 'score_participant_welfare', 'score_winner_attractiveness', 'score_balanced',
  ];
  const rows = candidates.map(c => [
    +(c.buyCommissionRate * 100).toFixed(2),
    +(c.sellCommissionRate * 100).toFixed(3),
    +(c.platformFeeRate * 100).toFixed(0),
    +c.avgOrganizerMarginPct.toFixed(2),
    +c.orgProfitPerParticipant.toFixed(2),
    +c.avgPlatformRevenue.toFixed(2),
    +c.avgPrizePool.toFixed(2),
    +c.avgFirstPrize.toFixed(2),
    +c.avgWinnerROIPct.toFixed(0),
    +c.pctAbove0.toFixed(1),
    +c.platformLossRisk.toFixed(1),
    c.isSustainable,
    c.isParetoOptimal,
    +c.scores.maxOrganizerRevenue.toFixed(2),
    +c.scores.maxParticipantWelfare.toFixed(2),
    +c.scores.maxWinnerAttractiveness.toFixed(4),
    +c.scores.balanced.toFixed(4),
  ]);
  return { headers, rows };
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function buildMarkdown(result: OptimizerResult): string {
  const lines: string[] = [];

  lines.push('# FantaTrading — Ottimizzazione Parametri');
  lines.push('');
  lines.push(`**Generato il:** ${new Date().toLocaleString('it-IT')}`);
  lines.push(`**Candidati valutati:** ${result.totalCandidatesEvaluated} (${result.numSimulationsPerCandidate} run/candidato, N=${result.numParticipants})`);
  lines.push('');

  lines.push('## Spazio di ricerca');
  lines.push('');
  lines.push(`- Commissione acquisto: ${result.searchSpace.buyCommissionRates.map(r => (r * 100).toFixed(1) + '%').join(', ')}`);
  lines.push(`- Commissione vendita: ${result.searchSpace.sellCommissionRates.map(r => (r * 100).toFixed(2) + '%').join(', ')}`);
  lines.push(`- Margine piattaforma: ${result.searchSpace.platformFeeRates.map(r => (r * 100).toFixed(0) + '%').join(', ')}`);
  lines.push('');

  lines.push('## Migliori soluzioni per obiettivo');
  lines.push('');
  lines.push('| Obiettivo | Buy % | Sell % | Platform % | Margine Org. | Break-even | ROI Vincitore | Sostenibile |');
  lines.push('|-----------|-------|--------|------------|-------------|------------|---------------|-------------|');

  for (const [obj, label] of Object.entries(OBJECTIVE_LABELS)) {
    const c = result.bestPerObjective[obj as keyof typeof result.bestPerObjective];
    lines.push(
      `| ${label} | ${(c.buyCommissionRate * 100).toFixed(1)}% | ${(c.sellCommissionRate * 100).toFixed(2)}% | ${(c.platformFeeRate * 100).toFixed(0)}% | ${c.avgOrganizerMarginPct.toFixed(1)}% | ${c.pctAbove0.toFixed(1)}% | ${c.avgWinnerROIPct.toFixed(0)}% | ${c.isSustainable ? 'SI' : 'NO'} |`,
    );
  }
  lines.push('');

  lines.push('## Frontiera di Pareto');
  lines.push('');
  lines.push(`*${result.paretoFrontier.length} soluzioni non dominate sul piano (margine organizzatore %, break-even partecipanti %)*`);
  lines.push('');
  lines.push('| Buy % | Sell % | Platform % | Margine Org. | Break-even | Premio 1° | ROI Vincitore |');
  lines.push('|-------|--------|------------|-------------|------------|-----------|---------------|');
  for (const c of result.paretoFrontier) {
    lines.push(
      `| ${(c.buyCommissionRate * 100).toFixed(1)}% | ${(c.sellCommissionRate * 100).toFixed(2)}% | ${(c.platformFeeRate * 100).toFixed(0)}% | ${c.avgOrganizerMarginPct.toFixed(1)}% | ${c.pctAbove0.toFixed(1)}% | ${c.avgFirstPrize.toFixed(0)} | ${c.avgWinnerROIPct.toFixed(0)}% |`,
    );
  }
  lines.push('');

  lines.push('## Raccomandazioni');
  lines.push('');
  for (const rec of result.recommendations) {
    lines.push(`- ${rec}`);
  }
  lines.push('');

  lines.push('## Top 10 soluzioni bilanciate');
  lines.push('');
  const top10 = [...result.allCandidates]
    .filter(c => c.isSustainable)
    .sort((a, b) => b.scores.balanced - a.scores.balanced)
    .slice(0, 10);
  lines.push('| # | Buy % | Sell % | Platform % | Margine % | Break-even | ROI Vincitore | Pareto |');
  lines.push('|---|-------|--------|------------|-----------|------------|---------------|--------|');
  top10.forEach((c, i) => {
    const pareto = c.isParetoOptimal ? 'SI' : '';
    lines.push(
      `| ${i + 1} | ${(c.buyCommissionRate * 100).toFixed(1)}% | ${(c.sellCommissionRate * 100).toFixed(2)}% | ${(c.platformFeeRate * 100).toFixed(0)}% | ${c.avgOrganizerMarginPct.toFixed(1)}% | ${c.pctAbove0.toFixed(1)}% | ${c.avgWinnerROIPct.toFixed(0)}% | ${pareto} |`,
    );
  });
  lines.push('');

  lines.push('---');
  lines.push('*Grid search — dati generati automaticamente dal motore FantaTrading.*');
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== FantaTrading — Ottimizzazione Parametri ===\n');

  const players = loadPlayers();
  const totalCombos =
    DEFAULT_SEARCH_SPACE.buyCommissionRates.length *
    DEFAULT_SEARCH_SPACE.sellCommissionRates.length *
    DEFAULT_SEARCH_SPACE.platformFeeRates.length;

  console.log(`Caricati ${players.length} calciatori.`);
  console.log(`Grid search: ${totalCombos} combinazioni × ${DEFAULT_OPTIMIZER_RUN_CONFIG.numSimulations} run/combo\n`);

  const t0 = Date.now();
  let lastPct = 0;

  const result = runGridSearch(players, DEFAULT_SEARCH_SPACE, DEFAULT_OPTIMIZER_RUN_CONFIG,
    (done, total, label, ms) => {
      const pct = Math.floor((done / total) * 100);
      if (pct >= lastPct + 10 || done === total) {
        console.log(`  ${pct}% [${done}/${total}] ${label} (${ms}ms)`);
        lastPct = pct;
      }
    },
  );

  console.log(`\nCompletato in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log(`Pareto frontier: ${result.paretoFrontier.length} soluzioni non dominate.\n`);

  ensureDir(OUT_DIR);

  const jsonPath = path.join(OUT_DIR, 'optimizer_result.json');
  writeJSON(jsonPath, result);
  console.log(`JSON → ${jsonPath}`);

  const { headers, rows } = candidatesToCsv(result.allCandidates);
  const csvPath = path.join(OUT_DIR, 'optimizer_candidates.csv');
  writeCSV(csvPath, headers, rows);
  console.log(`CSV  → ${csvPath} (${rows.length} candidati)`);

  const mdPath = path.join(OUT_DIR, 'optimizer_report.md');
  fs.writeFileSync(mdPath, buildMarkdown(result), 'utf8');
  console.log(`MD   → ${mdPath}`);

  console.log('\n── Raccomandazioni ─────────────────────────────────────────');
  for (const rec of result.recommendations) {
    console.log(`• ${rec}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Errore:', err);
  process.exit(1);
});
