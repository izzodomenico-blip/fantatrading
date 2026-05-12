import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NoVotePolicy, SeasonStatus } from '@prisma/client';

export class CreateSeasonDto {
  @ApiProperty({ example: 'FantaTrading 2026/27' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2026/27' })
  @IsString()
  footballSeason: string;

  @ApiPropertyOptional({ enum: SeasonStatus, default: SeasonStatus.DRAFT })
  @IsOptional()
  @IsEnum(SeasonStatus)
  status?: SeasonStatus;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  registrationOpenAt: Date;

  @ApiProperty({ example: '2026-08-15T23:59:59.000Z' })
  @Type(() => Date)
  @IsDate()
  registrationCloseAt: Date;

  @ApiProperty({ example: '2026-08-20T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ example: '2027-05-31T23:59:59.000Z' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiProperty({ example: 38 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalRounds: number;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialBudget: number;

  @ApiPropertyOptional({ example: 0.02 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  buyCommissionRate?: number;

  @ApiPropertyOptional({ example: 0.02 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellCommissionRate?: number;

  @ApiPropertyOptional({ example: 0.1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  platformFeeRate?: number;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  survivalThreshold?: number;

  @ApiPropertyOptional({ example: 0.07 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  prizeThreshold?: number;

  @ApiPropertyOptional({ enum: NoVotePolicy })
  @IsOptional()
  @IsEnum(NoVotePolicy)
  noVotePolicy?: NoVotePolicy;
}
