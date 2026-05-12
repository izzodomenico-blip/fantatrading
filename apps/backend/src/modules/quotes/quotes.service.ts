import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ImportStatus, ImportType, PlayerRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_QUOTES_PATH,
  ProcessedQuoteRow,
  loadProcessedJson,
  mapProcessedRole,
  splitPlayerName,
} from '../data-import/processed-data';
import { PlayersService } from '../players/players.service';
import { ListQuotesDto } from './dto/list-quotes.dto';

type ImportContext = {
  seasonId: string;
  sourcePath?: string;
  executedById: string;
};

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService,
  ) {}

  list(filters: ListQuotesDto) {
    return this.prisma.quote.findMany({
      where: {
        seasonId: filters.seasonId,
        ...(filters.role || filters.club
          ? {
              player: {
                ...(filters.role ? { role: filters.role } : {}),
                ...(filters.club ? { realTeam: { equals: filters.club, mode: 'insensitive' } } : {}),
              },
            }
          : {}),
      },
      include: { player: true },
      orderBy: [{ player: { lastName: 'asc' } }, { player: { firstName: 'asc' } }],
    });
  }

  async getBySeasonAndPlayer(seasonId: string, playerId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { seasonId_playerId: { seasonId, playerId } },
      include: { player: true },
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    return quote;
  }

  async importFromProcessedJson(context: ImportContext) {
    const sourcePath = context.sourcePath ?? DEFAULT_QUOTES_PATH;
    const season = await this.prisma.season.findUnique({ where: { id: context.seasonId } });
    if (!season) {
      throw new NotFoundException('Season not found');
    }

    const file = loadProcessedJson<ProcessedQuoteRow>(sourcePath);
    const result = {
      recordsRead: file.rows.length,
      recordsImported: 0,
      recordsSkipped: 0,
      errors: [] as Array<{ row: number; message: string }>,
      warnings: [] as string[],
      importLogId: undefined as string | undefined,
    };

    for (const [index, row] of file.rows.entries()) {
      if (row.season !== season.footballSeason) {
        result.recordsSkipped += 1;
        continue;
      }

      const validationError = this.validateQuoteRow(row);
      if (validationError) {
        result.recordsSkipped += 1;
        result.errors.push({ row: index + 1, message: validationError });
        continue;
      }

      const role = mapProcessedRole(row.role) as PlayerRole;
      const { firstName, lastName } = splitPlayerName(row.playerName);
      const player = await this.playersService.upsertByExternalId({
        externalId: String(row.playerId),
        firstName,
        lastName,
        role,
        realTeam: row.club,
        isActive: true,
      });

      if (!this.playersService.validateRole(player.role, role)) {
        result.recordsSkipped += 1;
        result.errors.push({ row: index + 1, message: 'Player role mismatch' });
        continue;
      }

      await this.prisma.quote.upsert({
        where: { seasonId_playerId: { seasonId: context.seasonId, playerId: player.id } },
        update: {
          initialQuote: row.initialQuote,
          currentQuote: row.currentOrFinalQuote,
          finalQuote: row.currentOrFinalQuote,
        },
        create: {
          seasonId: context.seasonId,
          playerId: player.id,
          initialQuote: row.initialQuote,
          currentQuote: row.currentOrFinalQuote,
          finalQuote: row.currentOrFinalQuote,
        },
      });
      result.recordsImported += 1;
    }

    if (!result.recordsImported) {
      result.warnings.push(`No quote rows matched footballSeason ${season.footballSeason}`);
    }

    const importLog = await this.prisma.importLog.create({
      data: {
        seasonId: context.seasonId,
        type: ImportType.QUOTES_INITIAL,
        status: result.errors.length ? ImportStatus.PARTIAL : ImportStatus.SUCCESS,
        originalFilename: sourcePath.split('/').pop() ?? sourcePath,
        storagePath: sourcePath,
        rowsTotal: result.recordsRead,
        rowsImported: result.recordsImported,
        rowsError: result.errors.length,
        errorDetail: { errors: result.errors, warnings: result.warnings },
        executedById: context.executedById,
      },
    });
    result.importLogId = importLog.id;

    return result;
  }

  private validateQuoteRow(row: ProcessedQuoteRow) {
    if (row.playerId === undefined || row.playerId === null || String(row.playerId).trim() === '') {
      return 'Missing playerId';
    }
    if (!row.season) {
      return 'Missing season';
    }
    if (!mapProcessedRole(row.role)) {
      return 'Invalid role';
    }
    if (typeof row.initialQuote !== 'number' || row.initialQuote <= 0) {
      return 'Invalid initialQuote';
    }
    if (typeof row.currentOrFinalQuote !== 'number' || row.currentOrFinalQuote < 0) {
      return 'Invalid currentOrFinalQuote';
    }
    if (!row.playerName || !row.club) {
      return 'Missing playerName or club';
    }
    return null;
  }
}
