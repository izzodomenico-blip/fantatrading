import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalculationsService } from './calculations.service';
import { QuoteReturnRequestDto } from './dto/quote-return.dto';

@ApiTags('calculations')
@Controller('calculations')
export class CalculationsController {
  constructor(private readonly calculationsService: CalculationsService) {}

  @Post('quote-return')
  @ApiOperation({
    summary: 'Calcola rendimento da variazione quotazione',
    description:
      'Formula FantaTrading: ogni punto di differenza Qt.A−Qt.I vale +5% di rendimento (non percentuale classica)',
  })
  quoteReturn(@Body() dto: QuoteReturnRequestDto) {
    return this.calculationsService.quoteReturn(dto);
  }
}
