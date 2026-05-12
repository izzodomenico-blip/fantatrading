import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SettlementService } from './settlement.service';

type AuthUser = { userId: string; email: string; role: UserRole };

@ApiTags('admin-settlement')
@ApiBearerAuth()
@Controller('admin/seasons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminSettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post(':seasonId/settlement/calculate')
  @ApiOperation({ summary: 'Calculate final settlements for a season' })
  calculate(@Param('seasonId') seasonId: string, @CurrentUser() user: AuthUser) {
    return this.settlementService.calculateSeasonSettlement(seasonId, user);
  }
}
