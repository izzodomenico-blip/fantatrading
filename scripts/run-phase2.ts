/**
 * Fase 2 — Simulazione completa e generazione report
 *
 * Esegue Monte Carlo per 5 scenari (20, 50, 100, 250, 500 partecipanti)
 * e scrive report JSON + CSV nelle cartelle reports/.
 *
 * Uso: npx ts-node scripts/run-phase2.ts
 */

import * as path from 'path';
import { loadPlayers, loadLeagueConfigs, getAverageBaseValue } from '../src/services/dataLoader';
import { runAllScenarios, buildScenarioRows, buildProfitabilityReport } from '../src/services/scenarioAnalyzer';
import { writeJSON, writeCSV } from '../src/services/reportWriter';

const REPORTS_BASE = path.join(__dirname, '../reports');

function banner(text: string): void {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(` ${text}`);
  console.log(`${line}`);
}

function printScenarioTable(rows: ReturnType<typeof buildScenarioRows>): void {
  console.log('\n┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ Scenario   │ N    │ Ops/squadra │ Commissioni │ Montepremi  │ Riv.Piattaf.│ Margine%  │ Premio 1°   │ ROI Vince.% │ ≥0%  │ ≥5%  │');
  console.log('├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤');
  for (const r of rows) {
    const row = [
      r.scenarioId.padEnd(10),
      String(r.numParticipants).padStart(4),
      r.avgOpsPerTeamSeason.toFixed(1).padStart(11),
      r.avgTotalCommissions.toFixed(0).padStart(11),
      r.avgPrizePool.toFixed(0).padStart(11),
      r.avgPlatformRevenue.toFixed(0).padStart(11),
      `${r.avgOrganizerMarginPct.toFixed(1)}%`.padStart(9),
      r.avgFirstPrize.toFixed(0).padStart(11),
      `${r.avgWinnerROIPct.toFixed(0)}%`.padStart(11),
      `${r.pctAbove0.toFixed(1)}%`.padStart(4),
      `${r.pctAbove5.toFixed(1)}%`.padStart(4),
    ].join(' │ ');
    console.log(`│ ${row} │`);
  }
  console.log('└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘');
}

function run(): void {
  banner('FantaTrading — Fase 2: Simulazione e Analisi Economica');

  // ── Caricamento dati ────────────────────────────────────────────────────
  console.log('\n[1/4] Caricamento dataset...');
  const players = loadPlayers();
  const configs = loadLeagueConfigs();
  const avgVal = getAverageBaseValue(players);
  console.log(`  ${players.length} calciatori caricati. Valore medio base: ${avgVal.toFixed(2)} crediti`);
  console.log(`  ${Object.keys(configs).length} configurazioni lega: ${Object.keys(configs).join(', ')}`);

  // ── Simulazioni ─────────────────────────────────────────────────────────
  console.log('\n[2/4] Esecuzione simulazioni Monte Carlo...');
  const scenarioResults = runAllScenarios(players);

  // ── Costruzione report ──────────────────────────────────────────────────
  console.log('\n[3/4] Costruzione report...');
  const labels = Object.fromEntries(Object.entries(configs).map(([id, c]) => [id, c.label]));
  const rows = buildScenarioRows(scenarioResults, labels);
  const profReport = buildProfitabilityReport(rows);

  // ── Scrittura file ──────────────────────────────────────────────────────
  console.log('\n[4/4] Scrittura report su disco...');

  // reports/simulations/
  const simDir = path.join(REPORTS_BASE, 'simulations');
  writeJSON(path.join(simDir, 'monte_carlo_results.json'), {
    generatedAt: new Date().toISOString(),
    regulationVersion: 'v0.1.0',
    scenarios: scenarioResults.map(s => ({
      id: `s${s.config.numTeams}`,
      config: {
        numParticipants: s.config.numTeams,
        numSimulations: s.numRuns,
        operationsPerTeamPerRound: s.config.operationsPerTeamPerRound,
        registrationFeePerTeam: s.config.registrationFeePerTeam,
      },
      stats: {
        avgTotalCommissions: s.avgTotalCommissions,
        avgPrizePool: s.avgPrizePool,
        minPrizePool: s.minPrizePool,
        maxPrizePool: s.maxPrizePool,
        stdDevPrizePool: s.stdDevPrizePool,
        p5PrizePool: s.p5PrizePool,
        p95PrizePool: s.p95PrizePool,
        avgPlatformRevenue: s.avgPlatformRevenue,
        avgOperationsPerTeamSeason: s.avgOperationsPerTeamSeason,
        avgSquadCapitalAtEnd: s.avgSquadCapitalAtEnd,
        avgFirstPrize: s.avgFirstPrize,
        avgSecondPrize: s.avgSecondPrize,
        avgThirdPrize: s.avgThirdPrize,
        pctAbove0: s.pctAbove0,
        pctAbove5: s.pctAbove5,
        avgWinnerROI: s.avgWinnerROI,
        avgParticipantROI: s.avgParticipantROI,
      },
    })),
  });
  console.log('  ✓ reports/simulations/monte_carlo_results.json');

  const CSV_HEADERS = [
    'scenario_id', 'num_participants', 'num_simulations',
    'avg_ops_per_team_season', 'avg_total_commissions',
    'avg_prize_pool', 'min_prize_pool', 'max_prize_pool', 'std_dev_prize_pool', 'p5_prize_pool',
    'avg_registration_fees', 'avg_platform_revenue',
    'avg_organizer_margin_credits', 'avg_organizer_margin_pct', 'org_profit_per_participant',
    'avg_first_prize', 'avg_second_prize', 'avg_third_prize',
    'avg_winner_roi_pct', 'avg_participant_roi_pct', 'pct_above_0', 'pct_above_5',
    'is_sustainable', 'avg_squad_capital_at_end',
  ];

  const csvRows = rows.map(r => [
    r.scenarioId, r.numParticipants, r.numSimulations,
    r.avgOpsPerTeamSeason.toFixed(1), r.avgTotalCommissions.toFixed(2),
    r.avgPrizePool.toFixed(2), r.minPrizePool.toFixed(2), r.maxPrizePool.toFixed(2),
    r.stdDevPrizePool.toFixed(2), r.p5PrizePool.toFixed(2),
    r.avgTotalRegistrationFees.toFixed(2), r.avgPlatformRevenue.toFixed(2),
    r.avgOrganizerMarginCredits.toFixed(2), r.avgOrganizerMarginPct.toFixed(2),
    r.orgProfitPerParticipant.toFixed(2),
    r.avgFirstPrize.toFixed(2), r.avgSecondPrize.toFixed(2), r.avgThirdPrize.toFixed(2),
    r.avgWinnerROIPct.toFixed(1), r.avgParticipantROIPct.toFixed(1),
    r.pctAbove0.toFixed(1), r.pctAbove5.toFixed(1),
    r.isSustainable ? 'true' : 'false', r.avgSquadCapitalAtEnd.toFixed(2),
  ]);

  writeCSV(path.join(simDir, 'scenario_comparison.csv'), CSV_HEADERS, csvRows);
  console.log('  ✓ reports/simulations/scenario_comparison.csv');

  // reports/profitability/
  const profDir = path.join(REPORTS_BASE, 'profitability');
  writeJSON(path.join(profDir, 'profitability_report.json'), profReport);
  console.log('  ✓ reports/profitability/profitability_report.json');

  const orgHeaders = [
    'scenario_id', 'num_participants',
    'total_collected_per_season', 'platform_revenue', 'prize_pool',
    'organizer_margin_pct', 'profit_per_participant',
    'first_prize', 'winner_roi_pct',
    'pct_participants_above_0', 'pct_participants_above_5',
    'verdict',
  ];
  const orgRows = rows.map(r => {
    const totalCollected = r.avgTotalRegistrationFees + r.avgTotalCommissions;
    return [
      r.scenarioId, r.numParticipants,
      totalCollected.toFixed(2), r.avgPlatformRevenue.toFixed(2), r.avgPrizePool.toFixed(2),
      r.avgOrganizerMarginPct.toFixed(2), r.orgProfitPerParticipant.toFixed(2),
      r.avgFirstPrize.toFixed(2), r.avgWinnerROIPct.toFixed(1),
      r.pctAbove0.toFixed(1), r.pctAbove5.toFixed(1),
      r.isSustainable ? 'UTILE' : 'PERDITA',
    ];
  });
  writeCSV(path.join(profDir, 'organizer_analysis.csv'), orgHeaders, orgRows);
  console.log('  ✓ reports/profitability/organizer_analysis.csv');

  // ── Stampa riepilogo a console ───────────────────────────────────────────
  banner('Riepilogo Scenari');
  printScenarioTable(rows);

  banner('Conclusione Economica');
  console.log(`\n  ${profReport.conclusion}\n`);
  profReport.keyInsights.forEach((insight, i) => {
    console.log(`  ${i + 1}. ${insight}`);
  });

  console.log('\n');
}

run();
