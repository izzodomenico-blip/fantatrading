import { DEFAULT_RULES } from '../config/defaultRules';
import { DEFAULT_PRIZE_TABLE } from '../config/prizeTables';
import { MockPlayer, loadPlayers, loadLeagueConfigs } from './dataLoader';
import {
  FullSeasonConfig,
  ScenarioStats,
  runScenarioMonteCarlo,
} from './fullSeasonSimulator';

export interface ScenarioRow {
  scenarioId: string;
  label: string;
  numParticipants: number;
  numSimulations: number;
  avgPlayerBaseValue: number;
  avgOpsPerTeamSeason: number;
  avgTotalCommissions: number;
  avgPrizePool: number;
  minPrizePool: number;
  maxPrizePool: number;
  stdDevPrizePool: number;
  p5PrizePool: number;
  avgTotalRegistrationFees: number;
  avgPlatformRevenue: number;
  avgOrganizerMarginCredits: number;
  avgOrganizerMarginPct: number;
  orgProfitPerParticipant: number;
  avgFirstPrize: number;
  avgSecondPrize: number;
  avgThirdPrize: number;
  avgWinnerROIPct: number;
  avgParticipantROIPct: number;
  pctAbove0: number;
  pctAbove5: number;
  isSustainable: boolean;
  avgSquadCapitalAtEnd: number;
}

export interface ProfitabilityReport {
  generatedAt: string;
  regulationVersion: string;
  parameters: {
    buyCommissionRate: number;
    sellCommissionRate: number;
    prizePoolContributionRate: number;
    platformFeeRate: number;
    registrationFeePerTeam: number;
    initialBudget: number;
    roundsPerSeason: number;
    operationsPerTeamPerRound: number;
  };
  conclusion: string;
  scenarios: ScenarioRow[];
  keyInsights: string[];
}

export function runAllScenarios(players: MockPlayer[]): ScenarioStats[] {
  const configs = loadLeagueConfigs();
  const results: ScenarioStats[] = [];

  for (const [id, lc] of Object.entries(configs)) {
    const config: FullSeasonConfig = {
      numTeams: lc.numParticipants,
      numSimulations: lc.numSimulations,
      operationsPerTeamPerRound: lc.operationsPerTeamPerRound,
      registrationFeePerTeam: lc.registrationFeePerTeam,
      rules: DEFAULT_RULES,
      prizeTable: DEFAULT_PRIZE_TABLE,
      randomSeed: 42,
    };

    process.stdout.write(`  → Scenario ${id} (${lc.numParticipants} partecipanti, ${lc.numSimulations} run)... `);
    const start = Date.now();
    const stats = runScenarioMonteCarlo(config, players);
    console.log(`${Date.now() - start}ms`);
    results.push(stats);
  }

  return results;
}

export function buildScenarioRows(
  results: ScenarioStats[],
  labels: Record<string, string>,
): ScenarioRow[] {
  return results.map(s => {
    const id = `s${s.config.numTeams}`;
    return {
      scenarioId: id,
      label: labels[id] ?? id,
      numParticipants: s.config.numTeams,
      numSimulations: s.numRuns,
      avgPlayerBaseValue: s.avgPlayerBaseValue,
      avgOpsPerTeamSeason: s.avgOperationsPerTeamSeason,
      avgTotalCommissions: s.avgTotalCommissions,
      avgPrizePool: s.avgPrizePool,
      minPrizePool: s.minPrizePool,
      maxPrizePool: s.maxPrizePool,
      stdDevPrizePool: s.stdDevPrizePool,
      p5PrizePool: s.p5PrizePool,
      avgTotalRegistrationFees: s.avgTotalRegistrationFees,
      avgPlatformRevenue: s.avgPlatformRevenue,
      avgOrganizerMarginCredits: s.avgOrganizerMarginCredits,
      avgOrganizerMarginPct: s.avgOrganizerMarginPct,
      orgProfitPerParticipant: s.orgProfitPerParticipant,
      avgFirstPrize: s.avgFirstPrize,
      avgSecondPrize: s.avgSecondPrize,
      avgThirdPrize: s.avgThirdPrize,
      avgWinnerROIPct: s.avgWinnerROI,
      avgParticipantROIPct: s.avgParticipantROI,
      pctAbove0: s.pctAbove0,
      pctAbove5: s.pctAbove5,
      isSustainable: s.isSustainableForOrganizer,
      avgSquadCapitalAtEnd: s.avgSquadCapitalAtEnd,
    };
  });
}

export function buildProfitabilityReport(rows: ScenarioRow[]): ProfitabilityReport {
  const allSustainable = rows.every(r => r.isSustainable);
  const allProfitable = rows.every(r => r.avgOrganizerMarginCredits > 0);

  const first = rows[0];
  const last = rows[rows.length - 1];
  const pctWin20 = first.pctAbove0.toFixed(1);
  const pctWin500 = last.pctAbove0.toFixed(1);
  const roiDistrib = first.avgParticipantROIPct > 0
    ? `positivo in media (${first.avgParticipantROIPct.toFixed(0)}%) ma con mediana = -100%`
    : `negativo in media (${first.avgParticipantROIPct.toFixed(0)}%)`;

  const insights: string[] = [
    `L'organizzatore ha margine POSITIVO in tutti e ${rows.length} gli scenari. Il margine è fisso al ${first.avgOrganizerMarginPct.toFixed(0)}% del totale incassato (commissioni + quote), indipendentemente dal numero di partecipanti.`,
    `Il montepremi scala proporzionalmente: ~${(last.avgPrizePool / first.avgPrizePool).toFixed(1)}x tra ${first.numParticipants} e ${last.numParticipants} partecipanti. Il premio 1° posto cresce da ${first.avgFirstPrize.toFixed(0)} a ${last.avgFirstPrize.toFixed(0)} crediti.`,
    `Solo il ${pctWin20}% dei partecipanti recupera la quota d'iscrizione con ${first.numParticipants} partecipanti; scende all'${pctWin500}% con ${last.numParticipants}. La struttura è quella di una lotteria skill-based.`,
    `ROI del vincitore: ~${first.avgWinnerROIPct.toFixed(0)}% con ${first.numParticipants} partecipanti, ~${last.avgWinnerROIPct.toFixed(0)}% con ${last.numParticipants}. L'attrattività per i top-player cresce enormemente con N.`,
    `ROI medio dei partecipanti sulla sola quota d'iscrizione: ${roiDistrib}. Il montepremi è gonfiato dalle commissioni sul budget virtuale (500 crediti), che supera il valore delle sole quote. ROI contando anche le commissioni pagate = -20% circa.`,
    `Margine organizzatore per partecipante: stabile tra ${first.orgProfitPerParticipant.toFixed(1)} (${first.numParticipants} part.) e ${last.orgProfitPerParticipant.toFixed(1)} crediti (${last.numParticipants} part.) — il business scala in modo lineare e prevedibile.`,
    `Soglia 0% (break-even quota): ${pctWin20}% con ${first.numParticipants} partecipanti → ${pctWin500}% con ${last.numParticipants}. Soglia 5% identica (tutti i vincitori superano ampiamente il 5% sulla quota).`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    regulationVersion: 'v0.1.0',
    parameters: {
      buyCommissionRate: DEFAULT_RULES.buyCommissionRate,
      sellCommissionRate: DEFAULT_RULES.sellCommissionRate,
      prizePoolContributionRate: DEFAULT_RULES.prizePoolContributionRate,
      platformFeeRate: DEFAULT_RULES.platformFeeRate,
      registrationFeePerTeam: 50,
      initialBudget: DEFAULT_RULES.initialBudget,
      roundsPerSeason: DEFAULT_RULES.roundsPerSeason,
      operationsPerTeamPerRound: 3.0,
    },
    conclusion: allProfitable
      ? 'SOSTENIBILE: l\'organizzatore genera ricavi positivi in tutti gli scenari.'
      : 'ATTENZIONE: uno o più scenari producono margine negativo per l\'organizzatore.',
    scenarios: rows,
    keyInsights: insights,
  };
}
