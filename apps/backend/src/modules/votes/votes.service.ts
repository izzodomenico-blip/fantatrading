import { Injectable, NotFoundException } from '@nestjs/common';
import { ImportStatus, ImportType, PlayerRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_VOTES_PATH,
  ProcessedVoteRow,
  loadProcessedJson,
  mapProcessedRole,
  splitPlayerName,
} from '../data-import/processed-data';
import { PlayersService } from '../players/players.service';
import { ListVotesDto } from './dto/list-votes.dto';

type ImportContext = {
  seasonId: string;
  round?: number;
  sourcePath?: string;
  executedById: string;
};

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService,
  ) {}

  list(filters: ListVotesDto) {
    return this.prisma.vote.findMany({
      where: {
        seasonId: filters.seasonId,
        ...(filters.round ? { round: filters.round } : {}),
      },
      include: { player: true },
      orderBy: [{ round: 'asc' }, { player: { lastName: 'asc' } }, { player: { firstName: 'asc' } }],
    });
  }

  listByPlayer(playerId: string, seasonId?: string) {
    return this.prisma.vote.findMany({
      where: {
        playerId,
        ...(seasonId ? { seasonId } : {}),
      },
      include: { player: true },
      orderBy: [{ round: 'asc' }],
    });
  }

  async importFromProcessedJson(context: ImportContext) {
    const sourcePath = context.sourcePath ?? DEFAULT_VOTES_PATH;
    const season = await this.prisma.season.findUnique({ where: { id: context.seasonId } });
    if (!season) {
      throw new NotFoundException('Season not found');
    }

    const file = loadProcessedJson<ProcessedVoteRow>(sourcePath);
    const result = {
      recordsRead: file.rows.length,
      recordsImported: 0,
      recordsSkipped: 0,
      errors: [] as Array<{ row: number; message: string }>,
      warnings: [] as string[],
      importLogId: undefined as string | undefined,
    };

    for (const [index, row] of file.rows.entries()) {
      if (row.season !== season.footballSeason || (context.round && row.round !== context.round)) {
        result.recordsSkipped += 1;
        continue;
      }

      const validationError = this.validateVoteRow(row);
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

      await this.prisma.vote.upsert({
        where: {
          seasonId_round_playerId: {
            seasonId: context.seasonId,
            round: row.round,
            playerId: player.id,
          },
        },
        update: {
          vote: row.vote,
          fantasyVote: row.fantasyVote,
          played: row.played,
          isDerived: false,
        },
        create: {
          seasonId: context.seasonId,
          round: row.round,
          playerId: player.id,
          vote: row.vote,
          fantasyVote: row.fantasyVote,
          played: row.played,
          isDerived: false,
        },
      });
      result.recordsImported += 1;
    }

    if (!result.recordsImported) {
      result.warnings.push(
        `No vote rows matched footballSeason ${season.footballSeason}${context.round ? ` round ${context.round}` : ''}`,
      );
    }

    const importLog = await this.prisma.importLog.create({
      data: {
        seasonId: context.seasonId,
        type: ImportType.VOTES,
        round: context.round,
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

  private validateVoteRow(row: ProcessedVoteRow) {
    if (!row.season) {
      return 'Missing season';
    }
    if (!Number.isInteger(row.round) || row.round <= 0) {
      return 'Invalid round';
    }
    if (row.playerId === undefined || row.playerId === null || String(row.playerId).trim() === '') {
      return 'Missing playerId';
    }
    if (!mapProcessedRole(row.role)) {
      return 'Invalid role';
    }
    if (typeof row.played !== 'boolean') {
      return 'Invalid played flag';
    }
    if (row.played && (typeof row.vote !== 'number' || row.vote < 0 || row.vote > 10)) {
      return 'Invalid vote';
    }
    if (!row.played && row.vote !== null) {
      return 'Non-played row must have null vote';
    }
    return null;
  }
}
