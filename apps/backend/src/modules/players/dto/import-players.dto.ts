import { ApiProperty } from '@nestjs/swagger';
import { PlayerRole } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportPlayerItemDto {
  @ApiProperty({ example: '2792' })
  @IsString()
  externalId: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Musso' })
  @IsString()
  lastName: string;

  @ApiProperty({ enum: PlayerRole })
  @IsEnum(PlayerRole)
  role: PlayerRole;

  @ApiProperty({ example: 'Atalanta' })
  @IsString()
  realTeam: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ImportPlayersDto {
  @ApiProperty({ type: [ImportPlayerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPlayerItemDto)
  players: ImportPlayerItemDto[];
}
