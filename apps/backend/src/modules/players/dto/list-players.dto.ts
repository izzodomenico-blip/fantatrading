import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlayerRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListPlayersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiPropertyOptional({ enum: PlayerRole })
  @IsOptional()
  @IsEnum(PlayerRole)
  role?: PlayerRole;

  @ApiPropertyOptional({ description: 'Real club/team filter' })
  @IsOptional()
  @IsString()
  club?: string;

  @ApiPropertyOptional({ description: 'Search in first or last name' })
  @IsOptional()
  @IsString()
  search?: string;
}
