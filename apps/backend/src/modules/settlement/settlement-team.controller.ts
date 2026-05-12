import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettlementService } from './settlement.service';

type AuthUser = { userId: string; email: string; role: UserRole };

@ApiTags('team-settlement')
@ApiBearerAuth()
@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamSettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get(':id/final-settlement')
  @ApiOperation({ summary: 'Get final settlement for a team' })
  getFinalSettlement(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.settlementService.getTeamFinalSettlement(id, user);
  }
}
