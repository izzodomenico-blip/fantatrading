import { ALL_RULE_MODELS, RuleModel, buildConfig } from '../config/ruleModels';
import { MockPlayer } from './dataLoader';
import { ScenarioStats, runScenarioMonteCarlo } from './fullSeasonSimulator';

// ─── Tipi output ──────────────────────────────────────────────────────────────

export interface ComparisonScenarioKey {
  modelId: string;
  numParticipants: number;
}

export interface ComparisonRow {
  modelId: string;
  modelName: string;
  numParticipants: number;
  registrationFeePerTeam: number;
  /** Capitale medio investito per squadra per stagione (commissioni pagate) */
  avgCapitalInvestedPerTeam: number;
  /** Numero medio operazioni per squadra per stagione */
  avgOpsPerTeamSeason: number;
  /** Commissioni trading totali medie */
  avgTotalCommissions: number;
  /** Flusso lordo totale medio (commissioni + quote) */
  avgGrossInflow: number;
  /** Montepremi netto distribuito */
  avgPrizePool: number;
  /** Premi distribuiti (top 3) */
  avgFirstPrize: number;
  avgSecondPrize: number;
  avgThirdPrize: number;
  /** Ricavo piattaforma medio */
  avgPlatformRevenue: number;
  /** Margine organizzatore % sul lordo */
  avgOrganizerMarginPct: number;
  /** Profitto organizzatore per partecipante */
  orgProfitPerParticipant: number;
  /** ROI medio partecipanti sulla quota d'iscrizione */
  avgParticipantROIPct: number;
  /** ROI vincitore medio */
  avgWinnerROIPct: number;
  /** % partecipanti che recuperano la quota (prize >= fee) */
  pctAbove0: number;
  /** % partecipanti con ROI >= 5% sulla quota */
  pctAbove5: number;
  /** % run con piattaforma a zero incasso (rischio perdita) */
  platformLossRisk: number;
  isSustainable: boolean;
}

export interface ComparisonReport {
  generatedAt: string;
  participantCounts: number[];
  models: Array<{ id: string; name: string; description: string }>;
  rows: ComparisonRow[];
  recommendations: string[];
}

// ─── Configurazione run ───────────────────────────────────────────────────────

const PARTICIPANT_COUNTS = [20, 50, 100, 250, 500];
const OPS_PER_TEAM_ROUND = 3.0;
const RANDOM_SEED = 42;

const NUM_SIMULATIONS: Record<number, number> = {
  20: 200,
  50: 150,
  100: 100,
  250: 50,
  500: 30,
};

const REG_FEE_BY_MODEL: Record<string, number> = {
  M1: 50,
  M2: 50,
  M3: 50,
  M4: 10,
  M5: 10,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export function runRuleComparison(
  players: MockPlayer[],
  models: RuleModel[] = ALL_RULE_MODELS,
  participantCounts: number[] = PARTICIPANT_COUNTS,
  onProgress?: (label: string, ms: number) => void,
): ComparisonRow[] {
  const rows: ComparisonRow[] = [];

  for (const model of models) {
    const regFee = REG_FEE_BY_MODEL[model.id] ?? 50;
    for (const n of participantCounts) {
      const config = buildConfig(
        model,
        n,
        NUM_SIMULATIONS[n] ?? 100,
        regFee,
        OPS_PER_TEAM_ROUND,
        RANDOM_SEED,
      );
      const label = `${model.id} / N=${n}`;
      const t0 = Date.now();
      const stats = runScenarioMonteCarlo(config, players);
      onProgress?.(label, Date.now() - t0);

      rows.push(buildRow(model, regFee, stats));
    }
  }

  return rows;
}

function buildRow(model: RuleModel, registrationFeePerTeam: number, s: ScenarioStats): ComparisonRow {
  const avgCapitalInvestedPerTeam = s.avgTotalCommissions / s.config.numTeams;

  return {
    modelId: model.id,
    modelName: model.name,
    numParticipants: s.config.numTeams,
    registrationFeePerTeam,
    avgCapitalInvestedPerTeam,
    avgOpsPerTeamSeason: s.avgOperationsPerTeamSeason,
    avgTotalCommissions: s.avgTotalCommissions,
    avgGrossInflow: s.avgGrossInflow,
    avgPrizePool: s.avgPrizePool,
    avgFirstPrize: s.avgFirstPrize,
    avgSecondPrize: s.avgSecondPrize,
    avgThirdPrize: s.avgThirdPrize,
    avgPlatformRevenue: s.avgPlatformRevenue,
    avgOrganizerMarginPct: s.avgOrganizerMarginPct,
    orgProfitPerParticipant: s.orgProfitPerParticipant,
    avgParticipantROIPct: s.avgParticipantROI,
    avgWinnerROIPct: s.avgWinnerROI,
    pctAbove0: s.pctAbove0,
    pctAbove5: s.pctAbove5,
    platformLossRisk: s.platformLossRisk,
    isSustainable: s.isSustainableForOrganizer,
  };
}

// ─── Report builder ───────────────────────────────────────────────────────────

export function buildComparisonReport(rows: ComparisonRow[]): ComparisonReport {
  const participantCounts = [...new Set(rows.map(r => r.numParticipants))].sort((a, b) => a - b);
  const models = ALL_RULE_MODELS.map(m => ({ id: m.id, name: m.name, description: m.description }));

  const recommendations = generateRecommendations(rows, participantCounts);

  return {
    generatedAt: new Date().toISOString(),
    participantCounts,
    models,
    rows,
    recommendations,
  };
}

function generateRecommendations(rows: ComparisonRow[], counts: number[]): string[] {
  const recs: string[] = [];

  // Sostenibilità
  const unsustainable = rows.filter(r => !r.isSustainable);
  if (unsustainable.length === 0) {
    recs.push('SOSTENIBILITÀ: Tutti e 5 i modelli sono sostenibili per l\'organizzatore in tutti gli scenari.');
  } else {
    const ids = [...new Set(unsustainable.map(r => r.modelId))].join(', ');
    recs.push(`ATTENZIONE: I modelli ${ids} presentano scenari con ricavo piattaforma ≤ 0.`);
  }

  // Margine organizzatore per N=100 (pivot)
  const pivot = rows.filter(r => r.numParticipants === 100);
  if (pivot.length > 0) {
    const best = [...pivot].sort((a, b) => b.avgOrganizerMarginPct - a.avgOrganizerMarginPct)[0];
    const worst = [...pivot].sort((a, b) => a.avgOrganizerMarginPct - b.avgOrganizerMarginPct)[0];
    recs.push(
      `MARGINE (N=100): Il modello con margine % più alto è ${best.modelId} (${best.avgOrganizerMarginPct.toFixed(1)}%); il più basso è ${worst.modelId} (${worst.avgOrganizerMarginPct.toFixed(1)}%).`,
    );
  }

  // Attrattività vincitore
  const pivotLarge = rows.filter(r => r.numParticipants === 500);
  if (pivotLarge.length > 0) {
    const bestROI = [...pivotLarge].sort((a, b) => b.avgWinnerROIPct - a.avgWinnerROIPct)[0];
    recs.push(
      `ATTRATTIVITÀ VINCITORE (N=500): ROI vincitore più alto con ${bestROI.modelId} (${bestROI.avgWinnerROIPct.toFixed(0)}%), quota d'iscrizione ${bestROI.registrationFeePerTeam} crediti.`,
    );
  }

  // Partecipanti break-even
  const n20 = rows.filter(r => r.numParticipants === 20);
  if (n20.length > 0) {
    const breakValues = n20.map(r => r.pctAbove0);
    const minBreak = Math.min(...breakValues);
    const maxBreak = Math.max(...breakValues);
    if (maxBreak - minBreak > 0.5) {
      const bestBreak = [...n20].sort((a, b) => b.pctAbove0 - a.pctAbove0)[0];
      const worstBreak = [...n20].sort((a, b) => a.pctAbove0 - b.pctAbove0)[0];
      recs.push(
        `BREAK-EVEN QUOTA (N=20): con ${bestBreak.modelId} il ${bestBreak.pctAbove0.toFixed(1)}% dei partecipanti recupera la quota; con ${worstBreak.modelId} solo il ${worstBreak.pctAbove0.toFixed(1)}%.`,
      );
    } else {
      recs.push(
        `BREAK-EVEN QUOTA (N=20): ${maxBreak.toFixed(1)}% dei partecipanti recupera la quota d'iscrizione — uniforme tra tutti i modelli (dipende solo dalla struttura dei premi, non dal modello di commissione).`,
      );
    }
  }

  // Raccomandazione finale
  const sustainableAt100 = pivot.filter(r => r.isSustainable);
  if (sustainableAt100.length > 0) {
    const recommended = [...sustainableAt100].sort((a, b) => {
      // Criteri: margine positivo, break-even decente, ROI vincitore alto
      const scoreA = a.avgOrganizerMarginPct * 0.4 + a.pctAbove0 * 0.3 + Math.log1p(a.avgWinnerROIPct) * 0.3;
      const scoreB = b.avgOrganizerMarginPct * 0.4 + b.pctAbove0 * 0.3 + Math.log1p(b.avgWinnerROIPct) * 0.3;
      return scoreB - scoreA;
    })[0];
    recs.push(
      `RACCOMANDAZIONE: Il modello ${recommended.modelId} ("${recommended.modelName}") offre il miglior equilibrio tra sostenibilità organizzatore (${recommended.avgOrganizerMarginPct.toFixed(1)}%) e attrattività per i partecipanti (break-even ${recommended.pctAbove0.toFixed(1)}%, ROI vincitore ${recommended.avgWinnerROIPct.toFixed(0)}%) a N=100.`,
    );
  }

  return recs;
}
