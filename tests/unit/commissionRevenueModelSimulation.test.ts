import {
  PREDEFINED_MODELS,
  SourceReports,
  buildCommissionRevenueModelCsv,
  buildCommissionRevenueModelMarkdown,
  calculateBuySystemRevenue,
  calculateNetUserProfit,
  calculateSellSystemRevenue,
  evaluateScenario,
  rankConfigurations,
  runCommissionRevenueModelSimulation,
} from '../../src/analysis/commissionRevenueModelSimulation';

function sourceReports(): SourceReports {
  const strategies = ['RANDOM', 'LOW_COST', 'TOP_PLAYER', 'BALANCED', 'VALUE'] as const;
  const thresholds = [5, 7, 10, 12];
  const sellRates = [0.0125, 0.02, 0.03];
  const strategyStats = [];
  for (const season of ['2023/24', '2024/25']) {
    for (const prizeThresholdPct of thresholds) {
      for (const sellCommissionRate of sellRates) {
        for (const [index, strategy] of strategies.entries()) {
          const baseGross = 106 + index * 2 + (season === '2024/25' ? 2 : 0);
          strategyStats.push({
            season,
            seasonStatus: 'completed',
            noVotePolicy: 'PLAYER_ZERO_TEAM_EXCLUDE',
            prizeThresholdPct,
            platformFeeRate: 0,
            sellCommissionRate,
            strategy,
            numSimulations: 10,
            avgROI: 1,
            medianROI: 1,
            pctAbove0: 55,
            pctAbove5: 30,
            pctAbove7: 20,
            pctAbove10: 12,
            pctAbovePrizeThreshold: 20,
            estimatedWinners: 2,
            avgBuyCost: 102,
            avgGrossSellValue: strategy === 'VALUE' ? baseGross + 4 : baseGross,
            avgPlatformRevenue: 0,
            avgFantasyImpact: 2,
            volatility: 8,
          });
        }
      }
    }
  }
  return {
    historicalFullRules: {
      completedSeasons: ['2023/24', '2024/25'],
      inProgressSeasons: ['2025/26'],
    },
    fullRulesStress: { strategyStats },
    intraseasonTrading: {
      warning: 'synthetic',
      completedStats: [
        { scope: 'completed', strategy: 'HOLD', avgROI: 5, medianROI: 5, bestROI: 7, worstROI: 3, volatility: 2, pctAbove0: 100, pctAbove7: 30, pctAbove10: 0, avgTrades: 0, avgCommissions: 2, avgPlatformRevenue: 0.2, avgDeltaVsHold: 0, overtradingRisk: 'LOW' },
        { scope: 'completed', strategy: 'VALUE_ROTATION', avgROI: -3, medianROI: -3, bestROI: 1, worstROI: -8, volatility: 3, pctAbove0: 10, pctAbove7: 0, pctAbove10: 0, avgTrades: 24, avgCommissions: 6, avgPlatformRevenue: 0.6, avgDeltaVsHold: -8, overtradingRisk: 'MEDIUM' },
        { scope: 'completed', strategy: 'MOMENTUM', avgROI: -12, medianROI: -12, bestROI: -4, worstROI: -20, volatility: 5, pctAbove0: 0, pctAbove7: 0, pctAbove10: 0, avgTrades: 24, avgCommissions: 9, avgPlatformRevenue: 0.9, avgDeltaVsHold: -17, overtradingRisk: 'MEDIUM' },
      ],
      inProgressStats: [],
    },
  } as SourceReports;
}

describe('commissionRevenueModelSimulation', () => {
  test('commissioni 100% sono ricavo sistema', () => {
    expect(calculateBuySystemRevenue(100, 0.02, 'COMMISSION_100_TO_PLATFORM')).toBeCloseTo(2);
    expect(calculateSellSystemRevenue(120, 0.02, 'COMMISSION_100_TO_PLATFORM')).toBeCloseTo(2.4);
  });

  test('confronta modello 100% con platformFeeRate 10%', () => {
    const full = calculateBuySystemRevenue(100, 0.02, 'COMMISSION_100_TO_PLATFORM');
    const previous = calculateBuySystemRevenue(100, 0.02, 'PLATFORM_10_OF_COMMISSIONS');
    expect(full).toBeCloseTo(previous * 10);
  });

  test('calcola ricavo sistema su acquisto e vendita', () => {
    expect(calculateBuySystemRevenue(250, 0.01, 'COMMISSION_100_TO_PLATFORM')).toBeCloseTo(2.5);
    expect(calculateSellSystemRevenue(250, 0.03, 'COMMISSION_100_TO_PLATFORM')).toBeCloseTo(7.5);
  });

  test('calcola plusvalenza netta utente', () => {
    expect(calculateNetUserProfit(100, 120, 0.02, 0.02)).toBeCloseTo(15.6);
  });

  test('ranking configurazioni ordina per score finale', () => {
    const reports = sourceReports();
    const scenarios = PREDEFINED_MODELS.slice(0, 3).map(scenario => evaluateScenario(scenario, reports));
    const ranked = rankConfigurations(scenarios);
    expect(ranked[0].finalScore).toBeGreaterThanOrEqual(ranked[1].finalScore);
  });

  test('scoring finale produce top e raccomandazione', () => {
    const report = runCommissionRevenueModelSimulation(sourceReports());
    expect(report.top10Overall).toHaveLength(10);
    expect(report.recommendation.recommendedV1.finalScore).toBeGreaterThan(0);
    expect(report.predefinedModels.find(row => row.scenarioId === 'MODEL_B_COMMISSION_100_BASE')?.platformRevenuePerParticipant)
      .toBeGreaterThan(report.predefinedModels.find(row => row.scenarioId === 'MODEL_A_PREVIOUS_PLATFORM_10')?.platformRevenuePerParticipant ?? 0);
  });

  test('output report generato', () => {
    const report = runCommissionRevenueModelSimulation(sourceReports());
    expect(buildCommissionRevenueModelCsv(report)).toContain('scenarioId');
    expect(buildCommissionRevenueModelMarkdown(report)).toContain('Executive summary');
    expect(buildCommissionRevenueModelMarkdown(report)).toContain('Limiti');
  });
});
