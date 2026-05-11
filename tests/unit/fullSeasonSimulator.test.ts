import {
  runScenarioMonteCarlo,
  FullSeasonConfig,
  DEFAULT_FULL_SEASON_CONFIG,
} from '../../src/services/fullSeasonSimulator';
import { DEFAULT_RULES } from '../../src/config/defaultRules';
import { DEFAULT_PRIZE_TABLE, SMALL_LEAGUE_PRIZE_TABLE } from '../../src/config/prizeTables';
import { MockPlayer } from '../../src/services/dataLoader';

/** Dataset minimo riproducibile per i test */
function makePlayers(n: number): MockPlayer[] {
  const roles: MockPlayer['role'][] = ['GK', 'DEF', 'MID', 'FWD'];
  return Array.from({ length: n }, (_, i) => ({
    id: `tp${i}`,
    name: `Player ${i}`,
    role: roles[i % 4],
    club: 'TestFC',
    baseValue: 10 + (i % 10) * 3,
  }));
}

const SMALL_CONFIG: FullSeasonConfig = {
  numTeams: 4,
  numSimulations: 10,
  operationsPerTeamPerRound: 2,
  registrationFeePerTeam: 50,
  rules: { ...DEFAULT_RULES, roundsPerSeason: 5 }, // stagione corta per test rapidi
  prizeTable: SMALL_LEAGUE_PRIZE_TABLE,
  randomSeed: 42,
};

// Config con margine esplicito per testare la sostenibilità economica dell'organizzatore
const SMALL_CONFIG_WITH_MARGIN: FullSeasonConfig = {
  ...SMALL_CONFIG,
  rules: { ...DEFAULT_RULES, platformFeeRate: 0.20, prizePoolContributionRate: 0.80, roundsPerSeason: 5 },
};

describe('runScenarioMonteCarlo — struttura risultati', () => {
  let stats: ReturnType<typeof runScenarioMonteCarlo>;
  beforeAll(() => {
    stats = runScenarioMonteCarlo(SMALL_CONFIG, makePlayers(20));
  });

  test('ritorna il numero corretto di run', () => {
    expect(stats.numRuns).toBe(SMALL_CONFIG.numSimulations);
  });

  test('avgPlayerBaseValue corrisponde al dataset', () => {
    const players = makePlayers(20);
    const expected = players.reduce((s, p) => s + p.baseValue, 0) / players.length;
    expect(stats.avgPlayerBaseValue).toBeCloseTo(expected);
  });

  test('avgPrizePool è positivo', () => {
    expect(stats.avgPrizePool).toBeGreaterThan(0);
  });

  test('avgPlatformRevenue è zero con regolamento originale (platform=0%)', () => {
    // M1: tutto al montepremi, nessun margine piattaforma
    expect(stats.avgPlatformRevenue).toBe(0);
  });

  test('isSustainableForOrganizer è true con margine esplicito', () => {
    const s = runScenarioMonteCarlo(SMALL_CONFIG_WITH_MARGIN, makePlayers(20));
    expect(s.isSustainableForOrganizer).toBe(true);
  });

  test('minPrizePool <= avgPrizePool <= maxPrizePool', () => {
    expect(stats.minPrizePool).toBeLessThanOrEqual(stats.avgPrizePool);
    expect(stats.avgPrizePool).toBeLessThanOrEqual(stats.maxPrizePool);
  });

  test('avgFirstPrize >= avgSecondPrize >= avgThirdPrize', () => {
    expect(stats.avgFirstPrize).toBeGreaterThanOrEqual(stats.avgSecondPrize);
    expect(stats.avgSecondPrize).toBeGreaterThanOrEqual(stats.avgThirdPrize);
  });

  test('pctAbove0 è compreso tra 0 e 100', () => {
    expect(stats.pctAbove0).toBeGreaterThanOrEqual(0);
    expect(stats.pctAbove0).toBeLessThanOrEqual(100);
  });

  test('pctAbove5 <= pctAbove0', () => {
    expect(stats.pctAbove5).toBeLessThanOrEqual(stats.pctAbove0);
  });

  test('avgOperationsPerTeamSeason è positivo', () => {
    expect(stats.avgOperationsPerTeamSeason).toBeGreaterThan(0);
  });

  test('avgOrganizerMarginPct ≈ platformFeeRate * 100 con margine esplicito', () => {
    const s = runScenarioMonteCarlo(SMALL_CONFIG_WITH_MARGIN, makePlayers(20));
    // Con platformFeeRate=0.20, il margine organizzatore è ~20% del lordo incassato
    expect(s.avgOrganizerMarginPct).toBeCloseTo(20, 0);
  });
});

describe('runScenarioMonteCarlo — economics', () => {
  test('più squadre → montepremi più grande (proporzionale)', () => {
    const small = runScenarioMonteCarlo(
      { ...SMALL_CONFIG, numTeams: 4, numSimulations: 5 },
      makePlayers(20),
    );
    const large = runScenarioMonteCarlo(
      { ...SMALL_CONFIG, numTeams: 16, numSimulations: 5 },
      makePlayers(20),
    );
    // Con 4x le squadre, il montepremi dovrebbe essere ~4x (tolleranza ampia per la casualità)
    expect(large.avgPrizePool).toBeGreaterThan(small.avgPrizePool * 2);
  });

  test('commissioni più alte → montepremi più grande', () => {
    const lowComm = runScenarioMonteCarlo(
      { ...SMALL_CONFIG, rules: { ...DEFAULT_RULES, buyCommissionRate: 0.05, sellCommissionRate: 0.05, roundsPerSeason: 5 } },
      makePlayers(20),
    );
    const highComm = runScenarioMonteCarlo(
      { ...SMALL_CONFIG, rules: { ...DEFAULT_RULES, buyCommissionRate: 0.15, sellCommissionRate: 0.15, roundsPerSeason: 5 } },
      makePlayers(20),
    );
    expect(highComm.avgPrizePool).toBeGreaterThan(lowComm.avgPrizePool);
  });

  test('seed deterministico: due run identiche producono lo stesso risultato', () => {
    const r1 = runScenarioMonteCarlo({ ...SMALL_CONFIG, randomSeed: 999 }, makePlayers(20));
    const r2 = runScenarioMonteCarlo({ ...SMALL_CONFIG, randomSeed: 999 }, makePlayers(20));
    expect(r1.avgPrizePool).toBeCloseTo(r2.avgPrizePool, 10);
    expect(r1.avgPlatformRevenue).toBeCloseTo(r2.avgPlatformRevenue, 10);
  });

  test('seed diversi producono risultati diversi', () => {
    const r1 = runScenarioMonteCarlo({ ...SMALL_CONFIG, randomSeed: 1 }, makePlayers(20));
    const r2 = runScenarioMonteCarlo({ ...SMALL_CONFIG, randomSeed: 9999 }, makePlayers(20));
    // I valori medi dovrebbero essere simili ma non identici
    expect(r1.avgPrizePool).not.toBe(r2.avgPrizePool);
  });

  test('la maggioranza dei partecipanti non recupera la quota (pctAbove0 < 50%)', () => {
    // Con solo 3 premi su 10 partecipanti, il 70% non recupera la quota d'iscrizione.
    // Nota: l'avgParticipantROI può essere > 0 perché il montepremi è finanziato anche
    // dalle commissioni sul budget iniziale (500 crediti), che eccede la sola quota d'iscrizione (50).
    const config: FullSeasonConfig = {
      ...SMALL_CONFIG,
      numTeams: 10,
      numSimulations: 20,
      prizeTable: SMALL_LEAGUE_PRIZE_TABLE, // solo 3 premi su 10
    };
    const r = runScenarioMonteCarlo(config, makePlayers(20));
    expect(r.pctAbove0).toBeLessThan(50); // <30% dei partecipanti recupera la quota
  });
});

describe('runScenarioMonteCarlo — split corretto prizePool/platform', () => {
  test('con split 80/20 il rapporto prizePool/platformRevenue ≈ 4', () => {
    // Verifica che lo split sia applicato correttamente con margine esplicito
    const config: FullSeasonConfig = { ...SMALL_CONFIG_WITH_MARGIN, numSimulations: 1, randomSeed: 42 };
    const stats = runScenarioMonteCarlo(config, makePlayers(20));
    // prizePool = 0.80 * (commissions + regFees) → prizePool/platformRevenue = 0.80/0.20 = 4
    const ratio = stats.avgPrizePool / stats.avgPlatformRevenue;
    expect(ratio).toBeCloseTo(4, 0);
  });

  test('con regolamento originale (platform=0%) tutto il flusso va al montepremi', () => {
    const config: FullSeasonConfig = { ...SMALL_CONFIG, numSimulations: 1, randomSeed: 42 };
    const stats = runScenarioMonteCarlo(config, makePlayers(20));
    expect(stats.avgPlatformRevenue).toBe(0);
    expect(stats.avgPrizePool).toBeGreaterThan(0);
  });
});
