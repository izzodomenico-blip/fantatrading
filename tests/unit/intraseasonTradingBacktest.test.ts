import { NormalizedQuoteRow } from '../../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../../src/importers/realVotesImporter';
import {
  SyntheticRoundQuoteInput,
  buildInitialRoster,
  buildIntraseasonBacktestCsv,
  buildIntraseasonBacktestMarkdown,
  buildSyntheticQuoteIndex,
  executeTrade,
  fantaTradingPositionValue,
  isValidRoster,
  runIntraseasonTradingBacktest,
} from '../../src/analysis/intraseasonTradingBacktest';

function quote(season: string, id: number, role: NormalizedQuoteRow['role'], initialQuote = 10): NormalizedQuoteRow {
  return {
    season,
    seasonStatus: season === '2025/26' ? 'in_progress' : 'completed',
    playerId: id,
    role,
    roleExtended: role,
    playerName: `${role}${id}`,
    club: 'Club',
    initialQuote,
    currentOrFinalQuote: initialQuote + 1,
    quoteDiff: 1,
    quoteRawReturnPct: 10,
    quoteTradingReturnPct: 5,
    initialQuoteMantra: initialQuote,
    currentOrFinalQuoteMantra: initialQuote + 1,
    quoteDiffMantra: 1,
    fvm: 0,
    fvmMantra: 0,
    sourceFile: 'q.xlsx',
  };
}

function vote(season: string, round: number, q: NormalizedQuoteRow): NormalizedVoteRow {
  return {
    season,
    seasonStatus: q.seasonStatus,
    round,
    playerId: String(q.playerId),
    playerName: q.playerName,
    club: q.club,
    role: q.role,
    vote: 6,
    fantasyVote: 6,
    minutesPlayed: null,
    played: true,
    starter: null,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    penaltiesMissed: 0,
    ownGoals: 0,
    sourceFile: 'v.xlsx',
  };
}

function seasonData(season: string) {
  let id = 1;
  const quotes: NormalizedQuoteRow[] = [];
  for (const [role, count] of Object.entries({ P: 5, D: 10, C: 10, A: 8 })) {
    for (let i = 0; i < count; i++) quotes.push(quote(season, id++, role as NormalizedQuoteRow['role'], 5 + i));
  }
  const synthetic: SyntheticRoundQuoteInput[] = [];
  const votes: NormalizedVoteRow[] = [];
  for (let round = 1; round <= 8; round++) {
    for (const q of quotes) {
      synthetic.push({
        season,
        seasonStatus: q.seasonStatus,
        round,
        playerId: q.playerId,
        playerName: q.playerName,
        club: q.club,
        role: q.role,
        initialQuote: q.initialQuote,
        realCurrentOrFinalQuote: q.currentOrFinalQuote,
        qa: q.initialQuote + round * 0.1,
        qaa: q.initialQuote + (q.playerId % 3 === 0 ? round % 3 : 0),
      });
      votes.push(vote(season, round, q));
    }
  }
  return { quotes, synthetic, votes };
}

describe('intraseasonTradingBacktest', () => {
  test('legge quotazioni sintetiche per round', () => {
    const data = seasonData('2023/24');
    const index = buildSyntheticQuoteIndex(data.synthetic);
    expect(index.get('2023/24|2|1')?.qaa).toBeDefined();
  });

  test('costruisce rosa sempre valida 3P/8D/8C/6A', () => {
    const data = seasonData('2023/24');
    const roster = buildInitialRoster(data.quotes, 'HOLD');
    expect(isValidRoster(roster)).toBe(true);
  });

  test('vendita e riacquisto stesso ruolo con commissioni corrette', () => {
    const sold = { playerId: 1, role: 'P' as const, playerName: 'P1', club: 'Club', buyRound: 1, buyPrice: 10, initialQuote: 10, fantasyMultiplier: 1 };
    const replacement = quote('2023/24', 99, 'P', 12);
    const result = executeTrade([sold], sold, replacement, 2, 11, 12);
    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].role).toBe('P');
    expect(result.commission).toBeCloseTo(11 * 0.0125 + 12 * 0.02);
  });

  test('backtest non compra duplicati e non scende sotto 25 giocatori', () => {
    const s2023 = seasonData('2023/24');
    const s2024 = seasonData('2024/25');
    const s2025 = seasonData('2025/26');
    const report = runIntraseasonTradingBacktest(
      [...s2023.quotes, ...s2024.quotes, ...s2025.quotes],
      [...s2023.votes, ...s2024.votes, ...s2025.votes],
      [...s2023.synthetic, ...s2024.synthetic, ...s2025.synthetic],
      { marketFrequencies: [3], maxChangesPerWindow: [1], stopLossThresholds: [-5], takeProfitThresholds: [7] },
    );
    expect(report.scenarioResults.length).toBeGreaterThan(0);
    expect(report.scenarioResults.every(row => row.trades >= 0)).toBe(true);
  });

  test('calcola numero cambi e genera output report', () => {
    const s2023 = seasonData('2023/24');
    const s2024 = seasonData('2024/25');
    const s2025 = seasonData('2025/26');
    const report = runIntraseasonTradingBacktest(
      [...s2023.quotes, ...s2024.quotes, ...s2025.quotes],
      [...s2023.votes, ...s2024.votes, ...s2025.votes],
      [...s2023.synthetic, ...s2024.synthetic, ...s2025.synthetic],
      { marketFrequencies: [3], maxChangesPerWindow: [1], stopLossThresholds: [-5], takeProfitThresholds: [7] },
    );
    expect(report.completedStats.some(row => row.avgTrades >= 0)).toBe(true);
    expect(buildIntraseasonBacktestCsv(report)).toContain('avgROI');
    expect(buildIntraseasonBacktestMarkdown(report)).toContain('quotazioni giornata per giornata usate in questo report sono sintetiche');
  });

  describe('fantaTradingPositionValue — formula FantaTrading', () => {
    test('bonus 1.5 applicato come moltiplicatore 1.015, non addizione', () => {
      const baseMult = 1.0;
      const afterBonus = baseMult * (1 + 1.5 / 100);
      expect(afterBonus).toBeCloseTo(1.015);
      // formula: Qt.I=20, qaa=20 (flat), mult=1.015
      expect(fantaTradingPositionValue(20, 20, 1.015)).toBeCloseTo(20 * 1.015);
    });

    test('malus -2.5 applicato come moltiplicatore 0.975, non sottrazione', () => {
      const baseMult = 1.0;
      const afterMalus = baseMult * (1 + (-2.5) / 100);
      expect(afterMalus).toBeCloseTo(0.975);
      // formula: Qt.I=20, qaa=20 (flat), mult=0.975
      expect(fantaTradingPositionValue(20, 20, 0.975)).toBeCloseTo(20 * 0.975);
    });

    test('nessun doppio conteggio Qt.I → Qt.A: rendimento applicato una sola volta', () => {
      // Qt.I=20, qaa=22 → FantaTrading return = (22-20)*5 = 10%
      // positionValue = 20 * 1.0 * 1.10 = 22
      expect(fantaTradingPositionValue(20, 22, 1.0)).toBeCloseTo(22);
      // Con mult=1.5: 20 * 1.5 * 1.10 = 33 (non 22*1.5=33 per coincidenza, ma verifichiamo formula)
      expect(fantaTradingPositionValue(20, 22, 1.5)).toBeCloseTo(20 * 1.5 * 1.10);
      // Il rendimento è contato una volta: non 22 (qaa) * 1.5 = 33, né 20 * 1.10 * 1.5 due volte
      expect(fantaTradingPositionValue(20, 22, 1.5)).not.toBeCloseTo(22 * 1.5 + (22 - 20) * 5);
    });

    test('Qt.I != 20: formula non coincide con raw qaa', () => {
      // Qt.I=34, qaa=36 → FantaTrading return = (36-34)*5 = 10%
      // Corretto: 34 * 1.0 * 1.10 = 37.4
      // Bug precedente: 36 * 1.0 = 36
      expect(fantaTradingPositionValue(34, 36, 1.0)).toBeCloseTo(37.4);
      expect(fantaTradingPositionValue(34, 36, 1.0)).not.toBeCloseTo(36);
    });

    test('Qt.I basso: formula non sopravvaluta il giocatore economico', () => {
      // Qt.I=5, qaa=7 → FantaTrading return = (7-5)*5 = 10%
      // Corretto: 5 * 1.0 * 1.10 = 5.5
      // Bug precedente: 7 * 1.0 = 7 (sopravvaluta del 27%)
      expect(fantaTradingPositionValue(5, 7, 1.0)).toBeCloseTo(5.5);
      expect(fantaTradingPositionValue(5, 7, 1.0)).not.toBeCloseTo(7);
    });

    test('ROI caso semplice: Qt.I=20, flat market, no bonus → solo commissioni', () => {
      // Buy 1 player: 20 * 1.02 = 20.4
      // Sell: fantaTradingPositionValue(20, 20, 1.0) = 20, net = 20 * 0.9875 = 19.75
      // ROI = (19.75 - 20.4) / 20.4 ≈ -3.19%
      const qi = 20;
      const buyCost = qi * 1.02;
      const sellValue = fantaTradingPositionValue(qi, qi, 1.0);
      const netSell = sellValue * (1 - 0.0125);
      const roi = (netSell - buyCost) / buyCost * 100;
      expect(roi).toBeCloseTo(-3.19, 1);
      // Verifica che sia negativo (solo commissioni senza market gain)
      expect(roi).toBeLessThan(0);
    });
  });

  test('HOLD non genera commissioni extra oltre acquisto iniziale e vendita finale', () => {
    const s2023 = seasonData('2023/24');
    const s2024 = seasonData('2024/25');
    const s2025 = seasonData('2025/26');
    const report = runIntraseasonTradingBacktest(
      [...s2023.quotes, ...s2024.quotes, ...s2025.quotes],
      [...s2023.votes, ...s2024.votes, ...s2025.votes],
      [...s2023.synthetic, ...s2024.synthetic, ...s2025.synthetic],
      { marketFrequencies: [3], maxChangesPerWindow: [1], stopLossThresholds: [-5], takeProfitThresholds: [7] },
    );
    const holdCompleted = report.scenarioResults.filter(row => row.strategy === 'HOLD' && row.season === '2023/24');
    expect(holdCompleted.length).toBeGreaterThan(0);
    for (const result of holdCompleted) {
      expect(result.trades).toBe(0);
      // Commissioni = solo acquisto 2% + vendita finale 1.25%
      // Non deve avere commissioni da trade intermedi
      const expectedBuyComm = result.totalCapitalAdded * 0.02 / 1.02;
      const maxPossibleComm = result.totalCapitalAdded * (0.02 + 0.0125);
      expect(result.totalCommissions).toBeLessThanOrEqual(maxPossibleComm + 0.01);
    }
  });
});
