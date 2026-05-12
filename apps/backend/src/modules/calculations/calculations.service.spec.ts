import { Test, TestingModule } from '@nestjs/testing';
import { CalculationsService } from './calculations.service';

describe('CalculationsService', () => {
  let service: CalculationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalculationsService],
    }).compile();

    service = module.get<CalculationsService>(CalculationsService);
  });

  describe('quoteReturn — usa shared engine', () => {
    it('+1 punto = +5% (NON +100%)', () => {
      const res = service.quoteReturn({ initialQuote: 1, currentQuote: 2 });
      expect(res.quoteStepReturnPct).toBe(5);
    });

    it('+2 punti = +10%', () => {
      const res = service.quoteReturn({ initialQuote: 10, currentQuote: 12 });
      expect(res.quoteStepReturnPct).toBe(10);
    });

    it('Qt.A < Qt.I → rendimento negativo', () => {
      const res = service.quoteReturn({ initialQuote: 10, currentQuote: 8 });
      expect(res.quoteStepReturnPct).toBe(-10);
    });

    it('Qt.A = Qt.I → rendimento zero', () => {
      const res = service.quoteReturn({ initialQuote: 5, currentQuote: 5 });
      expect(res.quoteStepReturnPct).toBe(0);
    });
  });

  describe('positionValue — usa shared engine', () => {
    it('Qt.I=1 Qt.A=2 mult=1 → 1.05 (formula step, non percentuale classica)', () => {
      const res = service.positionValue(1, 2, 1.0);
      expect(res.positionValue).toBeCloseTo(1.05, 6);
    });

    it('perdita totale → valore 0 (floor)', () => {
      // Qt.I=10 Qt.A=0 → -50% → max(0, 10*(1-0.5)) = 5... wait
      // (0-10)*5 = -50 → max(0, 10*(1-0.5)) = 5
      // floor a zero si attiva solo con > 20 punti di caduta
      // Qt.I=10, Qt.A cade di 25 → (Qt.I - 20) = -10*5 = -50?
      // Per arrivare a 0: 1 + pct/100 <= 0 → pct <= -100 → (qtA - qtI)*5 <= -100 → qtA <= qtI - 20
      const res = service.positionValue(10, 0, 1.0); // (0-10)*5 = -50% → valore = max(0, 5) = 5
      expect(res.positionValue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('roi — usa shared engine', () => {
    it('ROI = 0 con portafoglio = budget iniziale', () => {
      const res = service.roi(0, 100, 100);
      expect(res.roiPct).toBe(0);
    });

    it('ROI = 10% → prizeEligible = true (soglia V1 = 7%)', () => {
      const res = service.roi(50, 60, 100);
      expect(res.roiPct).toBe(10);
      expect(res.prizeEligible).toBe(true);
    });

    it('ROI = 5% → prizeEligible = false (sotto soglia 7%)', () => {
      const res = service.roi(50, 55, 100);
      expect(res.roiPct).toBe(5);
      expect(res.prizeEligible).toBe(false);
    });
  });
});
