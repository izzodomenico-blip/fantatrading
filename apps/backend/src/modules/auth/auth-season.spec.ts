import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { NoVotePolicy, SeasonStatus, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { SeasonsController } from '../seasons/seasons.controller';
import { SeasonsService } from '../seasons/seasons.service';

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

const safeUser = (user: StoredUser) => {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
};

const createPrismaMock = () => {
  const users: StoredUser[] = [];
  const seasons: StoredSeason[] = [];

  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where, select }) => {
        const user = users.find((item) => item.id === where.id || item.email === where.email) ?? null;
        if (!user) {
          return null;
        }
        return select ? safeUser(user) : user;
      }),
      create: jest.fn(async ({ data, select }) => {
        const now = new Date();
        const user: StoredUser = {
          id: `user-${users.length + 1}`,
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
        return select ? safeUser(user) : user;
      }),
    },
    season: {
      create: jest.fn(async ({ data }) => {
        const now = new Date();
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
      findMany: jest.fn(async () =>
        [...seasons].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      ),
      findUnique: jest.fn(async ({ where }) => seasons.find((season) => season.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }) => {
        const season = seasons.find((item) => item.id === where.id);
        if (!season) {
          return null;
        }
        Object.assign(season, data, { updatedAt: new Date() });
        return season;
      }),
    },
  };

  return { prisma, users };
};

describe('Auth, users and seasons', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_secret_minimum_32_characters_long';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';

    const { prisma, users } = createPrismaMock();
    const now = new Date();
    users.push({
      id: 'admin-1',
      email: 'admin@fantatrading.local',
      passwordHash: await bcrypt.hash('AdminPassword1!', 12),
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        PassportModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController, UsersController, SeasonsController],
      providers: [
        AuthService,
        UsersService,
        SeasonsService,
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const login = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@fantatrading.local',
      password: 'AdminPassword1!',
    });
    adminToken = login.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers, logs in and returns me', async () => {
    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'player@fantatrading.local',
        password: 'PlayerPassword1!',
        firstName: 'Player',
        lastName: 'One',
      })
      .expect(201);

    expect(register.body.accessToken).toBeDefined();
    expect(register.body.user.role).toBe(UserRole.PARTICIPANT);
    expect(register.body.user.passwordHash).toBeUndefined();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'player@fantatrading.local',
        password: 'PlayerPassword1!',
      })
      .expect(201);

    expect(login.body.accessToken).toBeDefined();

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body.email).toBe('player@fantatrading.local');
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('creates, lists and updates a season status as admin', async () => {
    const create = await request(app.getHttpServer())
      .post('/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'FantaTrading 2026/27',
        footballSeason: '2026/27',
        registrationOpenAt: '2026-07-01T00:00:00.000Z',
        registrationCloseAt: '2026-08-15T23:59:59.000Z',
        startDate: '2026-08-20T00:00:00.000Z',
        endDate: '2027-05-31T23:59:59.000Z',
        totalRounds: 38,
        initialBudget: 500,
      })
      .expect(201);

    expect(create.body.id).toBeDefined();
    expect(create.body.status).toBe(SeasonStatus.DRAFT);

    const list = await request(app.getHttpServer())
      .get('/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(list.body).toHaveLength(1);

    const update = await request(app.getHttpServer())
      .patch(`/seasons/${create.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: SeasonStatus.OPEN })
      .expect(200);

    expect(update.body.status).toBe(SeasonStatus.OPEN);
  });
});
