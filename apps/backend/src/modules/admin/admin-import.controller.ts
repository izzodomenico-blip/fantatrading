import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ImportQuotesDto } from '../quotes/dto/import-quotes.dto';
import { QuotesService } from '../quotes/quotes.service';
import { ImportVotesDto } from '../votes/dto/import-votes.dto';
import { VotesService } from '../votes/votes.service';

type AuthUser = { userId: string; email: string; role: UserRole };

@ApiTags('admin-import')
@ApiBearerAuth()
@Controller('admin/import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminImportController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly votesService: VotesService,
  ) {}

  @Post('quotes')
  @ApiOperation({ summary: 'Import quotes from processed JSON (admin only)' })
  importQuotes(@Body() dto: ImportQuotesDto, @CurrentUser() user: AuthUser) {
    return this.quotesService.importFromProcessedJson({
      seasonId: dto.seasonId,
      sourcePath: dto.sourcePath,
      executedById: user.userId,
    });
  }

  @Post('votes')
  @ApiOperation({ summary: 'Import votes from processed JSON (admin only)' })
  importVotes(@Body() dto: ImportVotesDto, @CurrentUser() user: AuthUser) {
    return this.votesService.importFromProcessedJson({
      seasonId: dto.seasonId,
      round: dto.round,
      sourcePath: dto.sourcePath,
      executedById: user.userId,
    });
  }
}
