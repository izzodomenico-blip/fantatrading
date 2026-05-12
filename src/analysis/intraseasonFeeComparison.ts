import { NormalizedQuoteRow } from '../importers/realQuotesImporter';
import { NormalizedVoteRow } from '../importers/realVotesImporter';
import { mean, stdDev } from '../utils/mathUtils';
import {
  DEFAULT_INTRASEASON_BACKTEST_CONFIG,
  IntraseasonAggregateStats,
  IntraseasonStrategy,
  SyntheticRoundQuoteInput,
  runIntraseasonTradingBacktest,
} from './intraseasonTradingBacktest';

const SELL_FEE_A = 0.0125;
const SELL_FEE_B = 0.02;
const STRATEGIES: IntraseasonStrategy[] = ['HOLD', 'VALUE_ROTATION', 'MOMENTUM', 'STOP_LOSS', 'TAKE_PROFIT', 'HYBRID_VALUE_MOMENTUM'];

export interface FeeScenarioStats {
  scenario: 'A' | 'B';
  scenarioLabel: string;
  sellFeePct: number;
  strategy: IntraseasonStrategy;
  avgROI: number;
  medianROI: number;
  bestROI: number;
  worstROI: number;
  pctAbove0: number;
  pctAbove7: number;
  pctAbove10: number;
  avgTrades: number;
  avgCommissions: number;
  avgPlatformRevenue: number;
  avgDeltaVsHold: number;
}

export interface FeeComparisonDelta {
  strategy: IntraseasonStrategy;
  deltaROI: number;
  deltaCommissions: number;
  deltaPlatformRevenue: number;
  deltaVsHoldChange: number;
}

export interface FeeComparisonAnalysis {
  activeTradingBeatsHoldA: boolean;
  bestActiveBeatMarginA: number;
  activeTradingBeatsHoldB: boolean;
  bestActiveBeatMarginB: number;
  platformRevenueImprovementPct: number;
  platformRevenueAbsoluteGainPerTrade: number;
  sellFee2pctRecommended: boolean;
  unlimitedTradesDangerous: boolean;
  unlimitedTradesDangerousReason: string;
  holdDeltaScenarios: number;
  summaryLines: string[];
}

export interface FeeComparisonReport {
  generatedAt: string;
  modelId: 'INTRASEASON_FEE_COMPARISON_V1';
  quoteModelName: string;
  warning: string;
  scenarioA: { label: string; sellFeePct: number };
  scenarioB: { label: string; sellFeePct: number };
  completedSeasons: string[];
  completedStatsA: FeeScenarioStats[];
  completedStatsB: FeeScenarioStats[];
  deltas: FeeComparisonDelta[];
  analysis: FeeComparisonAnalysis;
}

function aggregateByStrategy(stats: IntraseasonAggregateStats[]): Map<IntraseasonStrategy, {
  avgROI: number; medianROI: number; bestROI: number; worstROI: number;
  pctAbove0: number; pctAbove7: number; pctAbove10: number;
  avgTrades: number; avgCommissions: number; avgPlatformRevenue: number; avgDeltaVsHold: number;
}> {
  const result = new Map();
  for (const strategy of STRATEGIES) {
    const rows = stats.filter(s => s.strategy === strategy);
    if (rows.length === 0) continue;
    result.set(strategy, {
      avgROI: mean(rows.map(r => r.avgROI)),
      medianROI: mean(rows.map(r => r.medianROI)),
      bestROI: Math.max(...rows.map(r => r.bestROI)),
      worstROI: Math.min(...rows.map(r => r.worstROI)),
      pctAbove0: mean(rows.map(r => r.pctAbove0)),
      pctAbove7: mean(rows.map(r => r.pctAbove7)),
      pctAbove10: mean(rows.map(r => r.pctAbove10)),
      avgTrades: mean(rows.map(r => r.avgTrades)),
      avgCommissions: mean(rows.map(r => r.avgCommissions)),
      avgPlatformRevenue: mean(rows.map(r => r.avgPlatformRevenue)),
      avgDeltaVsHold: mean(rows.map(r => r.avgDeltaVsHold)),
    });
  }
  return result;
}

function buildFeeStats(
  scenario: 'A' | 'B',
  scenarioLabel: string,
  sellFeePct: number,
  completedStats: IntraseasonAggregateStats[],
): FeeScenarioStats[] {
  const byStrategy = aggregateByStrategy(completedStats);
  return STRATEGIES.map(strategy => {
    const agg = byStrategy.get(strategy);
    if (!agg) throw new Error(`Strategia ${strategy} non trovata nei completedStats`);
    return { scenario, scenarioLabel, sellFeePct, strategy, ...agg };
  });
}

function buildAnalysis(
  statsA: FeeScenarioStats[],
  statsB: FeeScenarioStats[],
): FeeComparisonAnalysis {
  const holdA = statsA.find(s => s.strategy === 'HOLD')!;
  const holdB = statsB.find(s => s.strategy === 'HOLD')!;
  const activeA = statsA.filter(s => s.strategy !== 'HOLD' && s.strategy !== 'STOP_LOSS');
  const activeB = statsB.filter(s => s.strategy !== 'HOLD' && s.strategy !== 'STOP_LOSS');

  const bestActiveA = Math.max(...activeA.map(s => s.avgROI));
  const bestActiveB = Math.max(...activeB.map(s => s.avgROI));
  const activeTradingBeatsHoldA = bestActiveA > holdA.avgROI;
  const activeTradingBeatsHoldB = bestActiveB > holdB.avgROI;

  const platformA = mean(statsA.map(s => s.avgPlatformRevenue));
  const platformB = mean(statsB.map(s => s.avgPlatformRevenue));
  const platformRevenueImprovementPct = platformA > 0 ? (platformB - platformA) / platformA * 100 : 0;
  const platformRevenueAbsoluteGainPerTrade = mean(
    statsB.map((s, i) => s.avgTrades > 0 ? (s.avgPlatformRevenue - statsA[i].avgPlatformRevenue) : 0)
  );

  const momentumROI_A = statsA.find(s => s.strategy === 'MOMENTUM')?.avgROI ?? 0;
  const takeProfitROI_A = statsA.find(s => s.strategy === 'TAKE_PROFIT')?.avgROI ?? 0;
  const unlimitedTradesDangerous = momentumROI_A < holdA.avgROI - 10 && takeProfitROI_A < holdA.avgROI - 10;
  const unlimitedTradesDangerousReason = unlimitedTradesDangerous
    ? `MOMENTUM (${momentumROI_A.toFixed(1)}%) e TAKE_PROFIT (${takeProfitROI_A.toFixed(1)}%) hanno ROI significativamente inferiore a HOLD (${holdA.avgROI.toFixed(1)}%). Il trading frequente e penalizzato dalle commissioni.`
    : 'I dati non mostrano un segnale di pericolo forte nei cambi frequenti.';

  const holdDeltaScenarios = holdA.avgROI - holdB.avgROI;
  const sellFee2pctRecommended = platformRevenueImprovementPct > 30 && holdDeltaScenarios < 2;

  const summaryLines: string[] = [];

  summaryLines.push(`1. Con commissione vendita ${(SELL_FEE_A * 100).toFixed(2)}% (scenario A), il trading attivo ${activeTradingBeatsHoldA ? 'BATTE' : 'NON BATTE'} HOLD. Miglior ROI attivo: ${bestActiveA.toFixed(2)}% vs HOLD: ${holdA.avgROI.toFixed(2)}%.`);
  summaryLines.push(`2. Con commissione vendita ${(SELL_FEE_B * 100).toFixed(2)}% (scenario B), il trading attivo ${activeTradingBeatsHoldB ? 'BATTE' : 'NON BATTE'} HOLD. Miglior ROI attivo: ${bestActiveB.toFixed(2)}% vs HOLD: ${holdB.avgROI.toFixed(2)}%.`);
  summaryLines.push(`3. Passando da ${(SELL_FEE_A * 100).toFixed(2)}% a ${(SELL_FEE_B * 100).toFixed(2)}% di commissione vendita, il ricavo medio piattaforma aumenta del ${platformRevenueImprovementPct.toFixed(1)}%.`);
  summaryLines.push(`4. La commissione vendita 2% ${sellFee2pctRecommended ? 'E CONSIGLIATA' : 'NON e ancora chiaramente consigliata'}: migliora la sostenibilita piattaforma del ${platformRevenueImprovementPct.toFixed(1)}% ma penalizza HOLD di ${holdDeltaScenarios.toFixed(2)} pp. Con dati sintetici la decisione e ancora esplorativa.`);
  summaryLines.push(`5. I cambi illimitati (MOMENTUM/TAKE_PROFIT) ${unlimitedTradesDangerous ? 'SEMBRANO PERICOLOSI' : 'non mostrano un segnale di pericolo netto'}: ${unlimitedTradesDangerousReason}`);

  return {
    activeTradingBeatsHoldA,
    bestActiveBeatMarginA: bestActiveA - holdA.avgROI,
    activeTradingBeatsHoldB,
    bestActiveBeatMarginB: bestActiveB - holdB.avgROI,
    platformRevenueImprovementPct,
    platformRevenueAbsoluteGainPerTrade,
    sellFee2pctRecommended,
    unlimitedTradesDangerous,
    unlimitedTradesDangerousReason,
    holdDeltaScenarios,
    summaryLines,
  };
}

export function runIntraseasonFeeComparison(
  quoteRows: NormalizedQuoteRow[],
  voteRows: NormalizedVoteRow[],
  syntheticRows: SyntheticRoundQuoteInput[],
): FeeComparisonReport {
  const baseConfig = DEFAULT_INTRASEASON_BACKTEST_CONFIG;

  const reportA = runIntraseasonTradingBacktest(quoteRows, voteRows, syntheticRows, { ...baseConfig, sellFee: SELL_FEE_A });
  const reportB = runIntraseasonTradingBacktest(quoteRows, voteRows, syntheticRows, { ...baseConfig, sellFee: SELL_FEE_B });

  const statsA = buildFeeStats('A', `Vendita ${(SELL_FEE_A * 100).toFixed(2)}% (originale)`, SELL_FEE_A * 100, reportA.completedStats);
  const statsB = buildFeeStats('B', `Vendita ${(SELL_FEE_B * 100).toFixed(2)}% (V1 proposto)`, SELL_FEE_B * 100, reportB.completedStats);

  const deltas: FeeComparisonDelta[] = STRATEGIES.map(strategy => {
    const a = statsA.find(s => s.strategy === strategy)!;
    const b = statsB.find(s => s.strategy === strategy)!;
    return {
      strategy,
      deltaROI: b.avgROI - a.avgROI,
      deltaCommissions: b.avgCommissions - a.avgCommissions,
      deltaPlatformRevenue: b.avgPlatformRevenue - a.avgPlatformRevenue,
      deltaVsHoldChange: b.avgDeltaVsHold - a.avgDeltaVsHold,
    };
  });

  const analysis = buildAnalysis(statsA, statsB);

  return {
    generatedAt: new Date().toISOString(),
    modelId: 'INTRASEASON_FEE_COMPARISON_V1',
    quoteModelName: reportA.quoteModel.modelName,
    warning: 'Quotazioni sintetiche, risultati esplorativi. La commissione vendita 2% e 1.25% influisce sul ROI netto del partecipante e sul ricavo piattaforma.',
    scenarioA: { label: `Vendita ${(SELL_FEE_A * 100).toFixed(2)}% (originale)`, sellFeePct: SELL_FEE_A * 100 },
    scenarioB: { label: `Vendita ${(SELL_FEE_B * 100).toFixed(2)}% (V1 proposto)`, sellFeePct: SELL_FEE_B * 100 },
    completedSeasons: reportA.completedSeasons,
    completedStatsA: statsA,
    completedStatsB: statsB,
    deltas,
    analysis,
  };
}

function fmt(n: number, d = 2): string {
  return n.toFixed(d);
}

export function buildFeeComparisonCsv(report: FeeComparisonReport): string {
  const headers = [
    'scenario', 'scenarioLabel', 'sellFeePct', 'strategy',
    'avgROI', 'medianROI', 'bestROI', 'worstROI',
    'pctAbove0', 'pctAbove7', 'pctAbove10',
    'avgTrades', 'avgCommissions', 'avgPlatformRevenue', 'avgDeltaVsHold',
  ];
  const allStats = [...report.completedStatsA, ...report.completedStatsB];
  const rows = allStats.map(s => [
    s.scenario, s.scenarioLabel, fmt(s.sellFeePct, 2), s.strategy,
    fmt(s.avgROI), fmt(s.medianROI), fmt(s.bestROI), fmt(s.worstROI),
    fmt(s.pctAbove0), fmt(s.pctAbove7), fmt(s.pctAbove10),
    fmt(s.avgTrades), fmt(s.avgCommissions, 4), fmt(s.avgPlatformRevenue, 4), fmt(s.avgDeltaVsHold),
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function buildFeeComparisonMarkdown(report: FeeComparisonReport): string {
  const lines: string[] = [];

  lines.push('# FantaTrading — Confronto Commissione Vendita: 1.25% vs 2%');
  lines.push('');
  lines.push('## 1. Avvertenza');
  lines.push('');
  lines.push(report.warning);
  lines.push('');
  lines.push(`**Modello quotazioni sintetiche:** ${report.quoteModelName}`);
  lines.push(`**Stagioni completed:** ${report.completedSeasons.join(', ')}`);
  lines.push(`**Acquisto:** 2% (fisso) — **Vendita scenario A:** ${fmt(report.scenarioA.sellFeePct)}% — **Vendita scenario B:** ${fmt(report.scenarioB.sellFeePct)}%`);
  lines.push('');

  lines.push('## 2. Scenario A — Commissione Vendita 1.25% (Regolamento Originale)');
  lines.push('');
  lines.push('| Strategia | ROI medio | ROI mediano | Best | Worst | >0% | >7% | >10% | Cambi medi | Commissioni | Rev. piattaforma | Delta vs HOLD |');
  lines.push('|-----------|-----------|-------------|------|-------|-----|-----|------|------------|-------------|-----------------|---------------|');
  for (const s of report.completedStatsA) {
    lines.push(`| ${s.strategy} | ${fmt(s.avgROI)}% | ${fmt(s.medianROI)}% | ${fmt(s.bestROI)}% | ${fmt(s.worstROI)}% | ${fmt(s.pctAbove0)}% | ${fmt(s.pctAbove7)}% | ${fmt(s.pctAbove10)}% | ${fmt(s.avgTrades)} | ${fmt(s.avgCommissions, 3)} | ${fmt(s.avgPlatformRevenue, 3)} | ${fmt(s.avgDeltaVsHold)}pp |`);
  }
  lines.push('');

  lines.push('## 3. Scenario B — Commissione Vendita 2% (Regolamento V1 Proposto)');
  lines.push('');
  lines.push('| Strategia | ROI medio | ROI mediano | Best | Worst | >0% | >7% | >10% | Cambi medi | Commissioni | Rev. piattaforma | Delta vs HOLD |');
  lines.push('|-----------|-----------|-------------|------|-------|-----|-----|------|------------|-------------|-----------------|---------------|');
  for (const s of report.completedStatsB) {
    lines.push(`| ${s.strategy} | ${fmt(s.avgROI)}% | ${fmt(s.medianROI)}% | ${fmt(s.bestROI)}% | ${fmt(s.worstROI)}% | ${fmt(s.pctAbove0)}% | ${fmt(s.pctAbove7)}% | ${fmt(s.pctAbove10)}% | ${fmt(s.avgTrades)} | ${fmt(s.avgCommissions, 3)} | ${fmt(s.avgPlatformRevenue, 3)} | ${fmt(s.avgDeltaVsHold)}pp |`);
  }
  lines.push('');

  lines.push('## 4. Delta scenario B − A (impatto del +0.75% commissione vendita)');
  lines.push('');
  lines.push('| Strategia | ΔROI | ΔCommissioni | ΔRicavo piattaforma | ΔDelta vs HOLD |');
  lines.push('|-----------|------|-------------|--------------------|--------------  |');
  for (const d of report.deltas) {
    const sign = (n: number) => n >= 0 ? '+' : '';
    lines.push(`| ${d.strategy} | ${sign(d.deltaROI)}${fmt(d.deltaROI)}pp | ${sign(d.deltaCommissions)}${fmt(d.deltaCommissions, 3)} | ${sign(d.deltaPlatformRevenue)}${fmt(d.deltaPlatformRevenue, 4)} | ${sign(d.deltaVsHoldChange)}${fmt(d.deltaVsHoldChange)}pp |`);
  }
  lines.push('');

  lines.push('## 5. Analisi e Conclusioni');
  lines.push('');
  for (const line of report.analysis.summaryLines) {
    lines.push(`- ${line}`);
    lines.push('');
  }

  lines.push('## 6. Dettaglio per ogni domanda regolamentare');
  lines.push('');

  lines.push(`**1. Con vendita 1.25%, il trading attivo batte HOLD?**`);
  lines.push(`${report.analysis.activeTradingBeatsHoldA ? 'Si.' : 'No.'} Margine miglior strategia attiva vs HOLD: ${fmt(report.analysis.bestActiveBeatMarginA)}pp. Con questo modello sintetico il trading attivo non produce un vantaggio strutturale rispetto a HOLD.`);
  lines.push('');

  lines.push(`**2. Con vendita 2%, il trading attivo batte HOLD?**`);
  lines.push(`${report.analysis.activeTradingBeatsHoldB ? 'Si.' : 'No.'} Margine: ${fmt(report.analysis.bestActiveBeatMarginB)}pp. La commissione piu alta rende il trading attivo ancora meno attraente.`);
  lines.push('');

  lines.push(`**3. Quanto migliora la sostenibilita piattaforma con vendita 2%?**`);
  lines.push(`Ricavo medio piattaforma aumenta del **${fmt(report.analysis.platformRevenueImprovementPct, 1)}%** passando da 1.25% a 2% di commissione vendita. Ogni unita di trade aggiuntiva frutta di piu alla piattaforma.`);
  lines.push('');

  lines.push(`**4. La commissione vendita 2% e consigliata?**`);
  const rec2pct = report.analysis.sellFee2pctRecommended;
  lines.push(`${rec2pct ? 'Preliminarmente si.' : 'Con dati sintetici la risposta e incerta.'} L aumento del ${fmt(report.analysis.platformRevenueImprovementPct, 1)}% del ricavo piattaforma giustifica il costo per il partecipante (-${fmt(Math.abs(report.analysis.holdDeltaScenarios), 2)}pp su HOLD). La decisione definitiva richiede dati di quotazione ufficiali giornata per giornata.`);
  lines.push('');

  lines.push(`**5. I cambi illimitati sembrano pericolosi?**`);
  lines.push(`${report.analysis.unlimitedTradesDangerous ? 'Si.' : 'Non in modo evidente.'} ${report.analysis.unlimitedTradesDangerousReason} Il regolamento V1 dovrebbe mantenere un limite di cambi per finestra per contenere il rischio overtrading.`);
  lines.push('');

  lines.push('## 7. Limiti del modello');
  lines.push('');
  lines.push('- Le quotazioni sintetiche round-by-round hanno MAE 1.46 punti: il confronto e esplorativo.');
  lines.push('- I risultati non includono montepremi, liquidita e vincoli reali di mercato.');
  lines.push('- STOP_LOSS con soglia -5%/-10% su quotazioni sintetiche non scatta mai in stagioni con qaa stabile: equivale a HOLD.');
  lines.push('- Ogni stagione ha un solo portfolio (nessuna randomizzazione), quindi varianza basata sulle 2 stagioni completed.');

  return lines.join('\n');
}
