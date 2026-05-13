import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AuditStatus,
  ImportStatus,
  ImportType,
  NoVotePolicy,
  OperationType,
  PlayerRole,
  PositionStatus,
  SeasonStatus,
  TeamStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import appConfig from '../src/config/app.config';
import { PrismaService } from '../src/prisma/prisma.service';
import { AdminImportController } from '../src/modules/admin/admin-import.controller';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { MarketController } from '../src/modules/market/market.controller';
import { MarketService } from '../src/modules/market/market.service';
import { PlayersService } from '../src/modules/players/players.service';
import { QuotesService } from '../src/modules/quotes/quotes.service';
import { SeasonsController } from '../src/modules/seasons/seasons.controller';
import { SeasonsService } from '../src/modules/seasons/seasons.service';
import { AdminSettlementController } from '../src/modules/settlement/settlement-admin.controller';
import { TeamSettlementController } from '../src/modules/settlement/settlement-team.controller';
import { SettlementService } from '../src/modules/settlement/settlement.service';
import { TeamsController } from '../src/modules/teams/teams.controller';
import { TeamsService } from '../src/modules/teams/teams.service';
import { UsersService } from '../src/modules/users/users.service';
import { VotesService } from '../src/modules/votes/votes.service';

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

type StoredSeason = {
  id: string;
  name: string;
  footballSeason: string;
  status: SeasonStatus;
  registrationOpenAt: Date;
  registrationCloseAt: Date;
  startDate: Date;
  endDate: Date;
  totalRounds: number;
  initialBudget: number;
  buyCommissionRate: number;
  sellCommissionRate: number;
  platformFeeRate: number;
  survivalThreshold: number;
  prizeThreshold: number;
  noVotePolicy: NoVotePolicy;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

type StoredPlayer = {
  id: string;
  externalId: string | null;
  firstName: string;
  lastName: string;
  role: PlayerRole;
  realTeam: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type StoredQuote = {
  id: string;
  seasonId: string;
  playerId: string;
  initialQuote: number;
  currentQuote: number;
  finalQuote: number | null;
  importedAt: Date;
  updatedAt: Date;
};

type StoredTeam = {
  id: string;
  userId: string;
  seasonId: string;
  status: TeamStatus;
  initialBudget: number;
  availableBudget: number;
  totalCommissionsPaid: number;
  currentPortfolioValue: number;
  currentRoi: number;
  registeredAt: Date;
  updatedAt: Date;
};

type StoredPosition = {
  id: string;
  teamId: string;
  playerId: string;
  quoteId: string;
  initialQuote: number;
  buyValue: number;
  buyCommission: number;
  totalBuyCost: number;
  fantasyMultiplier: number;
  currentSellValue: number;
  status: PositionStatus;
  boughtAt: Date;
};

type StoredMarketOperation = {
  id: string;
  teamId: string;
  playerId: string;
  positionId: string;
  type: OperationType;
  valueAtOperation: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  budgetBefore: number;
  budgetAfter: number;
  executedAt: Date;
};

type QuoteImportRow = {
  season: string;
  playerId: string;
  role: string;
  playerName: string;
  club: string;
  initialQuote: number;
  currentOrFinalQuote: number;
};

const safeUser = (user: StoredUser) => {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
};

const applySelect = (user: StoredUser, select?: Record<string, boolean>) => {
  if (!select) return user;
  const source = safeUser(user) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(select).filter(([, enabled]) => enabled).map(([key]) => [key, source[key]]));
};

const createPrismaMock = (adminPasswordHash: string) => {
  const now = new Date('2026-05-13T10:00:00.000Z');
  const users: StoredUser[] = [
    {
      id: 'admin-1',
      email: 'admin@fantatrading.local',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'Flow',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    },
  ];
  const seasons: StoredSeason[] = [];
  const players: StoredPlayer[] = [];
  const quotes: StoredQuote[] = [];
  const teams: StoredTeam[] = [];
  const positions: StoredPosition[] = [];
  const operations: StoredMarketOperation[] = [];
  const importLogs: Array<Record<string, unknown>> = [];
  const finalSettlements: Array<Record<string, any>> = [];
  const auditLogs: Array<Record<string, unknown>> = [];

  const findSeason = (seasonId: string) => seasons.find((season) => season.id === seasonId) ?? null;
  const findPlayer = (playerId: string) => players.find((player) => player.id === playerId) ?? null;
  const findQuote = (quoteId: string) => quotes.find((quote) => quote.id === quoteId) ?? null;
  const findUser = (userId: string) => users.find((user) => user.id === userId) ?? null;

  const enrichPosition = (position: StoredPosition) => ({
    ...position,
    player: findPlayer(position.playerId),
    quote: findQuote(position.quoteId),
  });

  const enrichTeam = (team: StoredTeam) => ({
    ...team,
    season: findSeason(team.seasonId),
    user: findUser(team.userId),
    portfolioPositions: positions
      .filter((position) => position.teamId === team.id)
      .sort((a, b) => a.boughtAt.getTime() - b.boughtAt.getTime())
      .map(enrichPosition),
  });

  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where, select }: any) => {
        const user = users.find((item) => item.id === where.id || item.email === where.email) ?? null;
        return user ? applySelect(user, select) : null;
      }),
      create: jest.fn(async ({ data, select }: any) => {
        const user: StoredUser = {
          id: `user-${users.length}`,
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role ?? UserRole.PARTICIPANT,
          status: UserStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        };
        users.push(user);
        return applySelect(user, select);
      }),
    },
    season: {
      create: jest.fn(async ({ data }: any) => {
        const season: StoredSeason = {
          id: `season-${seasons.length + 1}`,
          name: data.name,
          footballSeason: data.footballSeason,
          status: data.status ?? SeasonStatus.DRAFT,
          registrationOpenAt: data.registrationOpenAt,
          registrationCloseAt: data.registrationCloseAt,
          startDate: data.startDate,
          endDate: data.endDate,
          totalRounds: data.totalRounds,
          initialBudget: data.initialBudget,
          buyCommissionRate: data.buyCommissionRate ?? 0.02,
          sellCommissionRate: data.sellCommissionRate ?? 0.02,
          platformFeeRate: data.platformFeeRate ?? 0.1,
          survivalThreshold: data.survivalThreshold ?? 0,
          prizeThreshold: data.prizeThreshold ?? 0.07,
          noVotePolicy: data.noVotePolicy ?? NoVotePolicy.PLAYER_ZERO_TEAM_EXCLUDE,
          createdById: data.createdById,
          createdAt: now,
          updatedAt: now,
        };
        seasons.push(season);
        return season;
      }),
      findMany: jest.fn(async () => [...seasons].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
      findUnique: jest.fn(async ({ where }: any) => findSeason(where.id)),
      update: jest.fn(async ({ where, data }: any) => {
        const season = findSeason(where.id);
        if (!season) return null;
        Object.assign(season, data, { updatedAt: new Date() });
        return season;
      }),
    },
    player: {
      findMany: jest.fn(async ({ where }: any = {}) =>
        players.filter((player) => {
          if (where?.isActive !== undefined && player.isActive !== where.isActive) return false;
          if (where?.role && player.role !== where.role) return false;
          if (where?.quotes?.some?.seasonId && !quotes.some((quote) => quote.playerId === player.id && quote.seasonId === where.quotes.some.seasonId)) return false;
          return true;
        }),
      ),
      findUnique: jest.fn(async ({ where }: any) => findPlayer(where.id)),
      findFirst: jest.fn(async ({ where }: any) => players.find((player) => player.externalId === where.externalId) ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        const player = findPlayer(where.id);
        if (!player) return null;
        Object.assign(player, data, { updatedAt: new Date() });
        return player;
      }),
      create: jest.fn(async ({ data }: any) => {
        const player: StoredPlayer = {
          id: `player-${players.length + 1}`,
          externalId: data.externalId,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          realTeam: data.realTeam,
          isActive: data.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };
        players.push(player);
        return player;
      }),
    },
    quote: {
      findMany: jest.fn(async ({ where }: any) =>
        quotes
          .filter((quote) => quote.seasonId === where.seasonId)
          .map((quote) => ({ ...quote, player: findPlayer(quote.playerId) })),
      ),
      findUnique: jest.fn(async ({ where }: any) => {
        const quote = quotes.find(
          (item) =>
            item.seasonId === where.seasonId_playerId.seasonId &&
            item.playerId === where.seasonId_playerId.playerId,
        );
        return quote ? { ...quote, player: findPlayer(quote.playerId) } : null;
      }),
      upsert: jest.fn(async ({ where, update, create }: any) => {
        const quote = quotes.find(
          (item) =>
            item.seasonId === where.seasonId_playerId.seasonId &&
            item.playerId === where.seasonId_playerId.playerId,
        );
        if (quote) {
          Object.assign(quote, update, { updatedAt: new Date() });
          return quote;
        }
        const next: StoredQuote = {
          id: `quote-${quotes.length + 1}`,
          seasonId: create.seasonId,
          playerId: create.playerId,
          initialQuote: create.initialQuote,
          currentQuote: create.currentQuote,
          finalQuote: create.finalQuote ?? null,
          importedAt: now,
          updatedAt: now,
        };
        quotes.push(next);
        return next;
      }),
    },
    importLog: {
      create: jest.fn(async ({ data }: any) => {
        const log = { id: `import-${importLogs.length + 1}`, ...data };
        importLogs.push(log);
        return log;
      }),
    },
    team: {
      findUnique: jest.fn(async ({ where }: any) => {
        const team = where.id
          ? teams.find((item) => item.id === where.id)
          : teams.find((item) => item.userId === where.userId_seasonId.userId && item.seasonId === where.userId_seasonId.seasonId);
        return team ? enrichTeam(team) : null;
      }),
      findMany: jest.fn(async ({ where }: any = {}) =>
        teams
          .filter((team) => !where?.seasonId || team.seasonId === where.seasonId)
          .filter((team) => !where?.userId || team.userId === where.userId)
          .map(enrichTeam),
      ),
      create: jest.fn(async ({ data }: any) => {
        const team: StoredTeam = {
          id: `team-${teams.length + 1}`,
          userId: data.userId,
          seasonId: data.seasonId,
          status: data.status,
          initialBudget: data.initialBudget,
          availableBudget: data.availableBudget,
          totalCommissionsPaid: data.totalCommissionsPaid,
          currentPortfolioValue: data.currentPortfolioValue,
          currentRoi: data.currentRoi,
          registeredAt: now,
          updatedAt: now,
        };
        teams.push(team);
        return enrichTeam(team);
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const team = teams.find((item) => item.id === where.id);
        if (!team) return null;
        Object.assign(team, data, { updatedAt: new Date() });
        return enrichTeam(team);
      }),
    },
    portfolioPosition: {
      create: jest.fn(async ({ data }: any) => {
        const position: StoredPosition = {
          id: `position-${positions.length + 1}`,
          teamId: data.teamId,
          playerId: data.playerId,
          quoteId: data.quoteId,
          initialQuote: data.initialQuote,
          buyValue: data.buyValue,
          buyCommission: data.buyCommission,
          totalBuyCost: data.totalBuyCost,
          fantasyMultiplier: data.fantasyMultiplier,
          currentSellValue: data.currentSellValue,
          status: data.status,
          boughtAt: new Date(now.getTime() + positions.length),
        };
        positions.push(position);
        return enrichPosition(position);
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const position = positions.find((item) => item.id === where.id);
        if (!position) return null;
        Object.assign(position, data);
        return enrichPosition(position);
      }),
    },
    marketOperation: {
      create: jest.fn(async ({ data }: any) => {
        const operation: StoredMarketOperation = {
          id: `operation-${operations.length + 1}`,
          teamId: data.teamId,
          playerId: data.playerId,
          positionId: data.positionId,
          type: data.type,
          valueAtOperation: data.valueAtOperation,
          commissionRate: data.commissionRate,
          commissionAmount: data.commissionAmount,
          netAmount: data.netAmount,
          budgetBefore: data.budgetBefore,
          budgetAfter: data.budgetAfter,
          executedAt: new Date(now.getTime() + operations.length),
        };
        operations.push(operation);
        return operation;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        operations
          .filter((operation) => operation.teamId === where.teamId)
          .sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime())
          .map((operation) => ({ ...operation, player: findPlayer(operation.playerId) })),
      ),
    },
    finalSettlement: {
      findFirst: jest.fn(async ({ where }: any) => {
        const rows = finalSettlements.filter((settlement) => settlement.teamId === where.teamId);
        return rows[rows.length - 1] ?? null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const settlement = {
          id: `settlement-${finalSettlements.length + 1}`,
          calculatedAt: new Date(now.getTime() + finalSettlements.length),
          source: 'FINAL_SETTLEMENT',
          ...data,
        };
        finalSettlements.push(settlement);
        return settlement;
      }),
    },
    auditLog: {
      create: jest.fn(async ({ data }: any) => {
        const audit = {
          id: `audit-${auditLogs.length + 1}`,
          executedAt: new Date(now.getTime() + auditLogs.length),
          status: AuditStatus.SUCCESS,
          ...data,
        };
        auditLogs.push(audit);
        return audit;
      }),
    },
  };

  return { prisma, users, seasons, players, quotes, teams, positions, operations, importLogs, finalSettlements, auditLogs };
};

const rolePlan = [
  { role: 'P', count: 3, key: 'gk' },
  { role: 'D', count: 8, key: 'def' },
  { role: 'C', count: 8, key: 'mid' },
  { role: 'A', count: 6, key: 'fwd' },
] as const;

const makeRosterRows = (prefix: string, quote: number): QuoteImportRow[] =>
  rolePlan.flatMap(({ role, count, key }) =>
    Array.from({ length: count }, (_, index) => ({
      season: '2026/27',
      playerId: `${prefix}-${key}-${index + 1}`,
      role,
      playerName: `${prefix.toUpperCase()} ${key.toUpperCase()} ${index + 1}`,
      club: `${prefix.toUpperCase()} FC`,
      initialQuote: quote,
      currentOrFinalQuote: quote,
    })),
  );

describe('FAVC backend flow (e2e)', () => {
  let app: INestApplication;
  let state: ReturnType<typeof createPrismaMock>;
  let quotesPath: string;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_secret_minimum_32_characters_long';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';

    state = createPrismaMock(await bcrypt.hash('AdminPassword1!', 12));
    const tmpDir = join(process.cwd(), 'tmp');
    mkdirSync(tmpDir, { recursive: true });
    quotesPath = join(tmpDir, 'favc-flow-quotes.json');
    writeFileSync(
      quotesPath,
      JSON.stringify({
        rows: [
          ...makeRosterRows('a', 6),
          {
            season: '2026/27',
            playerId: 'a-gk-sub',
            role: 'P',
            playerName: 'A GK SUB',
            club: 'A FC',
            initialQuote: 6,
            currentOrFinalQuote: 6,
          },
          ...makeRosterRows('b', 24),
        ],
      }),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        PassportModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [
        AuthController,
        SeasonsController,
        AdminImportController,
        TeamsController,
        MarketController,
        AdminSettlementController,
        TeamSettlementController,
      ],
      providers: [
        AuthService,
        UsersService,
        SeasonsService,
        PlayersService,
        QuotesService,
        TeamsService,
        MarketService,
        SettlementService,
        JwtStrategy,
        { provide: PrismaService, useValue: state.prisma },
        { provide: VotesService, useValue: { importFromProcessedJson: jest.fn() } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    rmSync(quotesPath, { force: true });
  });

  const registerParticipant = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'PlayerPassword1!',
        firstName: email.split('@')[0],
        lastName: 'Trader',
      })
      .expect(201);

    return response.body as { accessToken: string; user: { id: string; email: string } };
  };

  const externalPlayerId = (externalId: string) => {
    const player = state.players.find((item) => item.externalId === externalId);
    if (!player) throw new Error(`Missing player ${externalId}`);
    return player.id;
  };

  const buyByExternalId = async (token: string, teamId: string, externalId: string) =>
    request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${token}`)
      .send({ teamId, playerId: externalPlayerId(externalId) })
      .expect(201);

  const buyRoster = async (token: string, teamId: string, prefix: string) => {
    const externalIds = rolePlan.flatMap(({ count, key }) =>
      Array.from({ length: count }, (_, index) => `${prefix}-${key}-${index + 1}`),
    );

    for (const externalId of externalIds) {
      await buyByExternalId(token, teamId, externalId);
    }
  };

  const setCurrentQuotesForPrefix = (prefix: string, currentQuote: number) => {
    for (const player of state.players.filter((item) => item.externalId?.startsWith(`${prefix}-`))) {
      const quote = state.quotes.find((item) => item.playerId === player.id);
      if (quote) {
        quote.currentQuote = currentQuote;
        quote.finalQuote = currentQuote;
      }
    }
  };

  it('supports the full FREE_ACCESS_VARIABLE_CAPITAL season cycle without real payouts', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@fantatrading.local', password: 'AdminPassword1!' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken as string;

    const createSeason = await request(app.getHttpServer())
      .post('/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'FantaTrading FAVC 2026/27',
        footballSeason: '2026/27',
        status: SeasonStatus.OPEN,
        registrationOpenAt: '2026-07-01T00:00:00.000Z',
        registrationCloseAt: '2026-08-15T23:59:59.000Z',
        startDate: '2026-08-20T00:00:00.000Z',
        endDate: '2027-05-31T23:59:59.000Z',
        totalRounds: 38,
        initialBudget: 100,
        buyCommissionRate: 0.02,
        sellCommissionRate: 0.02,
      })
      .expect(201);
    const seasonId = createSeason.body.id as string;

    const importQuotes = await request(app.getHttpServer())
      .post('/admin/import/quotes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ seasonId, sourcePath: quotesPath })
      .expect(201);

    expect(importQuotes.body.recordsImported).toBe(51);
    expect(state.importLogs[0].type).toBe(ImportType.QUOTES_INITIAL);
    expect(state.importLogs[0].status).toBe(ImportStatus.SUCCESS);

    const participantA = await registerParticipant('alpha@fantatrading.local');
    const participantB = await registerParticipant('beta@fantatrading.local');

    const teamA = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${participantA.accessToken}`)
      .send({ seasonId })
      .expect(201);
    const teamB = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${participantB.accessToken}`)
      .send({ seasonId })
      .expect(201);

    expect(teamA.body.initialBudget).toBe(0);
    expect(teamA.body.availableBudget).toBe(0);

    await buyRoster(participantA.accessToken, teamA.body.id, 'a');

    const completePortfolioA = await request(app.getHttpServer())
      .get(`/teams/${teamA.body.id}/portfolio`)
      .set('Authorization', `Bearer ${participantA.accessToken}`)
      .expect(200);

    expect(completePortfolioA.body.summary.playerCount).toBe(25);
    expect(completePortfolioA.body.summary.composition.GK).toBe(3);
    expect(completePortfolioA.body.summary.composition.DEF).toBe(8);
    expect(completePortfolioA.body.summary.composition.MID).toBe(8);
    expect(completePortfolioA.body.summary.composition.FWD).toBe(6);
    expect(completePortfolioA.body.summary.isRosterComplete).toBe(true);
    expect(completePortfolioA.body.summary.currentPortfolioValue).toBe(150);
    expect(completePortfolioA.body.summary.totalCapitalDeposited).toBeCloseTo(153);
    expect(completePortfolioA.body.summary.virtualCashBalance).toBe(0);

    const sell = await request(app.getHttpServer())
      .post('/market/sell')
      .set('Authorization', `Bearer ${participantA.accessToken}`)
      .send({ teamId: teamA.body.id, playerId: externalPlayerId('a-gk-1') })
      .expect(201);

    expect(sell.body.operation.type).toBe(OperationType.SELL);
    expect(sell.body.operation.grossAmount).toBe(6);
    expect(sell.body.operation.commissionAmount).toBeCloseTo(0.12);
    expect(sell.body.operation.netAmount).toBeCloseTo(5.88);
    expect(sell.body.operation.systemRevenue).toBeCloseTo(0.12);
    expect(sell.body.portfolio.summary.virtualCashBalance).toBeCloseTo(5.88);

    const replacement = await buyByExternalId(participantA.accessToken, teamA.body.id, 'a-gk-sub');

    expect(replacement.body.operation.type).toBe(OperationType.BUY);
    expect(replacement.body.operation.grossAmount).toBe(6);
    expect(replacement.body.operation.commissionAmount).toBeCloseTo(0.12);
    expect(replacement.body.operation.netAmount).toBeCloseTo(6.12);
    expect(replacement.body.operation.systemRevenue).toBeCloseTo(0.12);
    expect(replacement.body.portfolio.summary.totalCapitalDeposited).toBeCloseTo(153.24);
    expect(replacement.body.portfolio.summary.virtualCashBalance).toBeCloseTo(0);
    expect(replacement.body.portfolio.summary.totalCapitalDeposited).toBeLessThan(153 + 6.12);

    await buyRoster(participantB.accessToken, teamB.body.id, 'b');

    const portfolioBInitial = await request(app.getHttpServer())
      .get(`/teams/${teamB.body.id}/portfolio`)
      .set('Authorization', `Bearer ${participantB.accessToken}`)
      .expect(200);

    expect(portfolioBInitial.body.summary.currentPortfolioValue).toBe(600);
    expect(portfolioBInitial.body.summary.totalCapitalDeposited).toBeCloseTo(612);
    expect(portfolioBInitial.body.summary.totalCapitalDeposited).toBeGreaterThan(createSeason.body.initialBudget);
    expect(portfolioBInitial.body.summary.virtualCashBalance).toBe(0);

    const operations = await request(app.getHttpServer())
      .get('/market/operations')
      .query({ teamId: teamA.body.id })
      .set('Authorization', `Bearer ${participantA.accessToken}`)
      .expect(200);

    expect(operations.body).toHaveLength(27);
    expect(operations.body.filter((operation: { type: OperationType }) => operation.type === OperationType.BUY)).toHaveLength(26);
    expect(operations.body.filter((operation: { type: OperationType }) => operation.type === OperationType.SELL)).toHaveLength(1);
    expect(operations.body.every((operation: { systemRevenue: number; commissionAmount: number }) => operation.systemRevenue === operation.commissionAmount)).toBe(true);

    setCurrentQuotesForPrefix('a', 10);
    setCurrentQuotesForPrefix('b', 26);

    const portfolioA = await request(app.getHttpServer())
      .get(`/teams/${teamA.body.id}/portfolio`)
      .set('Authorization', `Bearer ${participantA.accessToken}`)
      .expect(200);
    const portfolioB = await request(app.getHttpServer())
      .get(`/teams/${teamB.body.id}/portfolio`)
      .set('Authorization', `Bearer ${participantB.accessToken}`)
      .expect(200);

    expect(portfolioA.body.summary.currentPortfolioValue).toBeCloseTo(180);
    expect(portfolioA.body.summary.netLiquidationValue).toBeCloseTo(176.4);
    expect(portfolioA.body.summary.roiPct).toBeCloseTo(15.11615766);
    expect(portfolioA.body.summary.totalBuyCommissions).toBeCloseTo(3.12);
    expect(portfolioA.body.summary.totalSellCommissions).toBeCloseTo(0.12);
    expect(portfolioA.body.summary.totalCommissionsPaid).toBeCloseTo(3.24);
    expect(portfolioB.body.summary.currentPortfolioValue).toBeCloseTo(660);
    expect(portfolioB.body.summary.netLiquidationValue).toBeCloseTo(646.8);
    expect(portfolioB.body.summary.roiPct).toBeCloseTo(5.68627451);

    await request(app.getHttpServer())
      .patch(`/seasons/${seasonId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: SeasonStatus.COMPLETED })
      .expect(200);

    const settlement = await request(app.getHttpServer())
      .post(`/admin/seasons/${seasonId}/settlement/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const alphaSettlement = settlement.body.settlements.find((item: { teamId: string }) => item.teamId === teamA.body.id);
    const betaSettlement = settlement.body.settlements.find((item: { teamId: string }) => item.teamId === teamB.body.id);

    expect(alphaSettlement.activePositionsValue).toBeCloseTo(180);
    expect(alphaSettlement.netLiquidationValue).toBeCloseTo(176.4);
    expect(alphaSettlement.finalLiquidationValue).toBeCloseTo(
      alphaSettlement.netLiquidationValue + alphaSettlement.virtualCashBalance,
    );
    expect(alphaSettlement.finalLiquidationValue).not.toBeCloseTo(
      alphaSettlement.netLiquidationValue * (1 + alphaSettlement.roiPct / 100),
    );
    expect(alphaSettlement.rankByRoi).toBe(1);
    expect(betaSettlement.activePositionsValue).toBeCloseTo(660);
    expect(betaSettlement.finalLiquidationValue).toBeGreaterThan(alphaSettlement.finalLiquidationValue);
    expect(betaSettlement.rankByRoi).toBe(2);
    expect(alphaSettlement.roiPct).toBeGreaterThan(betaSettlement.roiPct);

    for (const row of settlement.body.settlements as Array<Record<string, unknown>>) {
      expect(row).not.toHaveProperty('payoutAmount');
      expect(row).not.toHaveProperty('paymentStatus');
      expect(row).not.toHaveProperty('realPayout');
    }

    await request(app.getHttpServer())
      .post(`/admin/seasons/${seasonId}/settlement/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(state.finalSettlements).toHaveLength(2);
    expect(state.auditLogs).toHaveLength(2);

    const ownSettlement = await request(app.getHttpServer())
      .get(`/teams/${teamA.body.id}/final-settlement`)
      .set('Authorization', `Bearer ${participantA.accessToken}`)
      .expect(200);

    expect(ownSettlement.body.teamId).toBe(teamA.body.id);
    expect(ownSettlement.body.persisted).toBe(true);
    expect(ownSettlement.body.stable).toBe(true);
    expect(ownSettlement.body.finalLiquidationValue).toBeCloseTo(alphaSettlement.finalLiquidationValue);
    expect(ownSettlement.body).not.toHaveProperty('payoutAmount');
  }, 30000);
});
