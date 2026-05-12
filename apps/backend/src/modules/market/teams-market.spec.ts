import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { OperationType, PlayerRole, PositionStatus, SeasonStatus, TeamStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { TeamsController } from '../teams/teams.controller';
import { TeamsService } from '../teams/teams.service';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

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

type StoredPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  role: PlayerRole;
  realTeam: string;
};

type StoredQuote = {
  id: string;
  seasonId: string;
  playerId: string;
  initialQuote: number;
  currentQuote: number;
  finalQuote: number | null;
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

const createPrismaMock = () => {
  const now = new Date();
  const season = {
    id: 'season-1',
    name: 'FantaTrading 2026/27',
    footballSeason: '2026/27',
    status: SeasonStatus.OPEN,
    initialBudget: 500,
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.02,
  };
  const players: StoredPlayer[] = [
    { id: 'gk-1', firstName: 'Gk', lastName: 'One', role: PlayerRole.GK, realTeam: 'Club' },
    { id: 'gk-2', firstName: 'Gk', lastName: 'Two', role: PlayerRole.GK, realTeam: 'Club' },
    { id: 'gk-3', firstName: 'Gk', lastName: 'Three', role: PlayerRole.GK, realTeam: 'Club' },
    { id: 'gk-4', firstName: 'Gk', lastName: 'Four', role: PlayerRole.GK, realTeam: 'Club' },
    { id: 'fwd-1', firstName: 'Forward', lastName: 'One', role: PlayerRole.FWD, realTeam: 'Club' },
  ];
  const quotes: StoredQuote[] = players.map((player) => ({
    id: `quote-${player.id}`,
    seasonId: season.id,
    playerId: player.id,
    initialQuote: player.id === 'fwd-1' ? 100 : 10,
    currentQuote: player.id === 'fwd-1' ? 100 : 10,
    finalQuote: null,
  }));
  const teams: StoredTeam[] = [];
  const positions: StoredPosition[] = [];
  const operations: Array<Record<string, unknown>> = [];

  const enrichTeam = (team: StoredTeam) => ({
    ...team,
    season,
    user: { id: team.userId, email: `${team.userId}@test.local` },
    portfolioPositions: positions
      .filter((position) => position.teamId === team.id)
      .map((position) => ({
        ...position,
        player: players.find((player) => player.id === position.playerId),
        quote: quotes.find((quote) => quote.id === position.quoteId),
      })),
  });

  const prisma = {
    season: {
      findUnique: jest.fn(async ({ where }) => (where.id === season.id ? season : null)),
    },
    team: {
      findUnique: jest.fn(async ({ where }) => {
        const team = where.id
          ? teams.find((item) => item.id === where.id)
          : teams.find((item) => item.userId === where.userId_seasonId.userId && item.seasonId === where.userId_seasonId.seasonId);
        return team ? enrichTeam(team) : null;
      }),
      findMany: jest.fn(async ({ where }) =>
        teams
          .filter((team) => !where?.userId || team.userId === where.userId)
          .map((team) => enrichTeam(team)),
      ),
      create: jest.fn(async ({ data }) => {
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
      update: jest.fn(async ({ where, data }) => {
        const team = teams.find((item) => item.id === where.id);
        if (!team) return null;
        Object.assign(team, data, { updatedAt: new Date() });
        return enrichTeam(team);
      }),
    },
    quote: {
      findUnique: jest.fn(async ({ where }) => {
        const quote = quotes.find((item) =>
          item.seasonId === where.seasonId_playerId.seasonId &&
          item.playerId === where.seasonId_playerId.playerId,
        );
        if (!quote) return null;
        return { ...quote, player: players.find((player) => player.id === quote.playerId) };
      }),
    },
    portfolioPosition: {
      create: jest.fn(async ({ data }) => {
        const position: StoredPosition = {
          id: `position-${positions.length + 1}`,
          boughtAt: new Date(),
          ...data,
        };
        positions.push(position);
        return {
          ...position,
          player: players.find((player) => player.id === position.playerId),
          quote: quotes.find((quote) => quote.id === position.quoteId),
        };
      }),
      update: jest.fn(async ({ where, data }) => {
        const position = positions.find((item) => item.id === where.id);
        if (!position) return null;
        Object.assign(position, data);
        return position;
      }),
    },
    marketOperation: {
      create: jest.fn(async ({ data }) => {
        const operation = { id: `operation-${operations.length + 1}`, executedAt: new Date(), ...data };
        operations.push(operation);
        return operation;
      }),
      findMany: jest.fn(async ({ where }) =>
        operations
          .filter((operation) => operation.teamId === where.teamId)
          .map((operation) => ({
            ...operation,
            player: players.find((player) => player.id === operation.playerId),
          })),
      ),
    },
  };

  return { prisma, teams, positions, operations };
};

describe('Teams, portfolio and market', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let participantToken: string;
  let otherToken: string;
  let adminToken: string;
  let state: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_secret_minimum_32_characters_long';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    state = createPrismaMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        PassportModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [TeamsController, MarketController],
      providers: [
        TeamsService,
        MarketService,
        JwtStrategy,
        { provide: PrismaService, useValue: state.prisma },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    participantToken = jwtService.sign({ sub: 'user-1', email: 'user1@test.local', role: UserRole.PARTICIPANT });
    otherToken = jwtService.sign({ sub: 'user-2', email: 'user2@test.local', role: UserRole.PARTICIPANT });
    adminToken = jwtService.sign({ sub: 'admin-1', email: 'admin@test.local', role: UserRole.ADMIN });
  });

  afterEach(async () => {
    await app.close();
  });

  async function createTeam(token = participantToken) {
    const response = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ seasonId: 'season-1' })
      .expect(201);
    return response.body;
  }

  it('creates a team and prevents duplicate team in the same season', async () => {
    const team = await createTeam();

    expect(team.id).toBe('team-1');
    expect(team.status).toBe('DRAFT');
    expect(team.availableBudget).toBe(500);

    await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ seasonId: 'season-1' })
      .expect(409);
  });

  it('buys a player with 2% commission and records a market operation', async () => {
    const team = await createTeam();

    const buy = await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    expect(buy.body.operation.grossAmount).toBe(100);
    expect(buy.body.operation.commissionAmount).toBe(2);
    expect(buy.body.operation.netAmount).toBe(102);
    expect(buy.body.operation.systemRevenue).toBe(2);
    expect(state.operations).toHaveLength(1);
    expect(state.operations[0].type).toBe(OperationType.BUY);
    expect(state.teams[0].availableBudget).toBe(398);
  });

  it('sells a player with 2% commission and records a market operation', async () => {
    const team = await createTeam();
    await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    const sell = await request(app.getHttpServer())
      .post('/market/sell')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    expect(sell.body.operation.grossAmount).toBe(100);
    expect(sell.body.operation.commissionAmount).toBe(2);
    expect(sell.body.operation.netAmount).toBe(98);
    expect(sell.body.operation.systemRevenue).toBe(2);
    expect(state.operations).toHaveLength(2);
    expect(state.operations[1].type).toBe(OperationType.SELL);
    expect(state.positions[0].status).toBe(PositionStatus.SOLD);
    expect(state.teams[0].availableBudget).toBe(496);
  });

  it('prevents duplicate active player in the same roster', async () => {
    const team = await createTeam();
    await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(400);
  });

  it('validates roster role composition limits', async () => {
    const team = await createTeam();
    for (const playerId of ['gk-1', 'gk-2', 'gk-3']) {
      await request(app.getHttpServer())
        .post('/market/buy')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ teamId: team.id, playerId })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'gk-4' })
      .expect(400);
  });

  it('returns a correct portfolio summary and operation list', async () => {
    const team = await createTeam();
    await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    const portfolio = await request(app.getHttpServer())
      .get(`/teams/${team.id}/portfolio`)
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(200);

    expect(portfolio.body.positions).toHaveLength(1);
    expect(portfolio.body.summary.currentPortfolioValue).toBe(100);
    expect(portfolio.body.summary.totalCommissionsPaid).toBe(2);
    expect(portfolio.body.summary.playerCount).toBe(1);
    expect(portfolio.body.summary.composition.FWD).toBe(1);
    expect(portfolio.body.summary.currentRoi).toBeCloseTo(-0.4);

    const operations = await request(app.getHttpServer())
      .get('/market/operations')
      .query({ teamId: team.id })
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(200);

    expect(operations.body).toHaveLength(1);
    expect(operations.body[0].grossAmount).toBe(100);
    expect(operations.body[0].systemRevenue).toBe(2);
  });

  it('denies access to another user team and prevents admin operations', async () => {
    const team = await createTeam();

    await request(app.getHttpServer())
      .get(`/teams/${team.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/teams/${team.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(403);
  });
});
