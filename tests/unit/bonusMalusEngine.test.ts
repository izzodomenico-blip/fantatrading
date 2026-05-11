import {
  calculateBonusMalus,
  applyBonusMalusToValue,
  DEFAULT_BONUS_MALUS_RULES,
  BonusMalusRules,
} from '../../src/engine/bonusMalusEngine';
import { createEmptyStats } from '../../src/domain/Player';
import { PlayerStats } from '../../src/domain/Player';

// ─── calculateBonusMalus ─────────────────────────────────────────────────────

describe('calculateBonusMalus — gol', () => {
  test('un gol di un attaccante vale 7', () => {
    const stats: PlayerStats = { ...createEmptyStats(), goals: 1, minutesPlayed: 90 };
    const bm = calculateBonusMalus(stats, 'FWD');
    expect(bm.fromGoals).toBe(7);
  });

  test('un gol di un portiere vale 20', () => {
    const stats: PlayerStats = { ...createEmptyStats(), goals: 1, minutesPlayed: 90 };
    const bm = calculateBonusMalus(stats, 'GK');
    expect(bm.fromGoals).toBe(20);
  });

  test('due gol di un centrocampista = 20', () => {
    const stats: PlayerStats = { ...createEmptyStats(), goals: 2, minutesPlayed: 90 };
    const bm = calculateBonusMalus(stats, 'MID');
    expect(bm.fromGoals).toBe(20);
  });
});

describe('calculateBonusMalus — assist', () => {
  test('un assist vale 5 per tutti i ruoli', () => {
    const stats: PlayerStats = { ...createEmptyStats(), assists: 1, minutesPlayed: 90 };
    expect(calculateBonusMalus(stats, 'FWD').fromAssists).toBe(5);
    expect(calculateBonusMalus(stats, 'DEF').fromAssists).toBe(5);
  });

  test('due assist valgono 10', () => {
    const stats: PlayerStats = { ...createEmptyStats(), assists: 2, minutesPlayed: 90 };
    expect(calculateBonusMalus(stats, 'MID').fromAssists).toBe(10);
  });
});

describe('calculateBonusMalus — cartellini', () => {
  test('cartellino giallo è -2', () => {
    const stats: PlayerStats = { ...createEmptyStats(), yellowCards: 1, minutesPlayed: 90 };
    expect(calculateBonusMalus(stats, 'DEF').fromYellowCards).toBe(-2);
  });

  test('cartellino rosso è -10', () => {
    const stats: PlayerStats = { ...createEmptyStats(), redCards: 1, minutesPlayed: 90 };
    expect(calculateBonusMalus(stats, 'FWD').fromRedCards).toBe(-10);
  });

  test('giallo e rosso insieme = -12', () => {
    const stats: PlayerStats = { ...createEmptyStats(), yellowCards: 1, redCards: 1, minutesPlayed: 90 };
    const bm = calculateBonusMalus(stats, 'MID');
    expect(bm.fromYellowCards + bm.fromRedCards).toBe(-12);
  });
});

describe('calculateBonusMalus — clean sheet', () => {
  test('clean sheet per portiere vale 10', () => {
    const stats: PlayerStats = { ...createEmptyStats(), cleanSheet: true, minutesPlayed: 90 };
    expect(calculateBonusMalus(stats, 'GK').fromCleanSheet).toBe(10);
  });

  test('clean sheet per attaccante vale 0', () => {
    const stats: PlayerStats = { ...createEmptyStats(), cleanSheet: true, minutesPlayed: 90 };
    expect(calculateBonusMalus(stats, 'FWD').fromCleanSheet).toBe(0);
  });

  test('senza clean sheet il bonus è 0', () => {
    const stats: PlayerStats = { ...createEmptyStats(), cleanSheet: false, minutesPlayed: 90 };
    expect(calculateBonusMalus(stats, 'GK').fromCleanSheet).toBe(0);
  });
});

describe('calculateBonusMalus — minuti giocati', () => {
  test('malus per non aver giocato se minuti < soglia', () => {
    const stats: PlayerStats = { ...createEmptyStats(), minutesPlayed: 30 };
    expect(calculateBonusMalus(stats, 'MID').fromNoPlay).toBe(-3);
  });

  test('nessun malus se minuti >= soglia', () => {
    const stats: PlayerStats = { ...createEmptyStats(), minutesPlayed: 60 };
    expect(calculateBonusMalus(stats, 'MID').fromNoPlay).toBe(0);
  });

  test('nessun malus per noPlay se minuti = 0 ma soglia ridefinita a 0', () => {
    const customRules: BonusMalusRules = { ...DEFAULT_BONUS_MALUS_RULES, minuteThreshold: 0 };
    const stats: PlayerStats = { ...createEmptyStats(), minutesPlayed: 0 };
    expect(calculateBonusMalus(stats, 'FWD', customRules).fromNoPlay).toBe(0);
  });
});

describe('calculateBonusMalus — totale', () => {
  test('partita perfetta: gol + assist + clean sheet = somma corretta per DEF', () => {
    const stats: PlayerStats = {
      ...createEmptyStats(),
      goals: 1,
      assists: 1,
      cleanSheet: true,
      minutesPlayed: 90,
    };
    const bm = calculateBonusMalus(stats, 'DEF');
    // goalBonus DEF=15, assist=5, cleanSheet DEF=7
    expect(bm.fromGoals).toBe(15);
    expect(bm.fromAssists).toBe(5);
    expect(bm.fromCleanSheet).toBe(7);
    expect(bm.total).toBe(bm.fromGoals + bm.fromAssists + bm.fromCleanSheet + bm.fromRating + bm.fromNoPlay + bm.fromYellowCards + bm.fromRedCards);
  });
});

// ─── applyBonusMalusToValue ──────────────────────────────────────────────────

describe('applyBonusMalusToValue', () => {
  test('aggiunge bonus al valore corrente', () => {
    expect(applyBonusMalusToValue(20, 5)).toBe(25);
  });

  test('applica malus senza scendere sotto il minimo', () => {
    expect(applyBonusMalusToValue(3, -10, 1)).toBe(1);
  });

  test('non scende mai sotto playerMinValue', () => {
    expect(applyBonusMalusToValue(1, -100, 1)).toBe(1);
  });

  test('non supera playerMaxValue', () => {
    expect(applyBonusMalusToValue(95, 100, 1, 100)).toBe(100);
  });

  test('valore neutro (bonusMalus=0) lascia invariato', () => {
    expect(applyBonusMalusToValue(50, 0)).toBe(50);
  });
});
