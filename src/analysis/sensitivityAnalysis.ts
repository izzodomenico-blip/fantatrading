import { TradingRules, DEFAULT_RULES } from '../config/defaultRules';
import { DEFAULT_PRIZE_TABLE } from '../config/prizeTables';
import { MockPlayer } from '../services/dataLoader';
import { FullSeasonConfig, runScenarioMonteCarlo } from '../services/fullSeasonSimulator';

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface SensitivityPoint {
  paramName: string;
  paramDisplayName: string;
  paramValue: number;
  avgOrganizerMarginPct: number;
  orgProfitPerParticipant: number;
  avgPlatformRevenue: number;
  avgPrizePool: number;
  avgFirstPrize: number;
  avgWinnerROIPct: number;
  pctAbove0: number;
  platformLossRisk: number;
  isSustainable: boolean;
}

export interface SensitivitySweep {
  paramName: string;
  paramDisplayName: string;
  paramUnit: string;
  baselineValue: number;
  points: SensitivityPoint[];
}

export interface SensitivityReport {
  generatedAt: string;
  baselineDescription: string;
  numParticipants: number;
  numSimulations: number;
  sweeps: SensitivitySweep[];
  keyFindings: string[];
}

// ─── Config baseline ──────────────────────────────────────────────────────────

export interface SensitivityBaselineConfig {
  numParticipants: number;
  numSimulations: number;
  operationsPerTeamPerRound: number;
  registrationFeePerTeam: number;
  buyCommissionRate: number;
  sellCommissionRate: number;
  platformFeeRate: number;
  roundsPerSeason: number;
  randomSeed: number;
}

export const DEFAULT_SENSITIVITY_BASELINE: SensitivityBaselineConfig = {
  numParticipants: 50,
  numSimulations: 100,
  operationsPerTeamPerRound: 3.0,
  registrationFeePerTeam: 50,
  buyCommissionRate: 0.02,
  sellCommissionRate: 0.0125,
  platformFeeRate: 0.1,
  roundsPerSeason: 38,
  randomSeed: 42,
};

// ─── Parametri da variare ─────────────────────────────────────────────────────

export interface SensitivityParam {
  name: string;
  displayName: string;
  unit: string;
  values: number[];
  baselineValue: number;
  applyToConfig: (value: number, base: SensitivityBaselineConfig) => Partial<SensitivityBaselineConfig>;
}

export const SENSITIVITY_PARAMS: SensitivityParam[] = [
  {
    name: 'buyCommissionRate',
    displayName: 'Commissione Acquisto',
    unit: '%',
    values: [0.005, 0.01, 0.02, 0.03, 0.05, 0.10],
    baselineValue: DEFAULT_SENSITIVITY_BASELINE.buyCommissionRate,
    applyToConfig: (v) => ({ buyCommissionRate: v }),
  },
  {
    name: 'sellCommissionRate',
    displayName: 'Commissione Vendita',
    unit: '%',
    values: [0.005, 0.0075, 0.0125, 0.02, 0.05, 0.10],
    baselineValue: DEFAULT_SENSITIVITY_BASELINE.sellCommissionRate,
    applyToConfig: (v) => ({ sellCommissionRate: v }),
  },
  {
    name: 'platformFeeRate',
    displayName: 'Margine Piattaforma',
    unit: '%',
    values: [0.0, 0.05, 0.10, 0.15, 0.20, 0.30],
    baselineValue: DEFAULT_SENSITIVITY_BASELINE.platformFeeRate,
    applyToConfig: (v) => ({ platformFeeRate: v }),
  },
  {
    name: 'operationsPerTeamPerRound',
    displayName: 'Operazioni/Squadra/Giornata',
    unit: 'ops',
    values: [0.5, 1.0, 2.0, 3.0, 5.0, 8.0],
    baselineValue: DEFAULT_SENSITIVITY_BASELINE.operationsPerTeamPerRound,
    applyToConfig: (v) => ({ operationsPerTeamPerRound: v }),
  },
  {
    name: 'numParticipants',
    displayName: 'Numero Partecipanti',
    unit: 'N',
    values: [10, 20, 50, 100, 250, 500],
    baselineValue: DEFAULT_SENSITIVITY_BASELINE.numParticipants,
    applyToConfig: (v) => ({ numParticipants: v }),
  },
  {
    name: 'registrationFeePerTeam',
    displayName: 'Quota Iscrizione',
    unit: 'crediti',
    values: [0, 10, 25, 50, 100, 200],
    baselineValue: DEFAULT_SENSITIVITY_BASELINE.registrationFeePerTeam,
    applyToConfig: (v) => ({ registrationFeePerTeam: v }),
  },
  {
    name: 'roundsPerSeason',
    displayName: 'Giornate Stagione',
    unit: 'giornate',
    values: [10, 20, 30, 38, 46, 60],
    baselineValue: DEFAULT_SENSITIVITY_BASELINE.roundsPerSeason,
    applyToConfig: (v) => ({ roundsPerSeason: Math.round(v) }),
  },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

function buildFullConfig(cfg: SensitivityBaselineConfig): FullSeasonConfig {
  const prizePoolRate = Math.max(0, Math.min(1, 1 - cfg.platformFeeRate));
  const rules: TradingRules = {
    ...DEFAULT_RULES,
    buyCommissionRate: cfg.buyCommissionRate,
    sellCommissionRate: cfg.sellCommissionRate,
    prizePoolContributionRate: prizePoolRate,
    platformFeeRate: cfg.platformFeeRate,
    roundsPerSeason: cfg.roundsPerSeason,
  };
  return {
    numTeams: cfg.numParticipants,
    numSimulations: cfg.numSimulations,
    operationsPerTeamPerRound: cfg.operationsPerTeamPerRound,
    registrationFeePerTeam: cfg.registrationFeePerTeam,
    rules,
    prizeTable: DEFAULT_PRIZE_TABLE,
    randomSeed: cfg.randomSeed,
  };
}

export function runSensitivitySweep(
  param: SensitivityParam,
  baseline: SensitivityBaselineConfig,
  players: MockPlayer[],
  onProgress?: (label: string, ms: number) => void,
): SensitivitySweep {
  const points: SensitivityPoint[] = [];

  for (const value of param.values) {
    const overrides = param.applyToConfig(value, baseline);
    const cfg = buildFullConfig({ ...baseline, ...overrides });

    const label = `${param.name}=${value}`;
    const t0 = Date.now();
    const stats = runScenarioMonteCarlo(cfg, players);
    onProgress?.(label, Date.now() - t0);

    points.push({
      paramName: param.name,
      paramDisplayName: param.displayName,
      paramValue: value,
      avgOrganizerMarginPct: stats.avgOrganizerMarginPct,
      orgProfitPerParticipant: stats.orgProfitPerParticipant,
      avgPlatformRevenue: stats.avgPlatformRevenue,
      avgPrizePool: stats.avgPrizePool,
      avgFirstPrize: stats.avgFirstPrize,
      avgWinnerROIPct: stats.avgWinnerROI,
      pctAbove0: stats.pctAbove0,
      platformLossRisk: stats.platformLossRisk,
      isSustainable: stats.isSustainableForOrganizer,
    });
  }

  return {
    paramName: param.name,
    paramDisplayName: param.displayName,
    paramUnit: param.unit,
    baselineValue: param.baselineValue,
    points,
  };
}

export function runAllSensitivitySweeps(
  players: MockPlayer[],
  baseline: SensitivityBaselineConfig = DEFAULT_SENSITIVITY_BASELINE,
  params: SensitivityParam[] = SENSITIVITY_PARAMS,
  onProgress?: (sweep: string, label: string, ms: number) => void,
): SensitivitySweep[] {
  return params.map(param =>
    runSensitivitySweep(param, baseline, players, (label, ms) =>
      onProgress?.(param.displayName, label, ms),
    ),
  );
}

// ─── Report builder ───────────────────────────────────────────────────────────

export function buildSensitivityReport(
  sweeps: SensitivitySweep[],
  baseline: SensitivityBaselineConfig,
): SensitivityReport {
  return {
    generatedAt: new Date().toISOString(),
    baselineDescription: `N=${baseline.numParticipants}, buy=${(baseline.buyCommissionRate * 100).toFixed(2)}%, sell=${(baseline.sellCommissionRate * 100).toFixed(3)}%, platform=${(baseline.platformFeeRate * 100).toFixed(0)}%, ops/round=${baseline.operationsPerTeamPerRound}, fee=${baseline.registrationFeePerTeam}, rounds=${baseline.roundsPerSeason}`,
    numParticipants: baseline.numParticipants,
    numSimulations: baseline.numSimulations,
    sweeps,
    keyFindings: generateFindings(sweeps),
  };
}

function generateFindings(sweeps: SensitivitySweep[]): string[] {
  const findings: string[] = [];

  // Parametro con maggiore sensibilità sul margine
  const marginRanges = sweeps.map(s => ({
    name: s.paramDisplayName,
    param: s.paramName,
    range: Math.max(...s.points.map(p => p.avgOrganizerMarginPct)) - Math.min(...s.points.map(p => p.avgOrganizerMarginPct)),
  })).sort((a, b) => b.range - a.range);

  if (marginRanges.length > 0) {
    const top = marginRanges[0];
    const second = marginRanges[1];
    findings.push(
      `SENSIBILITÀ MARGINE: "${top.name}" è il parametro con maggiore impatto sul margine organizzatore (range ${top.range.toFixed(1)}pp), seguito da "${second?.name}" (${second?.range.toFixed(1)}pp).`,
    );
  }

  // Parametro con maggiore impatto sul ROI vincitore
  const roiRanges = sweeps.map(s => ({
    name: s.paramDisplayName,
    range: Math.max(...s.points.map(p => p.avgWinnerROIPct)) - Math.min(...s.points.map(p => p.avgWinnerROIPct)),
  })).sort((a, b) => b.range - a.range);

  if (roiRanges.length > 0) {
    const top = roiRanges[0];
    findings.push(
      `SENSIBILITÀ ROI VINCITORE: "${top.name}" ha l'impatto maggiore sul ROI del vincitore (range ${top.range.toFixed(0)}pp).`,
    );
  }

  // Operazioni per round
  const ops = sweeps.find(s => s.paramName === 'operationsPerTeamPerRound');
  if (ops && ops.points.length >= 2) {
    const low = ops.points[0];
    const high = ops.points[ops.points.length - 1];
    if (low.avgPrizePool > 0) {
      findings.push(
        `VOLUME OPERAZIONI: Da ${low.paramValue} a ${high.paramValue} ops/squadra/giornata il montepremi cresce di ${(high.avgPrizePool / low.avgPrizePool).toFixed(1)}x. Più giocatori attivi = montepremi proporzionalmente più ricco.`,
      );
    }
  }

  // Quota iscrizione
  const fee = sweeps.find(s => s.paramName === 'registrationFeePerTeam');
  if (fee) {
    const zeroFee = fee.points.find(p => p.paramValue === 0);
    const maxFee = fee.points[fee.points.length - 1];
    if (zeroFee) {
      findings.push(
        `QUOTA ISCRIZIONE: Senza quota la piattaforma si affida solo alle commissioni (margine ${zeroFee.avgOrganizerMarginPct.toFixed(1)}%); con quota=${maxFee.paramValue} il ricavo sale a ${maxFee.avgPlatformRevenue.toFixed(0)} crediti/stagione (+${(((maxFee.avgPlatformRevenue / (zeroFee.avgPlatformRevenue || 1)) - 1) * 100).toFixed(0)}%).`,
      );
    }
  }

  // Scala partecipanti
  const nParam = sweeps.find(s => s.paramName === 'numParticipants');
  if (nParam && nParam.points.length >= 2) {
    const nMin = nParam.points[0];
    const nMax = nParam.points[nParam.points.length - 1];
    if (nMin.avgPlatformRevenue > 0) {
      findings.push(
        `SCALA PARTECIPANTI: Il ricavo organizzatore scala di ${(nMax.avgPlatformRevenue / nMin.avgPlatformRevenue).toFixed(1)}x tra N=${nMin.paramValue} e N=${nMax.paramValue} — quasi lineare, il modello non presenta economie di scala.`,
      );
    }
  }

  // Numero giornate
  const rounds = sweeps.find(s => s.paramName === 'roundsPerSeason');
  if (rounds && rounds.points.length >= 2) {
    const r10 = rounds.points[0];
    const r60 = rounds.points[rounds.points.length - 1];
    findings.push(
      `LUNGHEZZA STAGIONE: Con ${r10.paramValue} giornate il montepremi è ${r10.avgPrizePool.toFixed(0)} crediti; con ${r60.paramValue} giornate sale a ${r60.avgPrizePool.toFixed(0)} (${(r60.avgPrizePool / r10.avgPrizePool).toFixed(1)}x). Stagioni più lunghe aumentano montepremi e premi.`,
    );
  }

  return findings;
}
