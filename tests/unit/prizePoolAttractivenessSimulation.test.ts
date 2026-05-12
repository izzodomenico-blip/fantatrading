import {
  SourceReports,
  buildPrizePoolAttractivenessCsv,
  buildPrizePoolAttractivenessMarkdown,
  calculateBreakEvenParticipants,
  calculateEntrySplit,
  calculatePrizePoolFromEntryFees,
  calculateSystemRevenueFromCommissions,
  evaluatePrizePoolScenario,
  hybridPrizeTable,
  runPrizePoolAttractivenessSimulation,
  thresholdPoolPrizeTable,
  top10PercentPrizeTable,
  top3PrizeTable,
  top5PrizeTable,
} from '../../src/analysis/prizePoolAttractivenessSimulation';

function sourceReports(): SourceReports {
  const commissionScenario = {
    scenarioId: 'BASE',
    label: 'Base',
    buyCommissionRate: 0.02,
    sellCommissionRate: 0.02,
    prizeThreshold: 7,
    revenueModel: 'COMMISSION_100_TO_PLATFORM',
    avgUserROI: -2,
    medianUserROI: -2,
    bestROI: 8,
    worstROI: -10,
    volatility: 8,
    pctAbove0: 40,
    pctAbovePrizeThreshold: 15,
    pctAbove5: 22,
    pctAbove7: 15,
    pctAbove10: 8,
    estimatedWinnersPct: 15,
    totalCommissionsPerParticipant: 8,
    platformRevenuePerParticipant: 8,
    platformRevenueAtUsers: { '20': 160, '50': 400, '100': 800, '250': 2000, '500': 4000, '1000': 8000 },
    avgCommissionsPaidPerParticipant: 8,
    commissionImpactOnROI: 4,
    userAttractivenessScore: 50,
    platformSustainabilityScore: 90,
    prizeSelectivityScore: 85,
    antiOvertradingScore: 90,
    valueDominanceControlScore: 60,
    simplicityScore: 100,
    finalScore: 75,
    overtradingRisk: 'LOW',
    valueDominanceRisk: 'MEDIUM',
    holdVsActiveDelta: -20,
    breakEvenUsers1000Cost: 125,
    recommendationNotes: [],
  };
  const variants = [
    commissionScenario,
    { ...commissionScenario, buyCommissionRate: 0.015, sellCommissionRate: 0.02, scenarioId: 'B15S20' },
    { ...commissionScenario, buyCommissionRate: 0.015, sellCommissionRate: 0.03, scenarioId: 'B15S30', platformRevenuePerParticipant: 9 },
    { ...commissionScenario, buyCommissionRate: 0.01, sellCommissionRate: 0.02, scenarioId: 'B10S20', platformRevenuePerParticipant: 6 },
    { ...commissionScenario, buyCommissionRate: 0.02, sellCommissionRate: 0.02, prizeThreshold: 5, scenarioId: 'T5', pctAbove5: 22, pctAbovePrizeThreshold: 22 },
    { ...commissionScenario, buyCommissionRate: 0.02, sellCommissionRate: 0.02, prizeThreshold: 10, scenarioId: 'T10', pctAbove10: 8, pctAbovePrizeThreshold: 8 },
  ];
  return {
    commissionRevenue: {
      matrixResults: variants as any,
      predefinedModels: variants as any,
      recommendation: { recommendedV1: commissionScenario as any },
    },
    historicalFullRules: {
      completedSeasons: ['2023/24', '2024/25'],
      inProgressSeasons: ['2025/26'],
    },
    fullRulesStress: { strategyStats: [] },
    intraseasonTrading: { warning: 'synthetic' },
  };
}

describe('prizePoolAttractivenessSimulation', () => {
  test('calcolo montepremi da quota iscrizione', () => {
    expect(calculatePrizePoolFromEntryFees(50, 20, 0.8)).toBe(800);
  });

  test('split iscrizione premio/sistema', () => {
    expect(calculateEntrySplit(100, 30, 0.7)).toEqual({
      prizePoolContribution: 2100,
      systemRevenue: 900,
    });
  });

  test('ricavo sistema da commissioni', () => {
    expect(calculateSystemRevenueFromCommissions(8, 50, 1)).toBe(400);
    expect(calculateSystemRevenueFromCommissions(8, 50, 0.7)).toBe(280);
  });

  test('premio top 3', () => {
    expect(top3PrizeTable(1000)).toEqual([500, 300, 200]);
  });

  test('premio top 5', () => {
    expect(top5PrizeTable(1000)).toEqual([400, 250, 150, 100, 100]);
  });

  test('top 10%', () => {
    const prizes = top10PercentPrizeTable(1000, 50);
    expect(prizes).toHaveLength(5);
    expect(prizes.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1000);
    expect(prizes[0]).toBeGreaterThan(prizes[4]);
  });

  test('distribuzione ibrida', () => {
    const prizes = hybridPrizeTable(1000, 50, 5);
    expect(prizes.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1000);
    expect(prizes.length).toBe(10);
  });

  test('break-even partecipanti', () => {
    expect(calculateBreakEvenParticipants(1000, 20, 0.2, 8, 1)).toBe(Math.ceil(1000 / 12));
  });

  test('scoring finale', () => {
    const scenario = evaluatePrizePoolScenario({
      id: 'test',
      modelId: 'MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM',
      label: 'test',
      participants: 100,
      entryFee: 20,
      prizeEntryShare: 0.8,
      systemEntryShare: 0.2,
      guaranteedPrizePool: 0,
      sponsorBoost: 0,
      commissionSystemShare: 1,
      commissionPrizeShare: 0,
      buyCommissionRate: 0.02,
      sellCommissionRate: 0.02,
      prizeThreshold: 7,
      prizeTableId: 'PRIZE_TABLE_TOP_10_PERCENT',
    }, sourceReports());
    expect(scenario.finalScore).toBeGreaterThan(0);
    expect(scenario.netDistributablePrizePool).toBe(1600);
  });

  test('output report generato', () => {
    const report = runPrizePoolAttractivenessSimulation(sourceReports());
    expect(report.top10Overall).toHaveLength(10);
    expect(buildPrizePoolAttractivenessCsv(report)).toContain('modelId');
    expect(buildPrizePoolAttractivenessMarkdown(report)).toContain('Executive summary');
    expect(buildPrizePoolAttractivenessMarkdown(report)).toContain('Limiti');
  });
});
