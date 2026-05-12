import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlayerRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListQuotesDto {
  @ApiProperty()
  @IsString()
  seasonId: string;

  @ApiPropertyOptional({ enum: PlayerRole })
  @IsOptional()
  @IsEnum(PlayerRole)
  role?: PlayerRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  club?: string;
}
