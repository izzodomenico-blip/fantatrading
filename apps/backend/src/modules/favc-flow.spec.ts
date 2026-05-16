/**
 * FAVC (Free Access Variable Capital) end-to-end backend flow.
 *
 * Verifies the full cycle:
 *   1. admin season pre-loaded with FAVC parameters
 *   2. players + quotes pre-loaded (simulating admin import)
 *   3. user registered (JWT issued)
 *   4. user creates team (initial capital 0)
 *   5. user buys a valid 3GK / 8DEF / 8MID / 6FWD roster
 *   6. totalCapitalDeposited grows on-demand, virtualCashBalance stays consistent
 *   7. user sells a player → virtualCashBalance increases
 *   8. user buys a replacement → existing cash is consumed before new deposits
 *   9. every operation creates a MarketOperation row
 *  10. portfolio summary exposes ROI%
 *  11. ranking orders by ROI%, not by absolute wealth
 *  12. admin calculates final settlement
 *  13. user reads own final settlement
 *
 * No real payouts: the prize flag is only an `isPrizeEligible` boolean.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import {
  OperationType,
  PlayerRole,
  PositionStatus,
  SeasonStatus,
  TeamStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import appConfig from '../config/app.config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { MarketController } from './market/market.controller';
import { MarketService } from './market/market.service';
import { AdminSettlementController } from './settlement/settlement-admin.controller';
import { TeamSettlementController } from './settlement/settlement-team.controller';
import { SettlementService } from './settlement/settlement.service';
import { TeamsController } from './teams/teams.controller';
import { TeamsService } from './teams/teams.service';

// ─── Player/quote fixtures (simulate admin import) ──────────────────────────

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

const buildRosterFixtures = (seasonId: string) => {
  const players: StoredPlayer[] = [];
  const quotes: StoredQuote[] = [];
  const push = (id: string, role: PlayerRole, quote: number) => {
    players.push({ id, firstName: 'Player', lastName: id.toUpperCase(), role, realTeam: 'Club' });
    quotes.push({
      id: `q-${id}`,
      seasonId,
      playerId: id,
      initialQuote: quote,
      currentQuote: quote,
      finalQuote: null,
    });
  };
  for (let i = 1; i <= 3; i += 1) push(`gk-${i}`, PlayerRole.GK, 10);
  for (let i = 1; i <= 8; i += 1) push(`def-${i}`, PlayerRole.DEF, 10);
  for (let i = 1; i <= 8; i += 1) push(`mid-${i}`, PlayerRole.MID, 10);
  for (let i = 1; i <= 6; i += 1) push(`fwd-${i}`, PlayerRole.FWD, 10);
  // Replacement forward, cheaper than fwd-6 to prove cash-first ordering
  push('fwd-7', PlayerRole.FWD, 8);
  return { players, quotes };
};

const buildFlowMock = () => {
  const seasonId = 'season-favc';
  const now = new Date();
  const season = {
    id: seasonId,
    name: 'FantaTrading FAVC 2026/27',
    footballSeason: '2026/27',
    status: SeasonStatus.OPEN as SeasonStatus,
    initialBudget: 0,
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.02,
    platformFeeRate: 0.1,
    prizeThreshold: 0.07,
    survivalThreshold: 0,
  };
  const { players, quotes } = buildRosterFixtures(seasonId);
  const teams: StoredTeam[] = [];
  const positions: StoredPosition[] = [];
  const operations: Array<Record<string, unknown>> = [];
  const finalSettlements: Array<Record<string, unknown>> = [];
  const auditLogs: Array<Record<string, unknown>> = [];

  const enrichTeam = (team: StoredTeam) => ({
    ...team,
    season,
    user: { id: team.userId, email: `${team.userId}@favc.local` },
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
      findUnique: jest.fn(async ({ where }: any) => (where.id === season.id ? season : null)),
    },
    team: {
      findUnique: jest.fn(async ({ where }: any) => {
        const team = where.id
          ? teams.find((item) => item.id === where.id)
          : teams.find(
              (item) =>
                item.userId === where.userId_seasonId.userId &&
                item.seasonId === where.userId_seasonId.seasonId,
            );
        return team ? enrichTeam(team) : null;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        teams
          .filter((team) => (where?.seasonId ? team.seasonId === where.seasonId : true))
          .filter((team) => (where?.userId ? team.userId === where.userId : true))
          .map((team) => enrichTeam(team)),
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
    quote: {
      findUnique: jest.fn(async ({ where }: any) => {
        const quote = quotes.find(
          (item) =>
            item.seasonId === where.seasonId_playerId.seasonId &&
            item.playerId === where.seasonId_playerId.playerId,
        );
        if (!quote) return null;
        return { ...quote, player: players.find((player) => player.id === quote.playerId) };
      }),
      findMany: jest.fn(async ({ where }: any) =>
        quotes
          .filter((quote) => quote.seasonId === where.seasonId)
          .filter((quote) => (where.playerId?.in ? where.playerId.in.includes(quote.playerId) : true))
          .map((quote) => ({ ...quote, player: players.find((p) => p.id === quote.playerId) })),
      ),
    },
    portfolioPosition: {
      create: jest.fn(async ({ data }: any) => {
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
      update: jest.fn(async ({ where, data }: any) => {
        const position = positions.find((item) => item.id === where.id);
        if (!position) return null;
        Object.assign(position, data);
        return position;
      }),
    },
    marketOperation: {
      create: jest.fn(async ({ data }: any) => {
        const operation = {
          id: `operation-${operations.length + 1}`,
          executedAt: new Date(),
          ...data,
        };
        operations.push(operation);
        return operation;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        operations
          .filter((operation) => operation.teamId === where.teamId)
          .map((operation) => ({
            ...operation,
            player: players.find((player) => player.id === operation.playerId),
          })),
      ),
    },
    finalSettlement: {
      findFirst: jest.fn(async ({ where }: any) => {
        const rows = finalSettlements.filter((row) => row.teamId === where.teamId);
        return rows[rows.length - 1] ?? null;
      }),
      create: jest.fn(async ({ data }: any) => {
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
      create: jest.fn(async ({ data }: any) => {
        const audit = {
          id: `audit-${auditLogs.length + 1}`,
          executedAt: new Date(),
          ...data,
        };
        auditLogs.push(audit);
        return audit;
      }),
    },
  };

  return { prisma, season, teams, positions, operations, finalSettlements, auditLogs, players, quotes };
};

// ─── Test module factory ────────────────────────────────────────────────────

async function buildApp(prisma: unknown) {
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
      TeamsController,
      MarketController,
      AdminSettlementController,
      TeamSettlementController,
    ],
    providers: [
      TeamsService,
      MarketService,
      SettlementService,
      JwtStrategy,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return { app, moduleFixture };
}

// ─── Flow test: single user, complete cycle ─────────────────────────────────

describe('FAVC end-to-end backend flow (single user)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let state: ReturnType<typeof buildFlowMock>;
  let userToken: string;
  let adminToken: string;
  let teamId: string;

  // 25-player roster: 3 GK + 8 DEF + 8 MID + 6 FWD
  const FULL_ROSTER_IDS = [
    'gk-1', 'gk-2', 'gk-3',
    'def-1', 'def-2', 'def-3', 'def-4', 'def-5', 'def-6', 'def-7', 'def-8',
    'mid-1', 'mid-2', 'mid-3', 'mid-4', 'mid-5', 'mid-6', 'mid-7', 'mid-8',
    'fwd-1', 'fwd-2', 'fwd-3', 'fwd-4', 'fwd-5', 'fwd-6',
  ];

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_secret_minimum_32_characters_long';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    state = buildFlowMock();
    const built = await buildApp(state.prisma);
    app = built.app;
    jwtService = built.moduleFixture.get(JwtService);
    userToken = jwtService.sign({
      sub: 'user-favc',
      email: 'user-favc@favc.local',
      role: UserRole.PARTICIPANT,
    });
    adminToken = jwtService.sign({
      sub: 'admin-favc',
      email: 'admin@favc.local',
      role: UserRole.ADMIN,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('Step 1+2: season + players/quotes pre-loaded with FAVC parameters', () => {
    // Step 1: admin-created season is FAVC (zero default budget, 2% commissions).
    expect(state.season.id).toBe('season-favc');
    expect(state.season.initialBudget).toBe(0);
    expect(state.season.buyCommissionRate).toBe(0.02);
    expect(state.season.sellCommissionRate).toBe(0.02);
    expect(state.season.prizeThreshold).toBe(0.07);

    // Step 2: 25 squad players plus 1 replacement, all with quotes.
    expect(state.players).toHaveLength(26);
    expect(state.quotes).toHaveLength(26);
    expect(state.players.filter((p) => p.role === PlayerRole.GK)).toHaveLength(3);
    expect(state.players.filter((p) => p.role === PlayerRole.DEF)).toHaveLength(8);
    expect(state.players.filter((p) => p.role === PlayerRole.MID)).toHaveLength(8);
    expect(state.players.filter((p) => p.role === PlayerRole.FWD)).toHaveLength(7);
  });

  it('Step 3+4: user registers (JWT) and creates a team with zero initial capital', async () => {
    const response = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ seasonId: state.season.id })
      .expect(201);

    expect(response.body.status).toBe('DRAFT');
    expect(response.body.initialBudget).toBe(0);
    expect(response.body.availableBudget).toBe(0);
    teamId = response.body.id;
  });

  it('Step 5+6: user buys a valid 3GK/8DEF/8MID/6FWD roster — no max budget enforced', async () => {
    for (const playerId of FULL_ROSTER_IDS) {
      const buy = await request(app.getHttpServer())
        .post('/market/buy')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ teamId, playerId })
        .expect(201);

      // Each acquisition with empty cash triggers a fresh capital deposit.
      expect(buy.body.operation.grossAmount).toBe(10);
      expect(buy.body.operation.commissionAmount).toBeCloseTo(0.2);
      expect(buy.body.operation.netAmount).toBeCloseTo(10.2);
      expect(buy.body.operation.systemRevenue).toBeCloseTo(0.2);
    }

    // 25 deposits of 10.2 each → no max budget, capital grew freely.
    expect(state.teams[0].initialBudget).toBeCloseTo(25 * 10.2);
    expect(state.teams[0].availableBudget).toBeCloseTo(0);
    expect(state.positions.filter((p) => p.status === PositionStatus.ACTIVE)).toHaveLength(25);
    expect(state.operations).toHaveLength(25);
    expect(state.teams[0].status).toBe(TeamStatus.ROSA_ATTIVA);
  });

  it('Step 6: portfolio summary exposes totalCapitalDeposited and virtualCashBalance', async () => {
    const portfolio = await request(app.getHttpServer())
      .get(`/teams/${teamId}/portfolio`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(portfolio.body.summary.totalCapitalDeposited).toBeCloseTo(255);
    expect(portfolio.body.summary.virtualCashBalance).toBeCloseTo(0);
    expect(portfolio.body.summary.currentPortfolioValue).toBeCloseTo(250);
    // netLiquidationValue = 250 * (1 - 0.02) = 245
    expect(portfolio.body.summary.netLiquidationValue).toBeCloseTo(245);
    // ROI = (245 + 0 - 255) / 255 * 100 ≈ -3.9216
    expect(portfolio.body.summary.roiPct).toBeCloseTo(-3.9215686);
    expect(portfolio.body.summary.composition).toEqual({ GK: 3, DEF: 8, MID: 8, FWD: 6 });
    expect(portfolio.body.summary.isRosterComplete).toBe(true);
  });

  it('Step 7: selling a player increases virtualCashBalance (net of 2% sell commission)', async () => {
    const sell = await request(app.getHttpServer())
      .post('/market/sell')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ teamId, playerId: 'fwd-6' })
      .expect(201);

    // gross 10, commission 0.2, net 9.8 → returns to virtualCashBalance.
    expect(sell.body.operation.grossAmount).toBeCloseTo(10);
    expect(sell.body.operation.commissionAmount).toBeCloseTo(0.2);
    expect(sell.body.operation.netAmount).toBeCloseTo(9.8);
    expect(sell.body.operation.systemRevenue).toBeCloseTo(0.2);
    expect(sell.body.portfolio.summary.virtualCashBalance).toBeCloseTo(9.8);
    // totalCapitalDeposited unchanged — selling never refunds deposited capital.
    expect(sell.body.portfolio.summary.totalCapitalDeposited).toBeCloseTo(255);

    const fwd6 = state.positions.find((p) => p.playerId === 'fwd-6');
    expect(fwd6?.status).toBe(PositionStatus.SOLD);
  });

  it('Step 8: buying a cheaper replacement spends virtualCashBalance first, no extra deposit', async () => {
    const capitalBefore = state.teams[0].initialBudget;
    const cashBefore = state.teams[0].availableBudget;
    expect(cashBefore).toBeCloseTo(9.8);

    // fwd-7 quote=8 → totalCost = 8.16. Cash 9.8 covers it, so totalCapitalDeposited
    // must stay the same and the residual cash must be 9.8 - 8.16 = 1.64.
    const buy = await request(app.getHttpServer())
      .post('/market/buy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ teamId, playerId: 'fwd-7' })
      .expect(201);

    expect(buy.body.operation.netAmount).toBeCloseTo(8.16);
    expect(buy.body.portfolio.summary.totalCapitalDeposited).toBeCloseTo(capitalBefore);
    expect(buy.body.portfolio.summary.virtualCashBalance).toBeCloseTo(1.64);
  });

  it('Step 9: every operation has a MarketOperation row (system retains commissions)', async () => {
    const operations = await request(app.getHttpServer())
      .get('/market/operations')
      .query({ teamId })
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // 25 initial buys + 1 sell + 1 replacement buy = 27.
    expect(operations.body).toHaveLength(27);
    const buys = operations.body.filter((op: any) => op.type === OperationType.BUY);
    const sells = operations.body.filter((op: any) => op.type === OperationType.SELL);
    expect(buys).toHaveLength(26);
    expect(sells).toHaveLength(1);
    // System revenue equals the commission for every operation, so the platform
    // retains the full fee on both buys and sells.
    for (const op of operations.body) {
      expect(op.systemRevenue).toBeCloseTo(op.commissionAmount);
    }
  });

  it('Step 10: portfolio summary recalculates ROI after the swap', async () => {
    const portfolio = await request(app.getHttpServer())
      .get(`/teams/${teamId}/portfolio`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // 24 active old positions (quote 10 → value 10) + fwd-7 (quote 8 → value 8) = 248.
    expect(portfolio.body.summary.currentPortfolioValue).toBeCloseTo(248);
    // netLiq = 248 * 0.98 = 243.04
    expect(portfolio.body.summary.netLiquidationValue).toBeCloseTo(243.04);
    // ROI = (243.04 + 1.64 - 255) / 255 * 100 ≈ -4.0471
    expect(portfolio.body.summary.roiPct).toBeCloseTo((243.04 + 1.64 - 255) / 255 * 100);
    // Totale commissioni: 25 buy@10 × 0.2 + 1 sell@10 × 0.2 + 1 buy fwd-7@8 × 0.16 = 5.36.
    expect(portfolio.body.summary.totalCommissionsPaid).toBeCloseTo(25 * 0.2 + 0.2 + 0.16);
    expect(portfolio.body.summary.totalBuyCommissions).toBeCloseTo(25 * 0.2 + 0.16);
    expect(portfolio.body.summary.totalSellCommissions).toBeCloseTo(0.2);
  });

  it('Step 12+13: admin calculates final settlement and user reads own settlement', async () => {
    // Switch season to COMPLETED so subsequent recalculations remain stable.
    state.season.status = SeasonStatus.COMPLETED;

    const calc = await request(app.getHttpServer())
      .post(`/admin/seasons/${state.season.id}/settlement/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(calc.body.settlementCount).toBe(1);
    const settlement = calc.body.settlements[0];

    // No double counting: finalLiquidationValue = netLiquidationValue + virtualCashBalance.
    expect(settlement.finalLiquidationValue).toBeCloseTo(
      settlement.netLiquidationValue + settlement.virtualCashBalance,
    );
    // netLiquidationValue already applies the final sell commission → no second cut.
    expect(settlement.applyFinalSellCommission).toBe(true);
    expect(settlement.netLiquidationValue).toBeCloseTo(
      settlement.activePositionsValue * (1 - settlement.finalSellCommissionRate),
    );
    // profitLoss is a derived field, never duplicated.
    expect(settlement.profitLoss).toBeCloseTo(
      settlement.finalLiquidationValue - settlement.totalCapitalDeposited,
    );

    // No real payout — the prize layer is just a boolean flag.
    expect(typeof settlement.isPrizeEligible).toBe('boolean');
    expect(settlement).not.toHaveProperty('payout');
    expect(settlement).not.toHaveProperty('cashOut');
    expect(settlement).not.toHaveProperty('paidAmount');

    // User reads own settlement (admin already persisted it).
    const ownView = await request(app.getHttpServer())
      .get(`/teams/${teamId}/final-settlement`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(ownView.body.teamId).toBe(teamId);
    expect(ownView.body.persisted).toBe(true);
    expect(ownView.body.finalLiquidationValue).toBeCloseTo(settlement.finalLiquidationValue);
    expect(ownView.body.totalCapitalDeposited).toBeCloseTo(settlement.totalCapitalDeposited);
  });

  it('settlement: re-running the calculation on a COMPLETED season is idempotent (no double snapshot)', async () => {
    const before = state.finalSettlements.length;
    const beforeAudits = state.auditLogs.length;

    await request(app.getHttpServer())
      .post(`/admin/seasons/${state.season.id}/settlement/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    // Stable season: existing settlement row is reused, no new audit log.
    expect(state.finalSettlements.length).toBe(before);
    expect(state.auditLogs.length).toBe(beforeAudits);
  });
});

// ─── Ranking test: ROI% beats absolute wealth ──────────────────────────────

const buildRankingMock = () => {
  const season = {
    id: 'season-rank',
    name: 'FantaTrading Rank',
    footballSeason: '2026/27',
    status: SeasonStatus.COMPLETED as SeasonStatus,
    sellCommissionRate: 0.02,
    buyCommissionRate: 0.02,
    prizeThreshold: 0.07,
  };

  /*
   * Team A — "cheap winner":
   *   totalCapitalDeposited = 153  (paid 150 + 3 buy commission)
   *   position: initialQuote=150 → currentQuote=154 (quote step +4 → value × 1.20 = 180)
   *   netLiq = 180 × 0.98 = 176.4 ; finalLiq = 176.4 ; ROI = (176.4-153)/153 ≈ 15.29 %
   *
   * Team B — "expensive loser":
   *   totalCapitalDeposited = 612  (paid 600 + 12 buy commission)
   *   position: initialQuote=600 → currentQuote=602 (quote step +2 → value × 1.10 = 660)
   *   netLiq = 660 × 0.98 = 646.8 ; finalLiq = 646.8 ; ROI = (646.8-612)/612 ≈ 5.69 %
   *
   * Team B has 3.5× more absolute wealth than Team A, but Team A has a higher
   * ROI%, so the ranking must place A above B.
   */
  const teams = [
    {
      id: 'team-cheap',
      userId: 'user-cheap',
      seasonId: season.id,
      status: TeamStatus.ROSA_ATTIVA,
      initialBudget: 153,
      availableBudget: 0,
      totalCommissionsPaid: 3,
      currentPortfolioValue: 180,
      currentRoi: 0,
      season,
      portfolioPositions: [
        {
          id: 'pos-cheap',
          teamId: 'team-cheap',
          playerId: 'p-cheap',
          quoteId: 'q-cheap',
          initialQuote: 150,
          buyValue: 150,
          buyCommission: 3,
          totalBuyCost: 153,
          fantasyMultiplier: 1,
          currentSellValue: 180,
          status: PositionStatus.ACTIVE,
          quote: { id: 'q-cheap', currentQuote: 154 },
        },
      ],
    },
    {
      id: 'team-rich',
      userId: 'user-rich',
      seasonId: season.id,
      status: TeamStatus.ROSA_ATTIVA,
      initialBudget: 612,
      availableBudget: 0,
      totalCommissionsPaid: 12,
      currentPortfolioValue: 660,
      currentRoi: 0,
      season,
      portfolioPositions: [
        {
          id: 'pos-rich',
          teamId: 'team-rich',
          playerId: 'p-rich',
          quoteId: 'q-rich',
          initialQuote: 600,
          buyValue: 600,
          buyCommission: 12,
          totalBuyCost: 612,
          fantasyMultiplier: 1,
          currentSellValue: 660,
          status: PositionStatus.ACTIVE,
          quote: { id: 'q-rich', currentQuote: 602 },
        },
      ],
    },
  ];

  const finalSettlements: Array<Record<string, unknown>> = [];
  const auditLogs: Array<Record<string, unknown>> = [];

  const prisma = {
    season: {
      findUnique: jest.fn(async ({ where }: any) => (where.id === season.id ? season : null)),
    },
    team: {
      findUnique: jest.fn(async ({ where }: any) => teams.find((t) => t.id === where.id) ?? null),
      findMany: jest.fn(async ({ where }: any) => teams.filter((t) => t.seasonId === where.seasonId)),
    },
    finalSettlement: {
      findFirst: jest.fn(async ({ where }: any) => {
        const rows = finalSettlements.filter((row) => row.teamId === where.teamId);
        return rows[rows.length - 1] ?? null;
      }),
      create: jest.fn(async ({ data }: any) => {
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
      create: jest.fn(async ({ data }: any) => {
        const audit = { id: `audit-${auditLogs.length + 1}`, executedAt: new Date(), ...data };
        auditLogs.push(audit);
        return audit;
      }),
    },
  };

  return { prisma, finalSettlements, auditLogs, season };
};

describe('FAVC ranking: ROI% wins over total wealth', () => {
  let app: INestApplication;
  let adminToken: string;
  let state: ReturnType<typeof buildRankingMock>;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_secret_minimum_32_characters_long';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    state = buildRankingMock();
    const built = await buildApp(state.prisma);
    app = built.app;
    const jwtService = built.moduleFixture.get(JwtService);
    adminToken = jwtService.sign({ sub: 'admin', email: 'admin@favc.local', role: UserRole.ADMIN });
  });

  afterAll(async () => {
    await app.close();
  });

  it('team 150→180 (ROI 15.29%) ranks above team 600→660 (ROI 5.69%) despite lower wealth', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/seasons/${state.season.id}/settlement/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const cheap = res.body.settlements.find((s: any) => s.teamId === 'team-cheap');
    const rich = res.body.settlements.find((s: any) => s.teamId === 'team-rich');

    expect(cheap.activePositionsValue).toBeCloseTo(180);
    expect(rich.activePositionsValue).toBeCloseTo(660);
    expect(cheap.netLiquidationValue).toBeCloseTo(176.4);
    expect(rich.netLiquidationValue).toBeCloseTo(646.8);
    expect(cheap.finalLiquidationValue).toBeCloseTo(176.4);
    expect(rich.finalLiquidationValue).toBeCloseTo(646.8);

    // ROI% comparison: cheap > rich
    expect(cheap.roiPct).toBeGreaterThan(rich.roiPct);
    expect(cheap.roiPct).toBeCloseTo(15.2941176);
    expect(rich.roiPct).toBeCloseTo(5.6862745);

    // Wealth is the opposite of ROI ranking → confirms ranking is not wealth-driven.
    expect(cheap.finalLiquidationValue).toBeLessThan(rich.finalLiquidationValue);

    // Rank by ROI, not by wealth.
    expect(cheap.rankByRoi).toBe(1);
    expect(rich.rankByRoi).toBe(2);

    // FAVC invariants on every settlement row.
    for (const row of res.body.settlements) {
      expect(row.finalLiquidationValue).toBeCloseTo(row.netLiquidationValue + row.virtualCashBalance);
      expect(row.profitLoss).toBeCloseTo(row.finalLiquidationValue - row.totalCapitalDeposited);
      // No double cut on commissions: netLiq = active × (1 - rate).
      expect(row.netLiquidationValue).toBeCloseTo(
        row.activePositionsValue * (1 - row.finalSellCommissionRate),
      );
    }

    // Prize eligibility: only the cheap team clears the 7 % threshold.
    expect(cheap.isPrizeEligible).toBe(true);
    expect(rich.isPrizeEligible).toBe(false);
  });
});
