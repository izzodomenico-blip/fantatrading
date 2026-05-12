import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ImportQuotesDto {
  @ApiProperty()
  @IsString()
  seasonId: string;

  @ApiPropertyOptional({ default: 'data/real/processed/fantacalcio_quotes_history.json' })
  @IsOptional()
  @IsString()
  sourcePath?: string;
}
