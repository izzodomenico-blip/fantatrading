import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ImportPlayersDto } from './dto/import-players.dto';
import { ListPlayersDto } from './dto/list-players.dto';
import { PlayersService } from './players.service';

@ApiTags('players')
@ApiBearerAuth()
@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @ApiOperation({ summary: 'List players with filters' })
  list(@Query() query: ListPlayersDto) {
    return this.playersService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get player by id' })
  getById(@Param('id') id: string) {
    return this.playersService.getById(id);
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upsert/import players batch (admin only)' })
  importBatch(@Body() dto: ImportPlayersDto) {
    return this.playersService.importBatch(dto.players);
  }
}
