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
    ...Array.from({ length: 8 }, (_, index) => ({ id: `def-${index + 1}`, firstName: 'Def', lastName: `${index + 1}`, role: PlayerRole.DEF, realTeam: 'Club' })),
    ...Array.from({ length: 8 }, (_, index) => ({ id: `mid-${index + 1}`, firstName: 'Mid', lastName: `${index + 1}`, role: PlayerRole.MID, realTeam: 'Club' })),
    { id: 'fwd-1', firstName: 'Forward', lastName: 'One', role: PlayerRole.FWD, realTeam: 'Club' },
    ...Array.from({ length: 5 }, (_, index) => ({ id: `fwd-${index + 2}`, firstName: 'Forward', lastName: `${index + 2}`, role: PlayerRole.FWD, realTeam: 'Club' })),
    // Giocatore costoso per test FAVC: quota > initialBudget della stagione (500)
    { id: 'fwd-expensive', firstName: 'Forward', lastName: 'Expensive', role: PlayerRole.FWD, realTeam: 'Club' },
  ];
  const quotes: StoredQuote[] = players.map((player) => ({
    id: `quote-${player.id}`,
    seasonId: season.id,
    playerId: player.id,
    initialQuote: player.id === 'fwd-1' ? 100 : player.id === 'fwd-expensive' ? 600 : 10,
    currentQuote: player.id === 'fwd-1' ? 100 : player.id === 'fwd-expensive' ? 600 : 10,
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

  let prisma: any;
  prisma = {
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
      findMany: jest.fn(async ({ where }) =>
        quotes
          .filter((quote) => quote.seasonId === where.seasonId && where.playerId.in.includes(quote.playerId))
          .map((quote) => ({ ...quote, player: players.find((player) => player.id === quote.playerId) })),
      ),
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
      deleteMany: jest.fn(async ({ where }) => {
        const before = positions.length;
        for (let index = positions.length - 1; index >= 0; index -= 1) {
          if (positions[index].teamId === where.teamId) positions.splice(index, 1);
        }
        return { count: before - positions.length };
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
      deleteMany: jest.fn(async ({ where }) => {
        const before = operations.length;
        for (let index = operations.length - 1; index >= 0; index -= 1) {
          if (operations[index].teamId === where.teamId) operations.splice(index, 1);
        }
        return { count: before - operations.length };
      }),
    },
    platformFee: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    finalSettlement: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    prizeAward: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    ranking: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    roundPlayerResult: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    $transaction: jest.fn(async (callback) => callback(prisma)),
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

  const fullRosterIds = [
    'gk-1',
    'gk-2',
    'gk-3',
    ...Array.from({ length: 8 }, (_, index) => `def-${index + 1}`),
    ...Array.from({ length: 8 }, (_, index) => `mid-${index + 1}`),
    ...Array.from({ length: 6 }, (_, index) => `fwd-${index + 1}`),
  ];

  it('creates a team and prevents duplicate team in the same season', async () => {
    const team = await createTeam();

    expect(team.id).toBe('team-1');
    expect(team.status).toBe('DRAFT');
    expect(team.availableBudget).toBe(0);
    expect(team.initialBudget).toBe(0);

    await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ seasonId: 'season-1' })
      .expect(409);
  });

  it('creates a team with initial virtual capital', async () => {
    const response = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ seasonId: 'season-1', initialVirtualCapital: 300 })
      .expect(201);

    expect(response.body.initialBudget).toBe(300);
    expect(response.body.availableBudget).toBe(300);
  });

  it('creates a complete roster with initial capital and 2% buy commissions', async () => {
    const response = await request(app.getHttpServer())
      .post('/teams/create-with-roster')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ seasonId: 'season-1', initialVirtualCapital: 500, playerIds: fullRosterIds })
      .expect(201);

    expect(response.body.positions).toHaveLength(25);
    expect(response.body.summary.isRosterComplete).toBe(true);
    expect(response.body.summary.composition.GK).toBe(3);
    expect(response.body.summary.composition.DEF).toBe(8);
    expect(response.body.summary.composition.MID).toBe(8);
    expect(response.body.summary.composition.FWD).toBe(6);
    expect(response.body.summary.initialRosterCost).toBe(340);
    expect(response.body.summary.totalBuyCommissions).toBeCloseTo(6.8);
    expect(response.body.summary.totalCapitalDeposited).toBe(500);
    expect(response.body.summary.virtualCashBalance).toBeCloseTo(153.2);
    expect(state.operations).toHaveLength(25);
    expect(state.operations.every((operation) => operation.type === OperationType.BUY)).toBe(true);
  });

  it('blocks duplicate players and invalid role composition in create-with-roster', async () => {
    await request(app.getHttpServer())
      .post('/teams/create-with-roster')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ seasonId: 'season-1', initialVirtualCapital: 500, playerIds: [...fullRosterIds.slice(0, 24), 'gk-1'] })
      .expect(400);

    await request(app.getHttpServer())
      .post('/teams/create-with-roster')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ seasonId: 'season-1', initialVirtualCapital: 500, playerIds: [...fullRosterIds.slice(0, 24), 'gk-4'] })
      .expect(400);
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
    expect(state.teams[0].availableBudget).toBe(0);
    expect(state.teams[0].initialBudget).toBe(102);
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
    expect(state.teams[0].availableBudget).toBe(98);
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
    // FAVC ROI: netLiquidation = 100*(1-0.02)=98, cash=0, deposited=102
    // ROI = (98+0-102)/102*100 = -3.9215686%
    expect(portfolio.body.summary.currentRoi).toBeCloseTo(-3.9215686);
    // Campi FAVC
    expect(portfolio.body.summary.totalCapitalDeposited).toBe(102);
    expect(portfolio.body.summary.virtualCashBalance).toBe(0);
    expect(portfolio.body.summary.netLiquidationValue).toBeCloseTo(98);
    expect(portfolio.body.summary.initialRosterCost).toBe(100);
    expect(portfolio.body.summary.totalBuyCommissions).toBeCloseTo(2);
    expect(portfolio.body.summary.totalSellCommissions).toBeCloseTo(0);
    expect(portfolio.body.summary.roiPct).toBeCloseTo(-3.9215686);

    const operations = await request(app.getHttpServer())
      .get('/market/operations')
      .query({ teamId: team.id })
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(200);

    expect(operations.body).toHaveLength(1);
    expect(operations.body[0].grossAmount).toBe(100);
    expect(operations.body[0].systemRevenue).toBe(2);
  });

  // ─── FREE_ACCESS_VARIABLE_CAPITAL tests ───────────────────────────────────────

  it('[FAVC] vendita giocatore meno costoso aumenta virtualCashBalance', async () => {
    const team = await createTeam();
    // Acquisto: cash 0, deposito automatico 102, virtualCashBalance=0
    await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    // Vendita: 100*(1-0.02)=98 netti rientrano in virtualCashBalance
    const sell = await request(app.getHttpServer())
      .post('/market/sell')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    expect(sell.body.portfolio.summary.virtualCashBalance).toBe(98);
    expect(sell.body.portfolio.summary.currentPortfolioValue).toBe(0);
    expect(sell.body.portfolio.summary.netLiquidationValue).toBe(0);
  });

  it('[FAVC] acquisto giocatore costoso oltre liquidità aumenta totalCapitalDeposited', async () => {
    const team = await createTeam();
    // fwd-expensive: quota 600, commissione 2% → totalCost = 612
    // cash iniziale 0 → capitalToAdd=612 → totalCapitalDeposited=612
    const buy = await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-expensive' })
      .expect(201);

    expect(buy.body.portfolio.summary.totalCapitalDeposited).toBeCloseTo(612);
    expect(buy.body.portfolio.summary.virtualCashBalance).toBeCloseTo(0);
    expect(buy.body.portfolio.summary.currentPortfolioValue).toBeCloseTo(600);
  });

  it('[FAVC] commissioni trattenute dal sistema come system revenue', async () => {
    const team = await createTeam();
    const buy = await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    // systemRevenue = commissione trattenta dal sistema
    expect(buy.body.operation.systemRevenue).toBe(2);
    expect(buy.body.operation.systemRevenue).toBe(buy.body.operation.commissionAmount);
  });

  it('[FAVC] classifica per ROI% — totalBuyCommissions e totalSellCommissions separati', async () => {
    const team = await createTeam();
    await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/market/sell')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ teamId: team.id, playerId: 'fwd-1' })
      .expect(201);

    const portfolio = await request(app.getHttpServer())
      .get(`/teams/${team.id}/portfolio`)
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(200);

    // Dopo buy+sell: totalCommissions = 2 (buy) + 2 (sell) = 4
    expect(portfolio.body.summary.totalCommissionsPaid).toBeCloseTo(4);
    expect(portfolio.body.summary.totalBuyCommissions).toBeCloseTo(2);
    expect(portfolio.body.summary.totalSellCommissions).toBeCloseTo(2);
    // Nessuna posizione attiva → netLiquidationValue=0
    expect(portfolio.body.summary.netLiquidationValue).toBe(0);
    expect(portfolio.body.summary.currentPortfolioValue).toBe(0);
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
