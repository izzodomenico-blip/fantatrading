import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonStatusDto } from './dto/update-season-status.dto';
import { SeasonsService } from './seasons.service';

type AuthUser = { userId: string; email: string; role: UserRole };

@ApiTags('seasons')
@ApiBearerAuth()
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create season (admin only)' })
  create(@Body() dto: CreateSeasonDto, @CurrentUser() user: AuthUser) {
    return this.seasonsService.create(dto, user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List seasons' })
  list() {
    return this.seasonsService.list();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get season by id' })
  getById(@Param('id') id: string) {
    return this.seasonsService.getById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update season status (admin only)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSeasonStatusDto) {
    return this.seasonsService.updateStatus(id, dto.status);
  }
}
