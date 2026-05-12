import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { ImportStatus, ImportType, PlayerRole, SeasonStatus, UserRole } from '@prisma/client';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PlayersController } from '../players/players.controller';
import { PlayersService } from '../players/players.service';
import { QuotesService } from '../quotes/quotes.service';
import { VotesController } from '../votes/votes.controller';
import { VotesService } from '../votes/votes.service';
import { AdminImportController } from './admin-import.controller';

type StoredPlayer = {
  id: string;
  externalId: string | null;
  firstName: string;
  lastName: string;
  role: PlayerRole;
  realTeam: string;
  isActive: boolean;
};

const createPrismaMock = () => {
  const season = {
    id: 'season-1',
    name: 'FantaTrading 2023/24',
    footballSeason: '2023/24',
    status: SeasonStatus.DRAFT,
  };
  const players: StoredPlayer[] = [
    {
      id: 'player-1',
      externalId: '2792',
      firstName: '',
      lastName: 'Musso',
      role: PlayerRole.GK,
      realTeam: 'Atalanta',
      isActive: true,
    },
    {
      id: 'player-2',
      externalId: '554',
      firstName: '',
      lastName: 'Zappacosta',
      role: PlayerRole.DEF,
      realTeam: 'Atalanta',
      isActive: true,
    },
  ];
  const quotes: Array<Record<string, unknown>> = [];
  const votes: Array<Record<string, unknown>> = [];
  const importLogs: Array<Record<string, unknown>> = [];

  const prisma = {
    season: {
      findUnique: jest.fn(async ({ where }) => (where.id === season.id ? season : null)),
    },
    player: {
      findMany: jest.fn(async ({ where }) =>
        players.filter((player) => {
          if (where?.role && player.role !== where.role) {
            return false;
          }
          if (where?.isActive !== undefined && player.isActive !== where.isActive) {
            return false;
          }
          return true;
        }),
      ),
      findUnique: jest.fn(async ({ where }) => players.find((player) => player.id === where.id) ?? null),
      findFirst: jest.fn(async ({ where }) => players.find((player) => player.externalId === where.externalId) ?? null),
      update: jest.fn(async ({ where, data }) => {
        const player = players.find((item) => item.id === where.id);
        if (!player) {
          return null;
        }
        Object.assign(player, data);
        return player;
      }),
      create: jest.fn(async ({ data }) => {
        const player = { id: `player-${players.length + 1}`, ...data };
        players.push(player);
        return player;
      }),
    },
    quote: {
      findMany: jest.fn(async ({ where }) =>
        quotes.filter((quote) => quote.seasonId === where.seasonId),
      ),
      findUnique: jest.fn(async ({ where }) =>
        quotes.find(
          (quote) =>
            quote.seasonId === where.seasonId_playerId.seasonId &&
            quote.playerId === where.seasonId_playerId.playerId,
        ) ?? null,
      ),
      upsert: jest.fn(async ({ where, update, create }) => {
        const quote = quotes.find(
          (item) =>
            item.seasonId === where.seasonId_playerId.seasonId &&
            item.playerId === where.seasonId_playerId.playerId,
        );
        if (quote) {
          Object.assign(quote, update);
          return quote;
        }
        const next = { id: `quote-${quotes.length + 1}`, ...create };
        quotes.push(next);
        return next;
      }),
    },
    vote: {
      findMany: jest.fn(async ({ where }) =>
        votes.filter(
          (vote) =>
            vote.seasonId === where.seasonId &&
            (where.round === undefined || vote.round === where.round) &&
            (where.playerId === undefined || vote.playerId === where.playerId),
        ),
      ),
      upsert: jest.fn(async ({ where, update, create }) => {
        const vote = votes.find(
          (item) =>
            item.seasonId === where.seasonId_round_playerId.seasonId &&
            item.round === where.seasonId_round_playerId.round &&
            item.playerId === where.seasonId_round_playerId.playerId,
        );
        if (vote) {
          Object.assign(vote, update);
          return vote;
        }
        const next = { id: `vote-${votes.length + 1}`, ...create };
        votes.push(next);
        return next;
      }),
    },
    importLog: {
      create: jest.fn(async ({ data }) => {
        const log = { id: `import-${importLogs.length + 1}`, ...data };
        importLogs.push(log);
        return log;
      }),
    },
  };

  return { prisma, players, quotes, votes, importLogs };
};

describe('Admin import, players and votes', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let participantToken: string;
  let quotesPath: string;
  let votesPath: string;
  let state: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_secret_minimum_32_characters_long';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';

    state = createPrismaMock();
    const tmpDir = join(process.cwd(), 'tmp');
    mkdirSync(tmpDir, { recursive: true });
    quotesPath = join(tmpDir, 'quotes-import-test.json');
    votesPath = join(tmpDir, 'votes-import-test.json');
    writeFileSync(
      quotesPath,
      JSON.stringify({
        rows: [
          {
            season: '2023/24',
            playerId: 2792,
            role: 'P',
            playerName: 'Musso',
            club: 'Atalanta',
            initialQuote: 12,
            currentOrFinalQuote: 10,
          },
          {
            season: '2022/23',
            playerId: 999,
            role: 'A',
            playerName: 'Skip',
            club: 'Skip',
            initialQuote: 1,
            currentOrFinalQuote: 1,
          },
        ],
      }),
    );
    writeFileSync(
      votesPath,
      JSON.stringify({
        rows: [
          {
            season: '2023/24',
            round: 1,
            playerId: '2792',
            playerName: 'Musso',
            club: 'Atalanta',
            role: 'P',
            vote: 6.5,
            fantasyVote: null,
            played: true,
          },
          {
            season: '2023/24',
            round: 2,
            playerId: '554',
            playerName: 'Zappacosta',
            club: 'Atalanta',
            role: 'D',
            vote: 6,
            fantasyVote: null,
            played: true,
          },
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
      controllers: [PlayersController, VotesController, AdminImportController],
      providers: [
        PlayersService,
        QuotesService,
        VotesService,
        JwtStrategy,
        { provide: PrismaService, useValue: state.prisma },
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

    jwtService = moduleFixture.get(JwtService);
    adminToken = jwtService.sign({
      sub: 'admin-1',
      email: 'admin@fantatrading.local',
      role: UserRole.ADMIN,
    });
    participantToken = jwtService.sign({
      sub: 'participant-1',
      email: 'player@fantatrading.local',
      role: UserRole.PARTICIPANT,
    });
  });

  afterEach(async () => {
    await app.close();
    rmSync(quotesPath, { force: true });
    rmSync(votesPath, { force: true });
  });

  it('imports quotes from processed JSON and creates an import log', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/import/quotes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ seasonId: 'season-1', sourcePath: quotesPath })
      .expect(201);

    expect(res.body.recordsRead).toBe(2);
    expect(res.body.recordsImported).toBe(1);
    expect(res.body.recordsSkipped).toBe(1);
    expect(state.quotes).toHaveLength(1);
    expect(state.importLogs[0].type).toBe(ImportType.QUOTES_INITIAL);
    expect(state.importLogs[0].status).toBe(ImportStatus.SUCCESS);
  });

  it('imports votes from processed JSON and lists votes by round', async () => {
    await request(app.getHttpServer())
      .post('/admin/import/votes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ seasonId: 'season-1', round: 1, sourcePath: votesPath })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/votes')
      .query({ seasonId: 'season-1', round: 1 })
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].round).toBe(1);
    expect(list.body[0].vote).toBe(6.5);
    expect(state.importLogs[0].type).toBe(ImportType.VOTES);
  });

  it('lists players and filters players by role', async () => {
    const allPlayers = await request(app.getHttpServer())
      .get('/players')
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(200);
    expect(allPlayers.body).toHaveLength(2);

    const goalkeepers = await request(app.getHttpServer())
      .get('/players')
      .query({ role: PlayerRole.GK })
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(200);
    expect(goalkeepers.body).toHaveLength(1);
    expect(goalkeepers.body[0].role).toBe(PlayerRole.GK);
  });

  it('protects admin import endpoint from participants', async () => {
    await request(app.getHttpServer())
      .post('/admin/import/quotes')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ seasonId: 'season-1', sourcePath: quotesPath })
      .expect(403);
  });
});
