import * as path from 'path';
import * as fs from 'fs';
import { loadPlayers } from '../src/services/dataLoader';
import {
  runPrizeTableGridSearch,
  DEFAULT_PRIZE_TABLE_OPTIMIZER_CONFIG,
  PrizeTableCandidate,
  PrizeTableOptimizerResult,
} from '../src/analysis/prizeTableOptimizer';
import { writeJSON, writeCSV, ensureDir } from '../src/services/reportWriter';

const OUT_DIR = path.join(__dirname, '..', 'reports', 'prize-table-optimizer');

// ─── CSV ──────────────────────────────────────────────────────────────────────

function buildCsv(candidates: PrizeTableCandidate[]): { headers: string[]; rows: (string | number | boolean)[][] } {
  const headers = [
    'num_prizes', 'first_prize_pct', 'gini_coefficient',
    'pct_above_0', 'pct_above_5', 'avg_first_prize', 'avg_last_prize',
    'avg_winner_roi_pct', 'avg_prize_pool',
    'last_prize_covers_fee', 'is_pareto_optimal',
    'table_distribution',
  ];
  const rows = candidates.map(c => [
    c.numPrizes,
    +(c.firstPrizePct * 100).toFixed(1),
    +c.giniCoefficient.toFixed(3),
    +c.pctAbove0.toFixed(1),
    +c.pctAbove5.toFixed(1),
    +c.avgFirstPrize.toFixed(1),
    +c.avgLastPrize.toFixed(1),
    +c.avgWinnerROIPct.toFixed(0),
    +c.avgPrizePool.toFixed(1),
    c.lastPrizeCoversRegistrationFee,
    c.isParetoOptimal,
    c.table.map(e => `${(e.percentageOfPool * 100).toFixed(1)}%`).join('|'),
  ]);
  return { headers, rows };
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function buildMarkdown(result: PrizeTableOptimizerResult): string {
  const lines: string[] = [];

  lines.push('# FantaTrading — Ottimizzazione Prize Table');
  lines.push('');
  lines.push(`**Generato il:** ${new Date().toLocaleString('it-IT')}`);
  lines.push(`**Config:** N=${result.numParticipants}, quota=${result.registrationFeePerTeam}, ${result.numSimulations} run/candidato`);
  lines.push(`**Candidati valutati:** ${result.candidatesEvaluated}`);
  lines.push('');

  lines.push('## Migliori soluzioni per obiettivo');
  lines.push('');
  lines.push('| Obiettivo | N. Premi | Top % | Break-even % | ROI Vincitore | Premio 1° | Premio Ultimo | Gini |');
  lines.push('|-----------|----------|-------|-------------|---------------|-----------|---------------|------|');

  const bests = [
    ['Bilanciato', result.bestBalanced],
    ['Massimo ROI Vincitore', result.bestForWinnerROI],
    ['Massimo Break-even', result.bestForBreakEven],
  ] as [string, PrizeTableCandidate][];

  for (const [label, c] of bests) {
    lines.push(
      `| ${label} | ${c.numPrizes} | ${(c.firstPrizePct * 100).toFixed(0)}% | ${c.pctAbove0.toFixed(1)}% | ${c.avgWinnerROIPct.toFixed(0)}% | ${c.avgFirstPrize.toFixed(0)} | ${c.avgLastPrize.toFixed(0)} | ${c.giniCoefficient.toFixed(2)} |`,
    );
  }
  lines.push('');

  lines.push('## Frontiera di Pareto (break-even % vs premio 1°)');
  lines.push('');
  lines.push('| N. Premi | Top % | Distribuzione | Break-even % | ROI Vincitore | Premio 1° | Gini | Copre Quota |');
  lines.push('|----------|-------|--------------|-------------|---------------|-----------|------|-------------|');
  for (const c of result.paretoFrontier) {
    const dist = c.table.slice(0, 4).map(e => `${(e.percentageOfPool * 100).toFixed(0)}%`).join('/');
    const suffix = c.table.length > 4 ? '/…' : '';
    lines.push(
      `| ${c.numPrizes} | ${(c.firstPrizePct * 100).toFixed(0)}% | ${dist}${suffix} | ${c.pctAbove0.toFixed(1)}% | ${c.avgWinnerROIPct.toFixed(0)}% | ${c.avgFirstPrize.toFixed(0)} | ${c.giniCoefficient.toFixed(2)} | ${c.lastPrizeCoversRegistrationFee ? 'SI' : 'NO'} |`,
    );
  }
  lines.push('');

  lines.push('## Analisi per numero di premi (primo posto fisso al 40%)');
  lines.push('');
  lines.push('| N. Premi | Break-even % | ROI Vincitore | Premio 1° | Premio Ultimo | Gini |');
  lines.push('|----------|-------------|---------------|-----------|---------------|------|');
  const fixedTop = result.allCandidates
    .filter(c => Math.abs(c.firstPrizePct - 0.40) < 0.01)
    .sort((a, b) => a.numPrizes - b.numPrizes);
  for (const c of fixedTop) {
    lines.push(
      `| ${c.numPrizes} | ${c.pctAbove0.toFixed(1)}% | ${c.avgWinnerROIPct.toFixed(0)}% | ${c.avgFirstPrize.toFixed(0)} | ${c.avgLastPrize.toFixed(0)} | ${c.giniCoefficient.toFixed(2)} |`,
    );
  }
  lines.push('');

  lines.push('## Raccomandazioni');
  lines.push('');
  for (const rec of result.recommendations) {
    lines.push(`- ${rec}`);
  }
  lines.push('');

  lines.push('---');
  lines.push('*Grid search — dati generati automaticamente dal motore FantaTrading.*');
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== FantaTrading — Ottimizzazione Prize Table ===\n');

  const players = loadPlayers();
  const cfg = DEFAULT_PRIZE_TABLE_OPTIMIZER_CONFIG;
  const totalCombos = cfg.numPrizesValues.reduce((s, n) => {
    return s + (n === 1 ? 1 : cfg.firstPrizePctValues.filter(p => p >= 1 / n).length);
  }, 0);

  console.log(`Caricati ${players.length} calciatori.`);
  console.log(`N=${cfg.numParticipants}, quota=${cfg.registrationFeePerTeam}, ${cfg.numSimulations} run/candidato`);
  console.log(`Combinazioni da valutare: ${totalCombos}\n`);

  const t0 = Date.now();
  let lastPct = 0;

  const result = runPrizeTableGridSearch(players, cfg, (done, total, label, ms) => {
    const pct = Math.floor((done / total) * 100);
    if (pct >= lastPct + 10 || done === total) {
      console.log(`  ${pct}% [${done}/${total}] ${label} (${ms}ms)`);
      lastPct = pct;
    }
  });

  console.log(`\nCompletato in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log(`Pareto frontier: ${result.paretoFrontier.length} soluzioni non dominate.\n`);

  ensureDir(OUT_DIR);

  writeJSON(path.join(OUT_DIR, 'prize_table_optimizer.json'), result);
  console.log(`JSON → ${path.join(OUT_DIR, 'prize_table_optimizer.json')}`);

  const { headers, rows } = buildCsv(result.allCandidates);
  writeCSV(path.join(OUT_DIR, 'prize_table_candidates.csv'), headers, rows);
  console.log(`CSV  → ${path.join(OUT_DIR, 'prize_table_candidates.csv')} (${rows.length} candidati)`);

  fs.writeFileSync(path.join(OUT_DIR, 'prize_table_report.md'), buildMarkdown(result), 'utf8');
  console.log(`MD   → ${path.join(OUT_DIR, 'prize_table_report.md')}`);

  console.log('\n── Raccomandazioni ─────────────────────────────────────────');
  for (const rec of result.recommendations) {
    console.log(`• ${rec}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
