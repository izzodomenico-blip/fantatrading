import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BuyPlayerDto } from './dto/buy-player.dto';
import { ListMarketOperationsDto } from './dto/list-market-operations.dto';
import { SellPlayerDto } from './dto/sell-player.dto';
import { MarketService } from './market.service';

type AuthUser = { userId: string; email: string; role: UserRole };

@ApiTags('market')
@ApiBearerAuth()
@Controller('market')
@UseGuards(JwtAuthGuard)
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post('buy')
  @ApiOperation({ summary: 'Buy player for my team' })
  buy(@Body() dto: BuyPlayerDto, @CurrentUser() user: AuthUser) {
    return this.marketService.buyPlayer(user, dto);
  }

  @Post('sell')
  @ApiOperation({ summary: 'Sell active player position from my team' })
  sell(@Body() dto: SellPlayerDto, @CurrentUser() user: AuthUser) {
    return this.marketService.sellPlayer(user, dto);
  }

  @Get('operations')
  @ApiOperation({ summary: 'List market operations for a team' })
  listOperations(@Query() query: ListMarketOperationsDto, @CurrentUser() user: AuthUser) {
    return this.marketService.listOperations(user, query.teamId);
  }
}
