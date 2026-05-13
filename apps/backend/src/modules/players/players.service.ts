import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PlayerRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_SYNTHETIC_ROUND_QUOTES_PATH,
  loadProcessedJson,
} from '../data-import/processed-data';
import { ImportPlayerItemDto } from './dto/import-players.dto';
import { ListPlayersDto } from './dto/list-players.dto';

type SyntheticRoundQuoteRow = {
  season?: string;
  round: number;
  playerId: number | string;
  playerName: string;
  initialQuote: number;
  qa?: number;
  qaa?: number;
  vote?: number | null;
  fantasyVote?: number | null;
};

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: ListPlayersDto) {
    const where: Prisma.PlayerWhereInput = {
      isActive: true,
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.club ? { realTeam: { equals: filters.club, mode: 'insensitive' } } : {}),
      ...(filters.search
        ? {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filters.seasonId ? { quotes: { some: { seasonId: filters.seasonId } } } : {}),
    };

    return this.prisma.player.findMany({
      where,
      include: filters.seasonId ? { quotes: { where: { seasonId: filters.seasonId } } } : undefined,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getById(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: { quotes: true, votes: true },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player;
  }

  async getTrend(id: string, seasonId?: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: { quotes: seasonId ? { where: { seasonId } } : true },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const season = seasonId
      ? await this.prisma.season.findUnique({ where: { id: seasonId } })
      : null;
    const quote = player.quotes[0];
    if (!quote) {
      return this.syntheticTrend(player, {
        footballSeason: season?.footballSeason,
        initialQuote: 1,
        currentQuote: 1,
      });
    }

    const history = await this.prisma.quoteHistory.findMany({
      where: {
        playerId: id,
        ...(seasonId ? { seasonId } : {}),
      },
      orderBy: [{ round: 'asc' }, { changedAt: 'asc' }],
    });

    if (history.length > 0) {
      const votes = await this.prisma.vote.findMany({
        where: {
          playerId: id,
          ...(seasonId ? { seasonId } : {}),
        },
        orderBy: { round: 'asc' },
      });
      const votesByRound = new Map(votes.map((vote) => [vote.round, vote]));
      const initialQuote = toNumber(quote.initialQuote);

      return history.map((item, index) => {
        const round = item.round ?? index + 1;
        const vote = votesByRound.get(round);
        const currentQuote = toNumber(item.newQuote);
        const previousQuote = toNumber(item.oldQuote);
        return {
          round,
          quote: currentQuote,
          quoteChange: currentQuote - previousQuote,
          fantaTradingReturnPct: fantaTradingReturnPct(initialQuote, currentQuote),
          estimatedValue: estimatedValue(initialQuote, currentQuote),
          vote: vote ? toNumberOrNull(vote.vote) : null,
          fantasyBonusPct: vote ? fantasyBonusPct(vote.vote, vote.fantasyVote) : 0,
          source: 'official' as const,
        };
      });
    }

    return this.syntheticTrend(player, {
      footballSeason: season?.footballSeason,
      initialQuote: toNumber(quote.initialQuote),
      currentQuote: toNumber(quote.currentQuote),
    });
  }

  async upsertByExternalId(input: ImportPlayerItemDto) {
    const existing = await this.prisma.player.findFirst({
      where: { externalId: input.externalId },
    });

    if (existing) {
      return this.prisma.player.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          realTeam: input.realTeam,
          isActive: input.isActive ?? true,
        },
      });
    }

    return this.prisma.player.create({
      data: {
        externalId: input.externalId,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        realTeam: input.realTeam,
        isActive: input.isActive ?? true,
      },
    });
  }

  async importBatch(players: ImportPlayerItemDto[]) {
    const result = {
      read: players.length,
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; message: string }>,
    };

    for (const [index, player] of players.entries()) {
      try {
        await this.upsertByExternalId(player);
        result.imported += 1;
      } catch (error) {
        result.skipped += 1;
        result.errors.push({
          row: index + 1,
          message: error instanceof Error ? error.message : 'Unknown player import error',
        });
      }
    }

    return result;
  }

  validateRole(role: PlayerRole, expectedRole: PlayerRole) {
    return role === expectedRole;
  }

  private syntheticTrend(
    player: { externalId: string | null; firstName: string; lastName: string },
    fallback: { footballSeason?: string; initialQuote: number; currentQuote: number },
  ) {
    const file = loadProcessedJson<SyntheticRoundQuoteRow>(DEFAULT_SYNTHETIC_ROUND_QUOTES_PATH);
    const playerName = [player.firstName, player.lastName].filter(Boolean).join(' ').trim();
    const matchedRows = file.rows
      .filter((row) => {
        if (fallback.footballSeason && row.season !== fallback.footballSeason) return false;
        if (player.externalId && String(row.playerId) === player.externalId) return true;
        return row.playerName.toLowerCase() === playerName.toLowerCase();
      })
      .sort((a, b) => a.round - b.round);

    if (matchedRows.length > 0) {
      let previousQuote = fallback.initialQuote;
      return matchedRows.map((row, index) => {
        const initialQuote = row.initialQuote || fallback.initialQuote;
        const currentQuote = toNumber(row.qaa ?? row.qa ?? fallback.currentQuote);
        const quoteChange = index === 0 ? currentQuote - initialQuote : currentQuote - previousQuote;
        previousQuote = currentQuote;
        return {
          round: row.round,
          quote: currentQuote,
          quoteChange,
          fantaTradingReturnPct: fantaTradingReturnPct(initialQuote, currentQuote),
          estimatedValue: estimatedValue(initialQuote, currentQuote),
          vote: row.vote ?? row.fantasyVote ?? null,
          fantasyBonusPct: row.vote && row.fantasyVote ? (row.fantasyVote - row.vote) * 2 : 0,
          source: 'synthetic' as const,
        };
      });
    }

    return Array.from({ length: 8 }, (_, index) => {
      const progress = index / 7;
      const wave = Math.sin(index * 1.3) * 0.35;
      const currentQuote = Number((fallback.initialQuote + (fallback.currentQuote - fallback.initialQuote) * progress + wave).toFixed(2));
      const previousProgress = Math.max(0, (index - 1) / 7);
      const previousQuote = index === 0
        ? fallback.initialQuote
        : fallback.initialQuote + (fallback.currentQuote - fallback.initialQuote) * previousProgress + Math.sin((index - 1) * 1.3) * 0.35;

      return {
        round: index + 1,
        quote: currentQuote,
        quoteChange: Number((currentQuote - previousQuote).toFixed(2)),
        fantaTradingReturnPct: fantaTradingReturnPct(fallback.initialQuote, currentQuote),
        estimatedValue: estimatedValue(fallback.initialQuote, currentQuote),
        vote: null,
        fantasyBonusPct: 0,
        source: 'mock' as const,
      };
    });
  }
}

function fantaTradingReturnPct(initialQuote: number, currentQuote: number) {
  return (currentQuote - initialQuote) * 5;
}

function estimatedValue(initialQuote: number, currentQuote: number, fantasyMultiplier = 1) {
  return Math.max(0, initialQuote * fantasyMultiplier * (1 + fantaTradingReturnPct(initialQuote, currentQuote) / 100));
}

function fantasyBonusPct(vote: Prisma.Decimal | number | null, fantasyVote: Prisma.Decimal | number | null) {
  if (vote === null || fantasyVote === null) return 0;
  return (toNumber(fantasyVote) - toNumber(vote)) * 2;
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function toNumberOrNull(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}
