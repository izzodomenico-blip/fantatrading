import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PlayerRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportPlayerItemDto } from './dto/import-players.dto';
import { ListPlayersDto } from './dto/list-players.dto';

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
}
