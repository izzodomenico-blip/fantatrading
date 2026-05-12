import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuoteReturnRequestDto {
  @ApiProperty({ example: 10, description: 'Quotazione iniziale (Qt.I)' })
  @IsNumber()
  @Min(0.01)
  initialQuote: number;

  @ApiProperty({ example: 12, description: 'Quotazione attuale (Qt.A)' })
  @IsNumber()
  @Min(0)
  currentQuote: number;
}

export class QuoteReturnResponseDto {
  initialQuote: number;
  currentQuote: number;
  quoteStepReturnPct: number;
  description: string;
}
