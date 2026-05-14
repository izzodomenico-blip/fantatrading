import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import {
  NoVotePolicy,
  PlayerRole,
  PrismaClient,
  SeasonStatus,
  TeamStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from '../modules/market/market.service';
import { SettlementService } from '../modules/settlement/settlement.service';
import { TeamsService } from '../modules/teams/teams.service';

export const DEMO_SEASON = '2024/25';
export const DEMO_SEASON_2025_26 = '2025/26';
export const DEMO_ADMIN_EMAIL = 'admin@fantatrading.local';
export const DEMO_USER_EMAIL = 'demo@fantatrading.local';
export const DEMO_PASSWORD = 'password';

export const MULTI_DEMO_TEAMS_2025_26 = [
  {
    key: 'VALUE',
    teamName: 'Team Demo VALUE',
    email: 'demo-value@fantatrading.local',
    firstName: 'Demo',
    lastName: 'Value',
    strategy: 'value',
  },
  {
    key: 'LOW_COST',
    teamName: 'Team Demo LOW COST',
    email: 'demo-lowcost@fantatrading.local',
    firstName: 'Demo',
    lastName: 'Low Cost',
    strategy: 'lowcost',
  },
  {
    key: 'TOP_PLAYER',
    teamName: 'Team Demo TOP PLAYER',
    email: 'demo-top@fantatrading.local',
    firstName: 'Demo',
    lastName: 'Top Player',
    strategy: 'top',
  },
  {
    key: 'BALANCED',
    teamName: 'Team Demo BALANCED',
    email: 'demo-balanced@fantatrading.local',
    firstName: 'Demo',
    lastName: 'Balanced',
    strategy: 'balanced',
  },
] as const;

export const DEMO_ROSTER_LIMITS: Record<PlayerRole, number> = {
  [PlayerRole.GK]: 3,
  [PlayerRole.DEF]: 8,
  [PlayerRole.MID]: 8,
  [PlayerRole.FWD]: 6,
};

export type ProcessedQuoteSeedRow = {
  season: string;
  playerId: number | string;
  role: string;
  playerName: string;
  club: string;
  initialQuote: number;
  currentOrFinalQuote: number;
  fvm?: number;
};

export type ProcessedVoteSeedRow = {
  season: string;
  round: number;
  playerId: number | string;
  playerName: string;
  club: string;
  role: string;
  vote: number | null;
  fantasyVote: number | null;
  played: boolean;
};

export type SyntheticQuoteSeedRow = {
  season: string;
  round: number;
  playerId: number | string;
  playerName: string;
  club: string;
  role: string;
  initialQuote: number;
  qa?: number;
  qaa?: number;
};

export type ProcessedDataFile<T> = {
  rows: T[];
};

type DemoRosterPlayer = ProcessedQuoteSeedRow & {
  mappedRole: PlayerRole;
  voteCount: number;
  syntheticTrendCount: number;
};

export type DemoRosterStrategy = typeof MULTI_DEMO_TEAMS_2025_26[number]['strategy'] | 'default';

type SeedSummary = {
  resetApplied?: boolean;
  playersImported: number;
  quotesImported: number;
  votesImported: number;
  marketBuyOperationsCreated: number;
  teamId: string;
  seasonId: string;
  roster: Array<{
    externalId: string;
    playerName: string;
    club: string;
    role: PlayerRole;
    initialQuote: number;
    currentQuote: number;
    voteCount: number;
    syntheticTrendCount: number;
  }>;
  composition: Record<PlayerRole, number>;
};

const QUOTES_PATH = 'data/real/processed/fantacalcio_quotes_history.json';
const VOTES_PATH = 'data/real/processed/votes/fantacalcio_votes_history.json';
const SYNTHETIC_QUOTES_PATH = 'data/real/processed/round-quotes/synthetic_round_quotes_history.json';

export function mapSeedRole(role: string): PlayerRole | null {
  const normalized = role.trim().toUpperCase();
  if (normalized === 'P' || normalized === 'POR' || normalized === 'GK') return PlayerRole.GK;
  if (normalized === 'D' || normalized === 'DEF') return PlayerRole.DEF;
  if (normalized === 'C' || normalized === 'MID') return PlayerRole.MID;
  if (normalized === 'A' || normalized === 'FWD') return PlayerRole.FWD;
  return null;
}

export function splitSeedPlayerName(playerName: string) {
  const normalized = playerName.trim().replace(/\s+/g, ' ');
  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: '', lastName: normalized || 'Unknown' };
  }
  return {
    firstName: parts.slice(1).join(' '),
    lastName: parts[0],
  };
}

export function selectDemoRoster(
  quotes: ProcessedQuoteSeedRow[],
  votes: ProcessedVoteSeedRow[],
  syntheticQuotes: SyntheticQuoteSeedRow[],
  season = DEMO_SEASON,
) {
  return selectDemoRosterByStrategy(quotes, votes, syntheticQuotes, season, 'default');
}

export function selectDemoRosterByStrategy(
  quotes: ProcessedQuoteSeedRow[],
  votes: ProcessedVoteSeedRow[],
  syntheticQuotes: SyntheticQuoteSeedRow[],
  season = DEMO_SEASON,
  strategy: DemoRosterStrategy = 'default',
) {
  const candidates = buildDemoRosterCandidates(quotes, votes, syntheticQuotes, season)
    .sort(getRosterStrategyComparator(strategy));
  return selectByRosterLimits(candidates);
}

function buildDemoRosterCandidates(
  quotes: ProcessedQuoteSeedRow[],
  votes: ProcessedVoteSeedRow[],
  syntheticQuotes: SyntheticQuoteSeedRow[],
  season = DEMO_SEASON,
) {
  const voteCounts = countRowsByPlayer(votes.filter((row) => row.season === season && row.played));
  const syntheticCounts = countRowsByPlayer(syntheticQuotes.filter((row) => row.season === season));
  const seen = new Set<string>();

  return quotes
    .filter((row) => row.season === season)
    .filter((row) => row.playerName && !row.playerName.toLowerCase().includes('demo'))
    .filter((row) => Number(row.initialQuote) > 0 && Number(row.currentOrFinalQuote) >= 0)
    .map((row) => {
      const mappedRole = mapSeedRole(row.role);
      if (!mappedRole) return null;
      const externalId = String(row.playerId);
      return {
        ...row,
        mappedRole,
        voteCount: voteCounts.get(externalId) ?? 0,
        syntheticTrendCount: syntheticCounts.get(externalId) ?? 0,
      };
    })
    .filter((row): row is DemoRosterPlayer => Boolean(row))
    .filter((row) => {
      const externalId = String(row.playerId);
      if (seen.has(externalId)) return false;
      seen.add(externalId);
      return true;
    });
}

function selectByRosterLimits(candidates: DemoRosterPlayer[]) {
  const selected: DemoRosterPlayer[] = [];
  for (const role of Object.values(PlayerRole)) {
    selected.push(...candidates.filter((row) => row.mappedRole === role).slice(0, DEMO_ROSTER_LIMITS[role]));
  }

  const composition = countComposition(selected);
  for (const role of Object.values(PlayerRole)) {
    if (composition[role] !== DEMO_ROSTER_LIMITS[role]) {
      throw new Error(`Not enough real players for ${role}: expected ${DEMO_ROSTER_LIMITS[role]}, got ${composition[role]}`);
    }
  }

  return selected;
}

function getRosterStrategyComparator(strategy: DemoRosterStrategy) {
  return (a: DemoRosterPlayer, b: DemoRosterPlayer) => {
    const scoreA = rosterStrategyScore(a, strategy);
    const scoreB = rosterStrategyScore(b, strategy);
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (b.syntheticTrendCount !== a.syntheticTrendCount) return b.syntheticTrendCount - a.syntheticTrendCount;
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    if (strategy === 'lowcost' && a.currentOrFinalQuote !== b.currentOrFinalQuote) {
      return a.currentOrFinalQuote - b.currentOrFinalQuote;
    }
    if (b.currentOrFinalQuote !== a.currentOrFinalQuote) return b.currentOrFinalQuote - a.currentOrFinalQuote;
    return a.playerName.localeCompare(b.playerName);
  };
}

function rosterStrategyScore(player: DemoRosterPlayer, strategy: DemoRosterStrategy) {
  const quote = Number(player.currentOrFinalQuote);
  const trendPct = (Number(player.currentOrFinalQuote) - Number(player.initialQuote)) * 5;
  const dataDepth = player.syntheticTrendCount * 0.15 + player.voteCount * 0.08;

  if (strategy === 'value') {
    return (trendPct + dataDepth + 10) / Math.max(quote, 1);
  }

  if (strategy === 'lowcost') {
    return (1000 - quote * 50) + trendPct * 0.1 + dataDepth;
  }

  if (strategy === 'top') {
    return quote * 3 + trendPct + dataDepth;
  }

  if (strategy === 'balanced') {
    const targetQuote = player.mappedRole === PlayerRole.FWD ? 18 : player.mappedRole === PlayerRole.MID ? 13 : 10;
    return 40 - Math.abs(quote - targetQuote) * 1.5 + trendPct + dataDepth;
  }

  return player.syntheticTrendCount * 2 + player.voteCount + quote;
}

export function countComposition(players: Array<{ mappedRole: PlayerRole }>) {
  return {
    [PlayerRole.GK]: players.filter((player) => player.mappedRole === PlayerRole.GK).length,
    [PlayerRole.DEF]: players.filter((player) => player.mappedRole === PlayerRole.DEF).length,
    [PlayerRole.MID]: players.filter((player) => player.mappedRole === PlayerRole.MID).length,
    [PlayerRole.FWD]: players.filter((player) => player.mappedRole === PlayerRole.FWD).length,
  };
}

type DemoSeedOptions = {
  reset?: boolean;
  season?: string;
};

async function seedDemo(options: DemoSeedOptions = {}) {
  loadEnvFiles();
  const demoSeason = options.season ?? DEMO_SEASON;

  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    if (options.reset) {
      await resetDemoTeam(prisma, demoSeason);
    }

    const marketService = new MarketService(prisma, new TeamsService(prisma));
    const settlementService = new SettlementService(prisma);

    const quotesFile = readProcessedJson<ProcessedQuoteSeedRow>(QUOTES_PATH);
    const votesFile = readProcessedJson<ProcessedVoteSeedRow>(VOTES_PATH);
    const syntheticFile = readProcessedJson<SyntheticQuoteSeedRow>(SYNTHETIC_QUOTES_PATH);
    const quoteRows = quotesFile.rows.filter((row) => row.season === demoSeason);
    const voteRows = votesFile.rows.filter((row) => row.season === demoSeason);
    const roster = selectDemoRoster(quotesFile.rows, votesFile.rows, syntheticFile.rows, demoSeason);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const admin = await upsertDemoUser(prisma, {
      email: DEMO_ADMIN_EMAIL,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    });
    const participant = await upsertDemoUser(prisma, {
      email: DEMO_USER_EMAIL,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Partecipante',
      role: UserRole.PARTICIPANT,
    });

    const season = await upsertDemoSeason(prisma, admin.id, demoSeason);
    const playerIdByExternalId = await importPlayersAndQuotes(prisma, season.id, quoteRows);
    const votesImported = await importVotes(prisma, season.id, voteRows, playerIdByExternalId);
    const team = await upsertDemoTeam(prisma, participant.id, season.id);
    const buysBefore = await prisma.marketOperation.count({ where: { teamId: team.id, type: 'BUY' } });

    for (const player of roster) {
      const playerId = playerIdByExternalId.get(String(player.playerId));
      if (!playerId) continue;
      const active = await prisma.portfolioPosition.findFirst({
        where: { teamId: team.id, playerId, status: 'ACTIVE' },
      });
      if (active) continue;

      await marketService.buyPlayer(
        { userId: participant.id, email: participant.email, role: UserRole.PARTICIPANT },
        { teamId: team.id, playerId },
      );
    }

    await settlementService.calculateSeasonSettlement(season.id, {
      userId: admin.id,
      email: admin.email,
      role: UserRole.ADMIN,
    });

    const buysAfter = await prisma.marketOperation.count({ where: { teamId: team.id, type: 'BUY' } });
    const summary = await buildSummary(prisma, season.id, team.id, roster, playerIdByExternalId, {
      resetApplied: Boolean(options.reset),
      playersImported: playerIdByExternalId.size,
      quotesImported: quoteRows.length,
      votesImported,
      marketBuyOperationsCreated: buysAfter - buysBefore,
    });

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

async function resetDemoTeam(prisma: PrismaClient, demoSeason = DEMO_SEASON) {
  await resetDemoTeamForEmail(prisma, DEMO_USER_EMAIL, demoSeason);
}

async function resetDemoTeamForEmail(prisma: PrismaClient, email: string, demoSeason = DEMO_SEASON) {
  const participant = await prisma.user.findUnique({ where: { email } });
  const season = await prisma.season.findFirst({ where: { footballSeason: demoSeason } });
  if (!participant || !season) return;

  const team = await prisma.team.findUnique({
    where: { userId_seasonId: { userId: participant.id, seasonId: season.id } },
  });
  if (!team) return;

  await prisma.$transaction([
    prisma.platformFee.deleteMany({ where: { teamId: team.id } }),
    prisma.finalSettlement.deleteMany({ where: { teamId: team.id } }),
    prisma.prizeAward.deleteMany({ where: { teamId: team.id } }),
    prisma.ranking.deleteMany({ where: { teamId: team.id } }),
    prisma.roundPlayerResult.deleteMany({ where: { teamId: team.id } }),
    prisma.marketOperation.deleteMany({ where: { teamId: team.id } }),
    prisma.portfolioPosition.deleteMany({ where: { teamId: team.id } }),
    prisma.team.delete({ where: { id: team.id } }),
  ]);
}

async function upsertDemoUser(
  prisma: PrismaClient,
  input: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  },
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        status: UserStatus.ACTIVE,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      status: UserStatus.ACTIVE,
    },
  });
}

async function upsertDemoSeason(prisma: PrismaClient, adminId: string, demoSeason = DEMO_SEASON) {
  const isLiveDemo = demoSeason === DEMO_SEASON_2025_26;
  const data = {
    name: isLiveDemo ? `FantaTrading Demo ${demoSeason} Live` : `FantaTrading Demo ${demoSeason}`,
    footballSeason: demoSeason,
    status: isLiveDemo ? SeasonStatus.IN_PROGRESS : SeasonStatus.COMPLETED,
    registrationOpenAt: isLiveDemo ? new Date('2025-07-01T00:00:00.000Z') : new Date('2024-07-01T00:00:00.000Z'),
    registrationCloseAt: isLiveDemo ? new Date('2025-08-16T23:59:59.000Z') : new Date('2024-08-16T23:59:59.000Z'),
    startDate: isLiveDemo ? new Date('2025-08-17T00:00:00.000Z') : new Date('2024-08-17T00:00:00.000Z'),
    endDate: isLiveDemo ? new Date('2026-05-25T23:59:59.000Z') : new Date('2025-05-25T23:59:59.000Z'),
    totalRounds: 38,
    initialBudget: 0,
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.02,
    platformFeeRate: 0.1,
    survivalThreshold: 0,
    prizeThreshold: 0.07,
    noVotePolicy: NoVotePolicy.PLAYER_ZERO_TEAM_EXCLUDE,
    createdById: adminId,
  };

  const existing = await prisma.season.findFirst({ where: { footballSeason: demoSeason } });
  if (existing) {
    return prisma.season.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.season.create({ data });
}

async function importPlayersAndQuotes(
  prisma: PrismaClient,
  seasonId: string,
  quoteRows: ProcessedQuoteSeedRow[],
) {
  const playerIdByExternalId = new Map<string, string>();

  for (const row of quoteRows) {
    const role = mapSeedRole(row.role);
    if (!role || !row.playerName || Number(row.initialQuote) <= 0) continue;

    const externalId = String(row.playerId);
    const name = splitSeedPlayerName(row.playerName);
    const existingPlayer = await prisma.player.findFirst({ where: { externalId } });
    const player = existingPlayer
      ? await prisma.player.update({
          where: { id: existingPlayer.id },
          data: {
            firstName: name.firstName,
            lastName: name.lastName,
            role,
            realTeam: row.club,
            isActive: true,
          },
        })
      : await prisma.player.create({
          data: {
            externalId,
            firstName: name.firstName,
            lastName: name.lastName,
            role,
            realTeam: row.club,
            isActive: true,
          },
        });

    playerIdByExternalId.set(externalId, player.id);
    await prisma.quote.upsert({
      where: { seasonId_playerId: { seasonId, playerId: player.id } },
      update: {
        initialQuote: row.initialQuote,
        currentQuote: row.currentOrFinalQuote,
        finalQuote: row.currentOrFinalQuote,
      },
      create: {
        seasonId,
        playerId: player.id,
        initialQuote: row.initialQuote,
        currentQuote: row.currentOrFinalQuote,
        finalQuote: row.currentOrFinalQuote,
      },
    });
  }

  return playerIdByExternalId;
}

async function importVotes(
  prisma: PrismaClient,
  seasonId: string,
  voteRows: ProcessedVoteSeedRow[],
  playerIdByExternalId: Map<string, string>,
) {
  let imported = 0;

  for (const row of voteRows) {
    const playerId = playerIdByExternalId.get(String(row.playerId));
    if (!playerId) continue;

    await prisma.vote.upsert({
      where: {
        seasonId_round_playerId: {
          seasonId,
          round: row.round,
          playerId,
        },
      },
      update: {
        vote: row.vote,
        fantasyVote: row.fantasyVote,
        played: row.played,
        isDerived: false,
      },
      create: {
        seasonId,
        round: row.round,
        playerId,
        vote: row.vote,
        fantasyVote: row.fantasyVote,
        played: row.played,
        isDerived: false,
      },
    });
    imported += 1;
  }

  return imported;
}

async function upsertDemoTeam(prisma: PrismaClient, userId: string, seasonId: string) {
  const existing = await prisma.team.findUnique({
    where: { userId_seasonId: { userId, seasonId } },
  });
  if (existing) {
    return existing;
  }

  return prisma.team.create({
    data: {
      userId,
      seasonId,
      status: TeamStatus.ROSA_INCOMPLETA,
      initialBudget: 0,
      availableBudget: 0,
      totalCommissionsPaid: 0,
      currentPortfolioValue: 0,
      currentRoi: 0,
    },
  });
}

async function upsertDemoTeamWithCapital(prisma: PrismaClient, userId: string, seasonId: string, initialCapital: number) {
  const existing = await prisma.team.findUnique({
    where: { userId_seasonId: { userId, seasonId } },
  });
  if (existing) {
    return existing;
  }

  return prisma.team.create({
    data: {
      userId,
      seasonId,
      status: TeamStatus.ROSA_INCOMPLETA,
      initialBudget: initialCapital,
      availableBudget: initialCapital,
      totalCommissionsPaid: 0,
      currentPortfolioValue: 0,
      currentRoi: 0,
    },
  });
}

function calculateInitialCapitalForRoster(roster: DemoRosterPlayer[], strategy: DemoRosterStrategy) {
  const totalBuyCost = roster.reduce((sum, player) => sum + Number(player.currentOrFinalQuote) * 1.02, 0);
  const bufferByStrategy: Record<DemoRosterStrategy, number> = {
    default: 1.08,
    value: 1.08,
    lowcost: 1.04,
    top: 1.16,
    balanced: 1.12,
  };
  return Math.ceil(totalBuyCost * bufferByStrategy[strategy]);
}

async function seedMultiDemo2025(options: { reset?: boolean } = {}) {
  loadEnvFiles();
  const demoSeason = DEMO_SEASON_2025_26;

  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    if (options.reset) {
      for (const config of MULTI_DEMO_TEAMS_2025_26) {
        await resetDemoTeamForEmail(prisma, config.email, demoSeason);
      }
    }

    const marketService = new MarketService(prisma, new TeamsService(prisma));
    const settlementService = new SettlementService(prisma);
    const quotesFile = readProcessedJson<ProcessedQuoteSeedRow>(QUOTES_PATH);
    const votesFile = readProcessedJson<ProcessedVoteSeedRow>(VOTES_PATH);
    const syntheticFile = readProcessedJson<SyntheticQuoteSeedRow>(SYNTHETIC_QUOTES_PATH);
    const quoteRows = quotesFile.rows.filter((row) => row.season === demoSeason);
    const voteRows = votesFile.rows.filter((row) => row.season === demoSeason);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const admin = await upsertDemoUser(prisma, {
      email: DEMO_ADMIN_EMAIL,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    });
    const season = await upsertDemoSeason(prisma, admin.id, demoSeason);
    const playerIdByExternalId = await importPlayersAndQuotes(prisma, season.id, quoteRows);
    const votesImported = await importVotes(prisma, season.id, voteRows, playerIdByExternalId);

    const teams: Array<SeedSummary & { teamName: string; demoEmail: string; strategy: string; initialCapital: number }> = [];

    for (const config of MULTI_DEMO_TEAMS_2025_26) {
      const participant = await upsertDemoUser(prisma, {
        email: config.email,
        passwordHash,
        firstName: config.firstName,
        lastName: config.lastName,
        role: UserRole.PARTICIPANT,
      });
      const roster = selectDemoRosterByStrategy(quotesFile.rows, votesFile.rows, syntheticFile.rows, demoSeason, config.strategy);
      const initialCapital = calculateInitialCapitalForRoster(roster, config.strategy);
      const team = await upsertDemoTeamWithCapital(prisma, participant.id, season.id, initialCapital);
      const buysBefore = await prisma.marketOperation.count({ where: { teamId: team.id, type: 'BUY' } });

      for (const player of roster) {
        const playerId = playerIdByExternalId.get(String(player.playerId));
        if (!playerId) continue;
        const active = await prisma.portfolioPosition.findFirst({
          where: { teamId: team.id, playerId, status: 'ACTIVE' },
        });
        if (active) continue;

        await marketService.buyPlayer(
          { userId: participant.id, email: participant.email, role: UserRole.PARTICIPANT },
          { teamId: team.id, playerId },
        );
      }

      const buysAfter = await prisma.marketOperation.count({ where: { teamId: team.id, type: 'BUY' } });
      const summary = await buildSummary(prisma, season.id, team.id, roster, playerIdByExternalId, {
        resetApplied: Boolean(options.reset),
        playersImported: playerIdByExternalId.size,
        quotesImported: quoteRows.length,
        votesImported,
        marketBuyOperationsCreated: buysAfter - buysBefore,
      });
      teams.push({
        ...summary,
        teamName: config.teamName,
        demoEmail: config.email,
        strategy: config.strategy,
        initialCapital,
      });
    }

    await settlementService.calculateSeasonSettlement(season.id, {
      userId: admin.id,
      email: admin.email,
      role: UserRole.ADMIN,
    });

    process.stdout.write(`${JSON.stringify({
      resetApplied: Boolean(options.reset),
      season: demoSeason,
      seasonId: season.id,
      teams,
    }, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

async function buildSummary(
  prisma: PrismaClient,
  seasonId: string,
  teamId: string,
  roster: DemoRosterPlayer[],
  playerIdByExternalId: Map<string, string>,
  counts: {
    resetApplied?: boolean;
    playersImported: number;
    quotesImported: number;
    votesImported: number;
    marketBuyOperationsCreated: number;
  },
): Promise<SeedSummary> {
  const activePositions = await prisma.portfolioPosition.findMany({
    where: { teamId, status: 'ACTIVE' },
    include: { player: true, quote: true },
    orderBy: { boughtAt: 'asc' },
  });

  return {
    ...counts,
    seasonId,
    teamId,
    composition: {
      [PlayerRole.GK]: activePositions.filter((position) => position.player.role === PlayerRole.GK).length,
      [PlayerRole.DEF]: activePositions.filter((position) => position.player.role === PlayerRole.DEF).length,
      [PlayerRole.MID]: activePositions.filter((position) => position.player.role === PlayerRole.MID).length,
      [PlayerRole.FWD]: activePositions.filter((position) => position.player.role === PlayerRole.FWD).length,
    },
    roster: roster.map((player) => ({
      externalId: String(player.playerId),
      playerName: player.playerName,
      club: player.club,
      role: player.mappedRole,
      initialQuote: player.initialQuote,
      currentQuote: player.currentOrFinalQuote,
      voteCount: player.voteCount,
      syntheticTrendCount: player.syntheticTrendCount,
    })).filter((player) => playerIdByExternalId.has(player.externalId)),
  };
}

function countRowsByPlayer(rows: Array<{ playerId: number | string }>) {
  return rows.reduce((counts, row) => {
    const key = String(row.playerId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function readProcessedJson<T>(relativePath: string): ProcessedDataFile<T> {
  const fullPath = resolveFromRepo(relativePath);
  const parsed = JSON.parse(readFileSync(fullPath, 'utf8')) as ProcessedDataFile<T>;
  if (!Array.isArray(parsed.rows)) {
    throw new Error(`${relativePath} must contain a rows array`);
  }
  return parsed;
}

function resolveFromRepo(relativePath: string) {
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), '..', '..', relativePath),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Cannot find ${relativePath}`);
  }
  return found;
}

function loadEnvFiles() {
  for (const relativePath of ['.env', 'apps/backend/.env', '../../.env']) {
    const fullPath = resolve(process.cwd(), relativePath);
    if (!existsSync(fullPath)) continue;
    const lines = readFileSync(fullPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

if (require.main === module) {
  const multiDemo = process.argv.includes('--multi');
  const seasonArg = process.argv.includes('--season=2025/26') || process.argv.includes('--2025-26')
    ? DEMO_SEASON_2025_26
    : DEMO_SEASON;
  const runner = multiDemo
    ? seedMultiDemo2025({ reset: process.argv.includes('--reset') })
    : seedDemo({ reset: process.argv.includes('--reset'), season: seasonArg });
  runner.catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
