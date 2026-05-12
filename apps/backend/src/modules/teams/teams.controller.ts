import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamsService } from './teams.service';

type AuthUser = { userId: string; email: string; role: UserRole };

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create my team for a season' })
  create(@Body() dto: CreateTeamDto, @CurrentUser() user: AuthUser) {
    return this.teamsService.createTeam(user, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my teams' })
  listMyTeams(@CurrentUser() user: AuthUser) {
    return this.teamsService.listMyTeams(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get my team detail, or any team as admin' })
  getTeam(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.getTeam(id, user);
  }

  @Get(':id/portfolio')
  @ApiOperation({ summary: 'Get team portfolio summary' })
  getPortfolio(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.getPortfolio(id, user);
  }
}
