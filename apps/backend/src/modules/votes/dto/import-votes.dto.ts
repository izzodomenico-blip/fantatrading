import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ImportVotesDto {
  @ApiProperty()
  @IsString()
  seasonId: string;

  @ApiPropertyOptional({ description: 'If set, imports only one round' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  round?: number;

  @ApiPropertyOptional({ default: 'data/real/processed/votes/fantacalcio_votes_history.json' })
  @IsOptional()
  @IsString()
  sourcePath?: string;
}
