import { TradingRules, DEFAULT_RULES } from '../config/defaultRules';
import { PrizeDistribution, DEFAULT_PRIZE_TABLE } from '../config/prizeTables';
import { MockPlayer } from './dataLoader';
import { generatePlayerStats } from '../utils/statsGenerator';
import { calculateBonusMalus, applyBonusMalusToValue, DEFAULT_BONUS_MALUS_RULES } from '../engine/bonusMalusEngine';
import { calculateBuyCost, calculateSellProceeds } from '../engine/marketEngine';
import { splitCommission, calculatePrizeDistribution } from '../engine/prizePoolEngine';
import { createSeededRng, poissonSample } from '../utils/randomUtils';
import { mean, stdDev, percentile } from '../utils/mathUtils';

// ─── Configurazione ───────────────────────────────────────────────────────────

export interface FullSeasonConfig {
  numTeams: number;
  numSimulations: number;
  operationsPerTeamPerRound: number;
  registrationFeePerTeam: number;
  rules: TradingRules;
  prizeTable: PrizeDistribution[];
  randomSeed: number;
  /**
   * Quota della registration fee che va alla piattaforma.
   * Se undefined, usa rules.platformFeeRate (comportamento Fase 2, retrocompatibile).
   * Impostare a 1.0 per mandare 100% della quota iscrizione alla piattaforma (modelli 4, 5).
   */
  registrationFeePlatformRate?: number;
}

export const DEFAULT_FULL_SEASON_CONFIG: FullSeasonConfig = {
  numTeams: 20,
  numSimulations: 100,
  operationsPerTeamPerRound: 3.0,
  registrationFeePerTeam: 50,
  rules: DEFAULT_RULES,
  prizeTable: DEFAULT_PRIZE_TABLE,
  randomSeed: 42,
};

// ─── Risultati ────────────────────────────────────────────────────────────────

export interface TeamOutcome {
  /** Rank finale (1 = vincitore) */
  rank: number;
  finalBudget: number;
  portfolioValue: number;
  totalWealth: number;
  commissionsPaid: number;
  opCount: number;
  prize: number;
  /** ROI sul solo costo di iscrizione: (prize - registrationFee) / registrationFee */
  roiOnRegistration: number;
  /** Profitto netto: prize - registrationFee - commissionsPaid */
  netProfit: number;
}

export interface SingleRunResult {
  teamOutcomes: TeamOutcome[];
  totalCommissionsFromTrading: number;
  totalRegistrationFees: number;
  /** Totale flussi lordi in ingresso (commissioni + quote iscrizione) */
  grossInflow: number;
  prizePool: number;
  platformRevenue: number;
  totalOperations: number;
}

export interface ScenarioStats {
  config: FullSeasonConfig;
  /** Numero di run effettuate */
  numRuns: number;
  /** Valore medio dei calciatori nel dataset */
  avgPlayerBaseValue: number;

  // ── Volume operazioni ──────────────────────────────
  avgTotalOperations: number;
  avgOperationsPerTeamSeason: number;

  // ── Capitali ──────────────────────────────────────
  avgSquadCapitalAtEnd: number;

  // ── Commissioni e montepremi ──────────────────────
  avgTotalCommissions: number;
  /** Flusso lordo medio = commissioni + quote iscrizione (prima dello split) */
  avgGrossInflow: number;
  avgPrizePool: number;
  minPrizePool: number;
  maxPrizePool: number;
  stdDevPrizePool: number;
  p5PrizePool: number;
  p95PrizePool: number;

  // ── Organizzatore ─────────────────────────────────
  avgTotalRegistrationFees: number;
  avgPlatformRevenue: number;
  /** % run in cui la piattaforma incassa zero (piattaforma senza margine fisso) */
  platformLossRisk: number;
  avgOrganizerMarginCredits: number;
  /** Margine organizzatore su totale lordo in ingresso (commissioni + quote) */
  avgOrganizerMarginPct: number;

  // ── Premi ─────────────────────────────────────────
  avgFirstPrize: number;
  avgSecondPrize: number;
  avgThirdPrize: number;

  // ── ROI partecipanti ──────────────────────────────
  avgWinnerROI: number;
  avgParticipantROI: number;
  /** % partecipanti con prize ≥ registrationFee (break-even sulla quota) */
  pctAbove0: number;
  /** % partecipanti con prize ≥ registrationFee × 1.05 */
  pctAbove5: number;

  // ── Sostenibilità ─────────────────────────────────
  isSustainableForOrganizer: boolean;
  orgProfitPerParticipant: number;
}

// ─── Stato interno simulazione (lean, senza overhead oggetti domain) ──────────

interface InternalTeam {
  budget: number;
  holdings: Record<string, number>; // playerId → shares
  commissionsPaid: number;
  opCount: number;
  roleCounts: Record<string, number>; // GK/DEF/MID/FWD → numero calciatori distinti detenuti
}

// ─── Core simulation ──────────────────────────────────────────────────────────

function runOneSeason(
  config: FullSeasonConfig,
  players: MockPlayer[],
  rng: () => number,
): SingleRunResult {
  const { numTeams, rules, prizeTable, operationsPerTeamPerRound, registrationFeePerTeam } = config;

  // Indice rapido playerId → indice
  const playerIndex = new Map(players.map((p, i) => [p.id, i]));

  // Inizializza squadre
  const teams: InternalTeam[] = Array.from({ length: numTeams }, () => ({
    budget: rules.initialBudget,
    holdings: {},
    commissionsPaid: 0,
    opCount: 0,
    roleCounts: { GK: 0, DEF: 0, MID: 0, FWD: 0 },
  }));

  // Valori correnti dei calciatori (mutable durante la stagione)
  const playerValues = players.map(p => p.baseValue);

  let totalCommissions = 0;

  for (let round = 0; round < rules.roundsPerSeason; round++) {
    // ── Aggiorna valori calciatori con bonus/malus basati su stats casuali ──
    for (let pi = 0; pi < players.length; pi++) {
      const stats = generatePlayerStats(players[pi].role, rng);
      const bm = calculateBonusMalus(stats, players[pi].role, DEFAULT_BONUS_MALUS_RULES);
      let newValue = applyBonusMalusToValue(
        playerValues[pi], bm.total, rules.playerMinValue, rules.playerMaxValue,
      );
      // Mean reversion: tira il valore verso il baseValue del calciatore
      if (rules.meanReversionRate > 0) {
        newValue += (players[pi].baseValue - newValue) * rules.meanReversionRate;
        newValue = Math.max(rules.playerMinValue, Math.min(rules.playerMaxValue, newValue));
      }
      playerValues[pi] = newValue;
    }

    // ── Operazioni di mercato per ogni squadra ───────────────────────────────
    for (const team of teams) {
      const numOps = poissonSample(operationsPerTeamPerRound, rng);

      for (let op = 0; op < numOps; op++) {
        // Sceglie casualmente buy (55%) o sell (45%) — leggero bias verso acquisti
        const isBuy = rng() < 0.55;

        if (isBuy) {
          const pi = Math.floor(rng() * players.length);
          const price = playerValues[pi];
          const { totalCost, commission } = calculateBuyCost(1, price, rules);
          const playerId = players[pi].id;
          const playerRole = players[pi].role;
          const alreadyOwned = (team.holdings[playerId] ?? 0) > 0;
          const maxForRole =
            rules.rosterComposition[playerRole as keyof typeof rules.rosterComposition] ??
            rules.maxPlayersPerPortfolio;
          const canAddToRoster = alreadyOwned || (team.roleCounts[playerRole] ?? 0) < maxForRole;

          if (team.budget >= totalCost + rules.minBudgetReserve && canAddToRoster) {
            team.budget -= totalCost;
            team.commissionsPaid += commission;
            if (!alreadyOwned) {
              team.roleCounts[playerRole] = (team.roleCounts[playerRole] ?? 0) + 1;
            }
            team.holdings[playerId] = (team.holdings[playerId] ?? 0) + 1;
            team.opCount++;
            totalCommissions += commission;
          }
        } else {
          // Cerca di vendere un calciatore casuale dal portafoglio
          const ownedIds = Object.keys(team.holdings);
          if (ownedIds.length > 0) {
            const sellId = ownedIds[Math.floor(rng() * ownedIds.length)];
            const sellPi = playerIndex.get(sellId) ?? -1;
            if (sellPi >= 0) {
              const price = playerValues[sellPi];
              const { netProceeds, commission } = calculateSellProceeds(1, price, rules);
              team.budget += netProceeds;
              team.commissionsPaid += commission;
              team.holdings[sellId]--;
              if (team.holdings[sellId] === 0) {
                delete team.holdings[sellId];
                team.roleCounts[players[sellPi].role]--;
              }
              team.opCount++;
              totalCommissions += commission;
            }
          }
        }
      }
    }
  }

  // ── Calcola valore finale portfolios ─────────────────────────────────────
  const teamOutcomes: TeamOutcome[] = teams.map(team => {
    let portfolioValue = 0;
    for (const [playerId, shares] of Object.entries(team.holdings)) {
      const pi = playerIndex.get(playerId) ?? -1;
      if (pi >= 0) portfolioValue += playerValues[pi] * shares;
    }
    return {
      rank: 0,
      finalBudget: team.budget,
      portfolioValue,
      totalWealth: team.budget + portfolioValue,
      commissionsPaid: team.commissionsPaid,
      opCount: team.opCount,
      prize: 0,
      roiOnRegistration: -1, // sarà settato dopo
      netProfit: 0,
    };
  });

  // ── Montepremi ────────────────────────────────────────────────────────────
  const totalRegistrationFees = numTeams * registrationFeePerTeam;
  const regPlatformRate = config.registrationFeePlatformRate ?? rules.platformFeeRate;
  const regToPlatform = totalRegistrationFees * regPlatformRate;
  const regToPrizePool = totalRegistrationFees * (1 - regPlatformRate);
  const { toPrizePool: ppFromTrading, toPlatform: platFromTrading } = splitCommission(totalCommissions, rules);
  const prizePool = ppFromTrading + regToPrizePool;
  const platformRevenue = platFromTrading + regToPlatform;
  const grossInflow = totalCommissions + totalRegistrationFees;

  // ── Ranking per ricchezza totale ──────────────────────────────────────────
  const sorted = teamOutcomes
    .map((o, idx) => ({ ...o, idx }))
    .sort((a, b) => b.totalWealth - a.totalWealth);

  const prizes = calculatePrizeDistribution(prizePool, prizeTable);

  sorted.forEach((entry, rankIdx) => {
    const rank = rankIdx + 1;
    const prize = prizes.find(p => p.rank === rank)?.amount ?? 0;
    teamOutcomes[entry.idx].rank = rank;
    teamOutcomes[entry.idx].prize = prize;
    teamOutcomes[entry.idx].roiOnRegistration = (prize - registrationFeePerTeam) / (registrationFeePerTeam || 1);
    teamOutcomes[entry.idx].netProfit = prize - registrationFeePerTeam - teamOutcomes[entry.idx].commissionsPaid;
  });

  return {
    teamOutcomes,
    totalCommissionsFromTrading: totalCommissions,
    totalRegistrationFees,
    grossInflow,
    prizePool,
    platformRevenue,
    totalOperations: teamOutcomes.reduce((s, t) => s + t.opCount, 0),
  };
}

// ─── Monte Carlo aggregation ──────────────────────────────────────────────────

export function runScenarioMonteCarlo(
  config: FullSeasonConfig,
  players: MockPlayer[],
): ScenarioStats {
  const rng = createSeededRng(config.randomSeed);
  const runs: SingleRunResult[] = [];

  for (let i = 0; i < config.numSimulations; i++) {
    runs.push(runOneSeason(config, players, rng));
  }

  // Metriche aggregate
  const pools = runs.map(r => r.prizePool);
  const platformRevs = runs.map(r => r.platformRevenue);
  const totalOps = runs.map(r => r.totalOperations);

  const avgPlayerBaseValue = players.reduce((s, p) => s + p.baseValue, 0) / players.length;
  const avgTotalOps = mean(totalOps);

  // Per i ROI: aggrega su tutte le squadre di tutte le run
  const allROIs: number[] = runs.flatMap(r => r.teamOutcomes.map(t => t.roiOnRegistration));
  const allWealths: number[] = runs.flatMap(r => r.teamOutcomes.map(t => t.totalWealth));

  // Raccoglie il prize del vincitore (rank=1) e i primi 3
  const winnerROIs: number[] = runs.map(r => r.teamOutcomes.find(t => t.rank === 1)?.roiOnRegistration ?? -1);
  const firstPrizes: number[] = runs.map(r => r.teamOutcomes.find(t => t.rank === 1)?.prize ?? 0);
  const secondPrizes: number[] = runs.map(r => r.teamOutcomes.find(t => t.rank === 2)?.prize ?? 0);
  const thirdPrizes: number[] = runs.map(r => r.teamOutcomes.find(t => t.rank === 3)?.prize ?? 0);

  const registrationFeePerTeam = config.registrationFeePerTeam;
  const pctAbove0 = allROIs.filter(r => r >= 0).length / allROIs.length * 100;
  const pctAbove5 = allROIs.filter(r => r >= 0.05).length / allROIs.length * 100;

  const avgPlatformRevenue = mean(platformRevs);
  const grossInflows = runs.map(r => r.grossInflow);
  const avgGrossInflow = mean(grossInflows);
  const platformLossRisk = platformRevs.filter(v => v <= 0).length / platformRevs.length * 100;

  return {
    config,
    numRuns: runs.length,
    avgPlayerBaseValue,

    avgTotalOperations: avgTotalOps,
    avgOperationsPerTeamSeason: avgTotalOps / config.numTeams,

    avgSquadCapitalAtEnd: mean(allWealths),

    avgTotalCommissions: mean(runs.map(r => r.totalCommissionsFromTrading)),
    avgGrossInflow,
    avgPrizePool: mean(pools),
    minPrizePool: Math.min(...pools),
    maxPrizePool: Math.max(...pools),
    stdDevPrizePool: stdDev(pools),
    p5PrizePool: percentile(pools, 5),
    p95PrizePool: percentile(pools, 95),

    avgTotalRegistrationFees: mean(runs.map(r => r.totalRegistrationFees)),
    avgPlatformRevenue,
    platformLossRisk,
    avgOrganizerMarginCredits: avgPlatformRevenue,
    avgOrganizerMarginPct: avgGrossInflow > 0 ? (avgPlatformRevenue / avgGrossInflow) * 100 : 0,

    avgFirstPrize: mean(firstPrizes),
    avgSecondPrize: mean(secondPrizes),
    avgThirdPrize: mean(thirdPrizes),

    avgWinnerROI: mean(winnerROIs) * 100,
    avgParticipantROI: mean(allROIs) * 100,
    pctAbove0,
    pctAbove5,

    isSustainableForOrganizer: avgPlatformRevenue > 0,
    orgProfitPerParticipant: avgPlatformRevenue / config.numTeams,
  };
}
