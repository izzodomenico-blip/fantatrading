import {
  calculateEstimatedPositionValue,
  calculateFantaTradingReturnPct,
  createMockTrend,
  getTrendTone,
  normalizeSyntheticTrend,
} from '../../app/web/src/utils/playerTrend';

describe('playerTrend web utilities', () => {
  it('applies the FAVC quote rule: +1 quote = +5%', () => {
    expect(calculateFantaTradingReturnPct(10, 11)).toBe(5);
    expect(calculateFantaTradingReturnPct(10, 9)).toBe(-5);
    expect(calculateEstimatedPositionValue(10, 11, 1)).toBe(10.5);
  });

  it('normalizes synthetic round-by-round rows into chart points', () => {
    const trend = normalizeSyntheticTrend(
      [
        { round: 2, playerId: 'p1', playerName: 'Demo Player', club: 'Inter', role: 'A', initialQuote: 10, qaa: 11, vote: 7, fantasyVote: 8 },
        { round: 1, playerId: 'p1', playerName: 'Demo Player', club: 'Inter', role: 'A', initialQuote: 10, qaa: 10, vote: 6, fantasyVote: 6 },
      ],
      'p1',
      { initialQuote: 10, currentQuote: 11, fantasyMultiplier: 1 },
    );

    expect(trend).toHaveLength(2);
    expect(trend[0]).toMatchObject({ round: 1, quote: 10, quoteChange: 0, source: 'synthetic' });
    expect(trend[1]).toMatchObject({ round: 2, quote: 11, quoteChange: 1, fantaTradingReturnPct: 5 });
  });

  it('falls back to mock trend data when synthetic rows are unavailable', () => {
    const trend = normalizeSyntheticTrend([], 'missing', { initialQuote: 8, currentQuote: 10 });

    expect(trend).toHaveLength(8);
    expect(trend.every(point => point.source === 'mock')).toBe(true);
    expect(getTrendTone(trend)).toBe('up');
  });

  it('handles empty and flat trend states without crashing', () => {
    expect(getTrendTone([])).toBe('stable');
    expect(getTrendTone(createMockTrend(7, 7))).toBe('stable');
  });
});
