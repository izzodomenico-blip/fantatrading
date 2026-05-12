/**
 * Test unitari della shared library FantaTrading.
 *
 * Verifica le regole fondamentali del regolamento V1:
 * commissioni, formula quotazioni, ROI, composizione rosa, SV, premi.
 */

import {
  // Commissioni
  calculateBuyCommission,
  calculateSellCommission,
  calculateBuyCost,
  calculateSellProceeds,
  calculatePlatformFee,
  // Valore posizione
  calculateQuoteStepReturn,
  calculatePositionValue,
  // Portfolio
  calculatePortfolioValue,
  // ROI
  calculateROI,
  calculatePrizeEligibility,
  // Rosa
  validateRosterComposition,
  isRosterComplete,
  // Fascia squadra
  calculateTeamVoteBand,
  // Bonus/malus
  calculateFantasyBonusMalus,
  applyBonusToMultiplier,
  // Costanti V1
  V1_BUY_COMMISSION_RATE,
  V1_SELL_COMMISSION_RATE,
  V1_PLATFORM_FEE_RATE,
  V1_PRIZE_THRESHOLD,
  V1_SURVIVAL_THRESHOLD,
  V1_QUOTE_STEP_PCT,
  V1_ROSTER_COMPOSITION,
  V1_NO_VOTE_POLICY,
  // Precisione
  roundTo2,
  roundTo6,
} from '../../src/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Costanti V1
// ─────────────────────────────────────────────────────────────────────────────

describe('Costanti V1', () => {
  test('commissione acquisto V1 = 2%', () => {
    expect(V1_BUY_COMMISSION_RATE).toBe(0.02);
  });

  test('commissione vendita V1 = 2%', () => {
    expect(V1_SELL_COMMISSION_RATE).toBe(0.02);
  });

  test('platform fee V1 = 10%', () => {
    expect(V1_PLATFORM_FEE_RATE).toBe(0.10);
  });

  test('soglia sopravvivenza V1 = 0%', () => {
    expect(V1_SURVIVAL_THRESHOLD).toBe(0);
  });

  test('soglia premio V1 = 7%', () => {
    expect(V1_PRIZE_THRESHOLD).toBe(7);
  });

  test('ogni punto quotazione = 5%', () => {
    expect(V1_QUOTE_STEP_PCT).toBe(5);
  });

  test('composizione rosa V1: 3+8+8+6 = 25 giocatori', () => {
    const { GK, DEF, MID, FWD, total } = V1_ROSTER_COMPOSITION;
    expect(GK).toBe(3);
    expect(DEF).toBe(8);
    expect(MID).toBe(8);
    expect(FWD).toBe(6);
    expect(total).toBe(25);
    expect(GK + DEF + MID + FWD).toBe(25);
  });

  test('NoVotePolicy V1 = PLAYER_ZERO_TEAM_EXCLUDE', () => {
    expect(V1_NO_VOTE_POLICY.policy).toBe('PLAYER_ZERO_TEAM_EXCLUDE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Commissioni
// ─────────────────────────────────────────────────────────────────────────────

describe('Commissioni', () => {
  test('commissione acquisto 2%: valore 100 → commissione 2', () => {
    expect(calculateBuyCommission(100, 0.02)).toBe(2);
  });

  test('commissione vendita 2%: valore 120 → commissione 2.40', () => {
    expect(calculateSellCommission(120, 0.02)).toBeCloseTo(2.40, 6);
  });

  test('calculateBuyCost: valore 100, rate 2% → costo totale 102', () => {
    const result = calculateBuyCost(100, 0.02);
    expect(result.grossValue).toBe(100);
    expect(result.commission).toBe(2);
    expect(result.totalCost).toBe(102);
  });

  test('calculateSellProceeds: valore 120, rate 2% → netto 117.60', () => {
    const result = calculateSellProceeds(120, 0.02);
    expect(result.grossValue).toBe(120);
    expect(result.commission).toBeCloseTo(2.40, 6);
    expect(result.netProceeds).toBeCloseTo(117.60, 6);
  });

  test('commissione acquisto 0%: nessun costo aggiuntivo', () => {
    expect(calculateBuyCommission(100, 0)).toBe(0);
  });

  test('commissione acquisto su valore zero = 0', () => {
    expect(calculateBuyCommission(0, 0.02)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Platform fee
// ─────────────────────────────────────────────────────────────────────────────

describe('Platform fee', () => {
  test('10% su 1000 crediti commissioni = 100', () => {
    expect(calculatePlatformFee(1000, 0.10)).toBe(100);
  });

  test('10% su 42.30 commissioni', () => {
    expect(calculatePlatformFee(42.30, 0.10)).toBeCloseTo(4.23, 6);
  });

  test('platform fee 0% = 0', () => {
    expect(calculatePlatformFee(1000, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Formula quotazioni (+1 punto = +5%)
// ─────────────────────────────────────────────────────────────────────────────

describe('Formula quotazioni: +1 punto = +5%', () => {
  test('Qt.I=40, Qt.A=41: rendimento = +5%', () => {
    expect(calculateQuoteStepReturn(40, 41)).toBe(5);
  });

  test('Qt.I=10, Qt.A=11: rendimento = +5% (non dipende dal valore assoluto)', () => {
    expect(calculateQuoteStepReturn(10, 11)).toBe(5);
  });

  test('variazione +2 punti = +10%', () => {
    expect(calculateQuoteStepReturn(20, 22)).toBe(10);
  });

  test('variazione -1 punto = -5%', () => {
    expect(calculateQuoteStepReturn(30, 29)).toBe(-5);
  });

  test('variazione -3 punti = -15%', () => {
    expect(calculateQuoteStepReturn(30, 27)).toBe(-15);
  });

  test('nessuna variazione = 0%', () => {
    expect(calculateQuoteStepReturn(20, 20)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculatePositionValue: formula FantaTrading
// ─────────────────────────────────────────────────────────────────────────────

describe('calculatePositionValue: formula FantaTrading', () => {
  test('Qt.I=1, Qt.A=2, mult=1: valore = 1.05 (NON 2 — +5%, non +100%)', () => {
    // Questa è la differenza fondamentale rispetto alla formula classica
    expect(calculatePositionValue(1, 2, 1.0)).toBeCloseTo(1.05, 6);
  });

  test('Qt.I=40, Qt.A=41, mult=1: valore = 42 (+5% su 40)', () => {
    expect(calculatePositionValue(40, 41, 1.0)).toBeCloseTo(42, 6);
  });

  test('mercato piatto (Qt.A = Qt.I), mult=1: valore = Qt.I invariato', () => {
    expect(calculatePositionValue(20, 20, 1.0)).toBe(20);
  });

  test('mercato piatto con bonus 1.5%: solo il moltiplicatore incide', () => {
    // fantasyMultiplier dopo +1.5% bonus: 1 × (1 + 0.015) = 1.015
    expect(calculatePositionValue(20, 20, 1.015)).toBeCloseTo(20.30, 4);
  });

  test('malus applicato come moltiplicatore (0.975), non sottrazione', () => {
    // bonus -2.5%: mult = 1 × (1 - 0.025) = 0.975
    const result = calculatePositionValue(20, 20, 0.975);
    expect(result).toBeCloseTo(19.50, 4);
    // Verifica che NON sia 20 - 2.5 = 17.5 (errore comune)
    expect(result).not.toBeCloseTo(17.5, 1);
  });

  test('perdita massima: valore non può diventare negativo (floor a zero)', () => {
    // Qt.I=10, Qt.A=0: rendimento = (0-10)*5 = -50% → valore = 10*(1-0.5) = 5
    expect(calculatePositionValue(10, 0, 1.0)).toBeCloseTo(5, 6);
    // Qt.I=10, Qt.A=-10: rendimento = -100% → valore = max(0, 10*0) = 0
    expect(calculatePositionValue(10, -10, 1.0)).toBe(0);
  });

  test('sell value mai negativo con qualsiasi quotazione', () => {
    // Quotazione crollata a -100: rendimento (−200 − 10) × 5 = −1050% → floor 0
    expect(calculatePositionValue(10, -200, 1.0)).toBe(0);
  });

  test('nessun doppio conteggio: rendimento applicato una sola volta', () => {
    // Qt.I=20, Qt.A=22 (+2 punti = +10%), mult=1
    // Valore atteso: 20 × 1.10 = 22
    // Valore errato (doppio conteggio): 22 × 1.10 = 24.2
    expect(calculatePositionValue(20, 22, 1.0)).toBeCloseTo(22, 6);
    expect(calculatePositionValue(20, 22, 1.0)).not.toBeCloseTo(24.2, 1);
  });

  test('Qt.I basso: formula non sopravvaluta il giocatore economico', () => {
    // Qt.I=5, Qt.corrente=7: rendimento = (7-5)*5 = +10%
    // Valore atteso: 5 × 1.10 = 5.5 (NON 7)
    expect(calculatePositionValue(5, 7, 1.0)).toBeCloseTo(5.5, 6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Valore portafoglio
// ─────────────────────────────────────────────────────────────────────────────

describe('calculatePortfolioValue', () => {
  test('somma posizioni + budget disponibile', () => {
    expect(calculatePortfolioValue([100, 200, 150], 50)).toBe(500);
  });

  test('nessuna posizione: solo budget', () => {
    expect(calculatePortfolioValue([], 500)).toBe(500);
  });

  test('budget zero: solo valore posizioni', () => {
    expect(calculatePortfolioValue([100, 50], 0)).toBe(150);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROI e soglie
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateROI', () => {
  test('nessun guadagno: ROI = 0%', () => {
    expect(calculateROI(500, 0, 500)).toBe(0);
  });

  test('guadagno 30 crediti su 500 iniziali: ROI = 6%', () => {
    expect(calculateROI(500, 30, 500)).toBe(6);
  });

  test('perdita 10 crediti su 500 iniziali: ROI = -2%', () => {
    expect(calculateROI(490, 0, 500)).toBe(-2);
  });

  test('portafoglio + budget > iniziale: ROI positivo', () => {
    // portafoglio 400, budget 140, iniziale 500 → totalWealth 540 → ROI 8%
    expect(calculateROI(400, 140, 500)).toBe(8);
  });

  test('initialBudget zero: restituisce 0 senza errori', () => {
    expect(calculateROI(500, 0, 0)).toBe(0);
  });
});

describe('calculatePrizeEligibility — soglia 7%', () => {
  test('ROI = 7%: soglia esatta raggiunta', () => {
    expect(calculatePrizeEligibility(7, V1_PRIZE_THRESHOLD)).toBe(true);
  });

  test('ROI = 6.9%: sotto soglia', () => {
    expect(calculatePrizeEligibility(6.9, V1_PRIZE_THRESHOLD)).toBe(false);
  });

  test('ROI = 10%: sopra soglia', () => {
    expect(calculatePrizeEligibility(10, V1_PRIZE_THRESHOLD)).toBe(true);
  });

  test('ROI = 0%: non raggiunge la soglia premio', () => {
    expect(calculatePrizeEligibility(0, V1_PRIZE_THRESHOLD)).toBe(false);
  });

  test('ROI negativo: non raggiunge la soglia', () => {
    expect(calculatePrizeEligibility(-5, V1_PRIZE_THRESHOLD)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Composizione rosa
// ─────────────────────────────────────────────────────────────────────────────

describe('validateRosterComposition — 3P/8D/8C/6A', () => {
  test('rosa valida V1: nessun errore', () => {
    const result = validateRosterComposition({ GK: 3, DEF: 8, MID: 8, FWD: 6 });
    expect(result).toHaveLength(0);
  });

  test('GK in eccesso (4 invece di 3): errore GK', () => {
    const result = validateRosterComposition({ GK: 4, DEF: 8, MID: 8, FWD: 6 });
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('GK');
  });

  test('DEF mancante (7 invece di 8): errore DEF', () => {
    const result = validateRosterComposition({ GK: 3, DEF: 7, MID: 8, FWD: 6 });
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('DEF');
  });

  test('errori multipli: GK e MID non conformi', () => {
    const result = validateRosterComposition({ GK: 2, DEF: 8, MID: 9, FWD: 6 });
    expect(result).toHaveLength(2);
  });

  test('rosa completamente vuota: 4 errori (tutti i ruoli)', () => {
    const result = validateRosterComposition({ GK: 0, DEF: 0, MID: 0, FWD: 0 });
    expect(result).toHaveLength(4);
  });
});

describe('isRosterComplete', () => {
  test('composizione V1 esatta: true', () => {
    expect(isRosterComplete(V1_ROSTER_COMPOSITION)).toBe(true);
  });

  test('GK insufficiente: false', () => {
    expect(isRosterComplete({ GK: 2, DEF: 8, MID: 8, FWD: 6 })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fascia squadra e NoVotePolicy
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateTeamVoteBand — NoVotePolicy PLAYER_ZERO_TEAM_EXCLUDE', () => {
  function makeVotes(playedVote: number, count = 25): Array<{ playerId: number; vote: number | null; played: boolean }> {
    return Array.from({ length: count }, (_, i) => ({
      playerId: i,
      vote: playedVote,
      played: true,
    }));
  }

  test('tutti i voti a 6: media 6 → FASCIA_3', () => {
    const result = calculateTeamVoteBand(makeVotes(6), V1_NO_VOTE_POLICY);
    expect(result.teamBand).toBe('FASCIA_3');
    expect(result.averageVote).toBe(6);
  });

  test('tutti i voti a 6.5: media 6.5 → FASCIA_4', () => {
    const result = calculateTeamVoteBand(makeVotes(6.5), V1_NO_VOTE_POLICY);
    expect(result.teamBand).toBe('FASCIA_4');
  });

  test('tutti i voti a 4.9: media 4.9 → FASCIA_0', () => {
    const result = calculateTeamVoteBand(makeVotes(4.9), V1_NO_VOTE_POLICY);
    expect(result.teamBand).toBe('FASCIA_0');
  });

  test('SV PLAYER_ZERO_TEAM_EXCLUDE: lo SV è escluso dalla media squadra', () => {
    // 24 giocatori con voto 6, 1 SV
    const votes = [
      ...makeVotes(6, 24),
      { playerId: 99, vote: null, played: false },
    ];
    const result = calculateTeamVoteBand(votes, V1_NO_VOTE_POLICY);
    // Media calcolata su 24 giocatori, non su 25
    expect(result.evaluatedCount).toBe(24);
    expect(result.averageVote).toBe(6); // media invariata perché SV è escluso
    expect(result.notEvaluatedCount).toBe(1);
  });

  test('SV policy ZERO abbassa la media (a differenza di PLAYER_ZERO_TEAM_EXCLUDE)', () => {
    // 24 giocatori con voto 6.5, 1 SV → con ZERO il SV conta come 0, abbassa la media
    const votes = [
      ...makeVotes(6.5, 24),
      { playerId: 99, vote: null, played: false },
    ];
    const withZero = calculateTeamVoteBand(votes, { policy: 'ZERO' });
    const withExclude = calculateTeamVoteBand(votes, V1_NO_VOTE_POLICY);
    // Con ZERO: media = (24 × 6.5 + 0) / 25 = 6.24 → sotto FASCIA_4
    // Con PLAYER_ZERO_TEAM_EXCLUDE: media = 24 × 6.5 / 24 = 6.5 → FASCIA_4
    expect(withZero.teamBand).not.toBe('FASCIA_4');
    expect(withExclude.teamBand).toBe('FASCIA_4');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bonus/malus ufficiale
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateFantasyBonusMalus — tabella ufficiale', () => {
  test('FASCIA_3, voto 7: bonus +1.5%', () => {
    expect(calculateFantasyBonusMalus('FASCIA_3', 7)).toBeCloseTo(1.5, 4);
  });

  test('FASCIA_0: bonus generale -2.5% indipendente dal voto', () => {
    expect(calculateFantasyBonusMalus('FASCIA_0', 6)).toBeCloseTo(-2.5, 4);
    expect(calculateFantasyBonusMalus('FASCIA_0', 7)).toBeCloseTo(-2.5, 4);
    expect(calculateFantasyBonusMalus('FASCIA_0', 8)).toBeCloseTo(-2.5, 4);
  });

  test('voto 6 nelle fasce 1-4: bonus neutro (0%)', () => {
    expect(calculateFantasyBonusMalus('FASCIA_1', 6)).toBe(0);
    expect(calculateFantasyBonusMalus('FASCIA_2', 6)).toBe(0);
    expect(calculateFantasyBonusMalus('FASCIA_3', 6)).toBe(0);
    expect(calculateFantasyBonusMalus('FASCIA_4', 6)).toBe(0);
  });

  test('SV (voto null) con PLAYER_ZERO_TEAM_EXCLUDE: effetto 0%', () => {
    expect(calculateFantasyBonusMalus('FASCIA_3', null, V1_NO_VOTE_POLICY)).toBe(0);
    expect(calculateFantasyBonusMalus('FASCIA_4', null, V1_NO_VOTE_POLICY)).toBe(0);
  });

  test('FASCIA_4, voto 8: bonus +3.13%', () => {
    expect(calculateFantasyBonusMalus('FASCIA_4', 8)).toBeCloseTo(3.13, 4);
  });
});

describe('applyBonusToMultiplier', () => {
  test('bonus +1.5% su moltiplicatore 1.0 → 1.015', () => {
    expect(applyBonusToMultiplier(1.0, 1.5)).toBeCloseTo(1.015, 6);
  });

  test('malus -2.5% su moltiplicatore 1.0 → 0.975', () => {
    expect(applyBonusToMultiplier(1.0, -2.5)).toBeCloseTo(0.975, 6);
  });

  test('accumulo giornate: 1.015 × (1 + 0.015) = 1.030225', () => {
    const afterDay1 = applyBonusToMultiplier(1.0, 1.5);
    const afterDay2 = applyBonusToMultiplier(afterDay1, 1.5);
    expect(afterDay2).toBeCloseTo(1.030225, 6);
  });

  test('bonus 0%: moltiplicatore invariato', () => {
    expect(applyBonusToMultiplier(1.015, 0)).toBeCloseTo(1.015, 6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Precisione monetaria
// ─────────────────────────────────────────────────────────────────────────────

describe('Precisione monetaria', () => {
  test('roundTo2: 4.567 → 4.57', () => {
    expect(roundTo2(4.567)).toBe(4.57);
  });

  test('roundTo6: 0.1234567 → 0.123457', () => {
    expect(roundTo6(0.1234567)).toBe(0.123457);
  });

  test('roundTo2 su valore esatto: invariato', () => {
    expect(roundTo2(4.50)).toBe(4.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario integrato: acquisto, bonus, vendita, ROI
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario integrato V1: acquisto + bonus + vendita + ROI', () => {
  test('giocatore con +1 punto quota e +1.5% bonus: valore finale corretto', () => {
    const initialQuote = 20;
    const currentQuote = 21;    // +1 punto
    const bonusPct = 1.5;       // FASCIA_3, voto 7

    // Dopo 1 giornata con bonus +1.5%
    const mult = applyBonusToMultiplier(1.0, bonusPct);     // 1.015
    const value = calculatePositionValue(initialQuote, currentQuote, mult);
    // 20 × 1.015 × (1 + (21-20)×5/100) = 20 × 1.015 × 1.05 = 21.315
    expect(value).toBeCloseTo(21.315, 4);
  });

  test('HOLD puro 38 giornate, nessun cambio: solo commissione vendita finale', () => {
    const initialBudget = 500;
    const buyRate = V1_BUY_COMMISSION_RATE;
    const sellRate = V1_SELL_COMMISSION_RATE;

    // Acquisto per 500 (commissione 2%): costo totale 510
    // Con budget 500, si investe 490.196... al lordo per avere costo 500
    // Ma semplifichiamo: investo 490 lordo → commissione 9.80 → costo 499.80
    const grossBuy = 490;
    const { totalCost } = calculateBuyCost(grossBuy, buyRate); // 499.80
    const budgetAfterBuy = initialBudget - totalCost;          // 0.20

    // A fine stagione vendo a stesso valore (nessuna variazione)
    const { netProceeds } = calculateSellProceeds(grossBuy, sellRate); // 480.20
    const budgetFinal = budgetAfterBuy + netProceeds;                  // 480.40

    const roi = calculateROI(0, budgetFinal, initialBudget);
    // ROI = (480.40 - 500) / 500 × 100 ≈ -3.92%
    expect(roi).toBeLessThan(0);
    expect(calculatePrizeEligibility(roi, V1_PRIZE_THRESHOLD)).toBe(false);
  });
});
