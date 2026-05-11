import { SimulationPreset } from '../config/simulationPresets';
import { DEFAULT_BONUS_MALUS_RULES } from '../engine/bonusMalusEngine';
import { calculateBuyCost, calculateSellProceeds } from '../engine/marketEngine';
import { splitCommission } from '../engine/prizePoolEngine';
import { calculatePrizeDistribution } from '../engine/prizePoolEngine';
import { calculateRanking, RankingEntry } from '../engine/rankingEngine';
import { createTeam } from '../domain/Team';
import { createPortfolio } from '../domain/Portfolio';
import { createPlayer } from '../domain/Player';
import { Player, PlayerRole } from '../domain/Player';

export interface SimulationRunResult {
  runIndex: number;
  totalCommissions: number;
  prizePool: number;
  platformRevenue: number;
  ranking: RankingEntry[];
  totalOperations: number;
  avgTeamWealth: number;
}

export interface MonteCarloResult {
  preset: SimulationPreset;
  runs: SimulationRunResult[];
  summary: {
    avgPrizePool: number;
    minPrizePool: number;
    maxPrizePool: number;
    avgPlatformRevenue: number;
    avgTotalOperations: number;
    avgWinnerPrize: number;
    prizePoolStdDev: number;
  };
}

/** Generatore pseudo-random seedabile (LCG semplice) */
function makeRng(seed: number): () => number {
  let s = seed % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function poissonSample(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

function generatePlayers(count: number): Player[] {
  const roles: PlayerRole[] = ['GK', 'DEF', 'MID', 'FWD'];
  return Array.from({ length: count }, (_, i) => createPlayer({
    id: `player_${i}`,
    name: `Calciatore ${i}`,
    role: roles[i % 4],
    clubTeam: `Club ${Math.floor(i / 4)}`,
    baseValue: 10 + (i % 20) * 3,
    currentValue: 10 + (i % 20) * 3,
  }));
}

function simulateSingleRun(
  preset: SimulationPreset,
  runIndex: number,
  rng: () => number,
): SimulationRunResult {
  const { rules, prizeTable, numTeams, operationsPerTeamPerRound } = preset;
  const numRounds = rules.roundsPerSeason;
  const numPlayers = 100;

  const teams = Array.from({ length: numTeams }, (_, i) =>
    createTeam(`team_${i}`, `Squadra ${i + 1}`, `Owner ${i + 1}`, rules.initialBudget),
  );
  const portfolios = new Map(teams.map(t => [t.id, createPortfolio(t.id)]));
  let players = generatePlayers(numPlayers);

  let totalCommissions = 0;

  for (let round = 1; round <= numRounds; round++) {
    // Aggiorna valori calciatori con variazione casuale
    players = players.map(p => {
      const change = (rng() - 0.5) * 4;
      const newValue = Math.max(rules.playerMinValue, Math.min(rules.playerMaxValue, p.currentValue + change));
      return { ...p, currentValue: newValue };
    });

    // Ogni squadra esegue operazioni casuali
    for (let ti = 0; ti < teams.length; ti++) {
      const opsCount = poissonSample(operationsPerTeamPerRound, rng);

      for (let op = 0; op < opsCount; op++) {
        const player = players[Math.floor(rng() * players.length)];
        const isBuy = rng() > 0.5;

        if (isBuy) {
          const { totalCost, commission } = calculateBuyCost(1, player.currentValue, rules);
          if (teams[ti].budget >= totalCost + rules.minBudgetReserve) {
            teams[ti] = { ...teams[ti], budget: teams[ti].budget - totalCost, totalCommissionsPaid: teams[ti].totalCommissionsPaid + commission };
            totalCommissions += commission;
          }
        } else {
          const portfolio = portfolios.get(teams[ti].id)!;
          if (portfolio.entries.size > 0) {
            const entries = Array.from(portfolio.entries.values());
            const entry = entries[Math.floor(rng() * entries.length)];
            const { netProceeds, commission } = calculateSellProceeds(1, entry.player.currentValue, rules);
            teams[ti] = { ...teams[ti], budget: teams[ti].budget + netProceeds, totalCommissionsPaid: teams[ti].totalCommissionsPaid + commission };
            totalCommissions += commission;
          }
        }
      }
    }
  }

  const { toPrizePool: prizePool, toPlatform: platformRevenue } = splitCommission(totalCommissions, rules);
  const prizes = calculatePrizeDistribution(prizePool, prizeTable);
  const ranking = calculateRanking(teams, portfolios, prizes);
  const avgTeamWealth = teams.reduce((s, t) => s + t.budget, 0) / numTeams;

  return {
    runIndex,
    totalCommissions,
    prizePool,
    platformRevenue,
    ranking,
    totalOperations: numRounds * numTeams * operationsPerTeamPerRound,
    avgTeamWealth,
  };
}

export function runMonteCarloSimulation(preset: SimulationPreset): MonteCarloResult {
  const seed = preset.randomSeed ?? Date.now();
  const rng = makeRng(seed);
  const runs: SimulationRunResult[] = [];

  for (let i = 0; i < preset.numSimulations; i++) {
    runs.push(simulateSingleRun(preset, i, rng));
  }

  const pools = runs.map(r => r.prizePool);
  const avgPrizePool = pools.reduce((s, v) => s + v, 0) / pools.length;
  const minPrizePool = Math.min(...pools);
  const maxPrizePool = Math.max(...pools);
  const variance = pools.reduce((s, v) => s + (v - avgPrizePool) ** 2, 0) / pools.length;

  return {
    preset,
    runs,
    summary: {
      avgPrizePool,
      minPrizePool,
      maxPrizePool,
      avgPlatformRevenue: runs.reduce((s, r) => s + r.platformRevenue, 0) / runs.length,
      avgTotalOperations: runs.reduce((s, r) => s + r.totalOperations, 0) / runs.length,
      avgWinnerPrize: runs.reduce((s, r) => s + (r.ranking[0]?.prize ?? 0), 0) / runs.length,
      prizePoolStdDev: Math.sqrt(variance),
    },
  };
}
