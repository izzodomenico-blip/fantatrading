import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListVotesDto } from './dto/list-votes.dto';
import { VotesService } from './votes.service';

@ApiTags('votes')
@ApiBearerAuth()
@Controller('votes')
@UseGuards(JwtAuthGuard)
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Get()
  @ApiOperation({ summary: 'List votes by season and optional round' })
  list(@Query() query: ListVotesDto) {
    return this.votesService.list(query);
  }

  @Get('player/:playerId')
  @ApiOperation({ summary: 'List votes by player' })
  listByPlayer(@Param('playerId') playerId: string, @Query('seasonId') seasonId?: string) {
    return this.votesService.listByPlayer(playerId, seasonId);
  }
}
