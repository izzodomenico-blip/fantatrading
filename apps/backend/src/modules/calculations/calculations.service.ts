import { Injectable } from '@nestjs/common';
import {
  calculateQuoteStepReturn,
  calculatePositionValue,
  calculateROI,
  calculatePrizeEligibility,
  V1_PRIZE_THRESHOLD,
} from '@shared';
import { QuoteReturnRequestDto, QuoteReturnResponseDto } from './dto/quote-return.dto';

@Injectable()
export class CalculationsService {
  quoteReturn(dto: QuoteReturnRequestDto): QuoteReturnResponseDto {
    const pct = calculateQuoteStepReturn(dto.initialQuote, dto.currentQuote);
    return {
      initialQuote: dto.initialQuote,
      currentQuote: dto.currentQuote,
      quoteStepReturnPct: pct,
      description: `Ogni punto di differenza vale +5%. Qt.I=${dto.initialQuote} Qt.A=${dto.currentQuote} → ${pct >= 0 ? '+' : ''}${pct}%`,
    };
  }

  positionValue(initialQuote: number, currentQuote: number, fantasyMultiplier: number) {
    const value = calculatePositionValue(initialQuote, currentQuote, fantasyMultiplier);
    return { initialQuote, currentQuote, fantasyMultiplier, positionValue: value };
  }

  roi(portfolioValue: number, availableBudget: number, initialBudget: number) {
    const roiPct = calculateROI(portfolioValue, availableBudget, initialBudget);
    return {
      portfolioValue,
      availableBudget,
      initialBudget,
      roiPct,
      prizeEligible: calculatePrizeEligibility(roiPct, V1_PRIZE_THRESHOLD),
    };
  }
}
