import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQuotesDto } from './dto/list-quotes.dto';
import { QuotesService } from './quotes.service';

@ApiTags('quotes')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'List quotes by season' })
  list(@Query() query: ListQuotesDto) {
    return this.quotesService.list(query);
  }

  @Get(':seasonId/:playerId')
  @ApiOperation({ summary: 'Get quote by season and player' })
  getBySeasonAndPlayer(@Param('seasonId') seasonId: string, @Param('playerId') playerId: string) {
    return this.quotesService.getBySeasonAndPlayer(seasonId, playerId);
  }
}
