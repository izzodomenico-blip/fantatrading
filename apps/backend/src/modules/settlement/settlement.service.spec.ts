import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { PositionStatus, SeasonStatus, TeamStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AdminSettlementController } from './settlement-admin.controller';
import { TeamSettlementController } from './settlement-team.controller';
import { SettlementService } from './settlement.service';

const createPrismaMock = () => {
  const season = {
    id: 'season-1',
    name: 'FantaTrading 2026/27',
    footballSeason: '2026/27',
    status: SeasonStatus.COMPLETED,
    sellCommissionRate: 0.02,
    prizeThreshold: 0.07,
  };
  const teams = [
    {
      id: 'team-1',
      userId: 'user-1',
      seasonId: season.id,
      status: TeamStatus.ROSA_ATTIVA,
      initialBudget: 285,
      availableBudget: 16,
      totalCommissionsPaid: 0,
      currentPortfolioValue: 300,
      currentRoi: 0,
      season,
      portfolioPositions: [
        {
          id: 'position-1',
          teamId: 'team-1',
          playerId: 'player-1',
          quoteId: 'quote-1',
          initialQuote: 300,
          buyValue: 300,
          buyCommission: 0,
          totalBuyCost: 300,
          fantasyMultiplier: 1,
          currentSellValue: 300,
          status: PositionStatus.ACTIVE,
          quote: { id: 'quote-1', currentQuote: 300 },
        },
      ],
    },
    {
      id: 'team-2',
      userId: 'user-2',
      seasonId: season.id,
      status: TeamStatus.ROSA_ATTIVA,
      initialBudget: 100,
      availableBudget: 0,
      totalCommissionsPaid: 0,
      currentPortfolioValue: 100,
      currentRoi: 0,
      season,
      portfolioPositions: [
        {
          id: 'position-2',
          teamId: 'team-2',
          playerId: 'player-2',
          quoteId: 'quote-2',
          initialQuote: 100,
          buyValue: 100,
          buyCommission: 0,
          totalBuyCost: 100,
          fantasyMultiplier: 1,
          currentSellValue: 100,
          status: PositionStatus.ACTIVE,
          quote: { id: 'quote-2', currentQuote: 100 },
        },
      ],
    },
  ];
  const finalSettlements: Array<Record<string, unknown>> = [];
  const auditLogs: Array<Record<string, unknown>> = [];

  const prisma = {
    season: {
      findUnique: jest.fn(async ({ where }) => (where.id === season.id ? season : null)),
    },
    team: {
      findUnique: jest.fn(async ({ where }) => teams.find((team) => team.id === where.id) ?? null),
      findMany: jest.fn(async ({ where }) => teams.filter((team) => team.seasonId === where.seasonId)),
    },
    finalSettlement: {
      findFirst: jest.fn(async ({ where }) => {
        const rows = finalSettlements.filter((row) => row.teamId === where.teamId);
        return rows[rows.length - 1] ?? null;
      }),
      create: jest.fn(async ({ data }) => {
        const settlement = {
          id: `settlement-${finalSettlements.length + 1}`,
          calculatedAt: new Date(),
          source: 'FINAL_SETTLEMENT',
          ...data,
        };
        finalSettlements.push(settlement);
        return settlement;
      }),
    },
    auditLog: {
      create: jest.fn(async ({ data }) => {
        const audit = { id: `audit-${auditLogs.length + 1}`, executedAt: new Date(), ...data };
        auditLogs.push(audit);
        return audit;
      }),
    },
  };

  return { prisma, finalSettlements, auditLogs };
};

describe('Final settlement', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let participantToken: string;
  let otherToken: string;
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
      controllers: [AdminSettlementController, TeamSettlementController],
      providers: [
        SettlementService,
        JwtStrategy,
        { provide: PrismaService, useValue: state.prisma },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    adminToken = jwtService.sign({ sub: 'admin-1', email: 'admin@test.local', role: UserRole.ADMIN });
    participantToken = jwtService.sign({ sub: 'user-1', email: 'user1@test.local', role: UserRole.PARTICIPANT });
    otherToken = jwtService.sign({ sub: 'user-2', email: 'user2@test.local', role: UserRole.PARTICIPANT });
  });

  afterEach(async () => {
    await app.close();
  });

  async function calculateAsAdmin() {
    return request(app.getHttpServer())
      .post('/admin/seasons/season-1/settlement/calculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
  }

  it('admin calculates final settlement without double counting ROI', async () => {
    const response = await calculateAsAdmin();
    const teamOne = response.body.settlements.find((settlement: { teamId: string }) => settlement.teamId === 'team-1');

    expect(teamOne.totalCapitalDeposited).toBe(285);
    expect(teamOne.initialRosterCost).toBe(300);
    expect(teamOne.virtualCashBalance).toBe(16);
    expect(teamOne.activePositionsValue).toBe(300);
    expect(teamOne.applyFinalSellCommission).toBe(true);
    expect(teamOne.finalSellCommissionAmount).toBe(6);
    expect(teamOne.netLiquidationValue).toBe(294);
    expect(teamOne.finalLiquidationValue).toBe(310);
    expect(teamOne.profitLoss).toBe(25);
    expect(teamOne.roiPct).toBeCloseTo(8.7719298);
    expect(teamOne.finalLiquidationValue).not.toBeCloseTo(310 * (1 + teamOne.roiPct / 100));
    expect(teamOne.rankByRoi).toBe(1);
    expect(teamOne.isPrizeEligible).toBe(true);
    expect(state.auditLogs).toHaveLength(2);
    expect(state.auditLogs[0].action).toBe('CALCULATE_FINAL_SETTLEMENT');
  });

  it('user reads only own persisted final settlement', async () => {
    await calculateAsAdmin();

    const own = await request(app.getHttpServer())
      .get('/teams/team-1/final-settlement')
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(200);

    expect(own.body.teamId).toBe('team-1');
    expect(own.body.persisted).toBe(true);
    expect(own.body.finalLiquidationValue).toBe(310);

    await request(app.getHttpServer())
      .get('/teams/team-1/final-settlement')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('does not create a new settlement snapshot for an already completed stable season', async () => {
    await calculateAsAdmin();
    await calculateAsAdmin();

    expect(state.finalSettlements).toHaveLength(2);
    expect(state.auditLogs).toHaveLength(2);
  });
});
