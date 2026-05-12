import { calculateRanking, calculateRankingByROI, getTopN, getRankingByTeamId } from '../../src/engine/rankingEngine';
import { createTeam } from '../../src/domain/Team';
import { createPortfolio, addShares } from '../../src/domain/Portfolio';
import { createPlayer } from '../../src/domain/Player';
import { PrizeAward } from '../../src/engine/prizePoolEngine';

const playerA = createPlayer({ id: 'pA', name: 'Calciatore A', role: 'FWD', clubTeam: 'Club', baseValue: 30, currentValue: 30 });
const playerB = createPlayer({ id: 'pB', name: 'Calciatore B', role: 'DEF', clubTeam: 'Club', baseValue: 10, currentValue: 10 });

function buildTeams() {
  const t1 = createTeam('t1', 'Alfa', 'Owner1', 400);
  const t2 = createTeam('t2', 'Beta', 'Owner2', 200);
  const t3 = createTeam('t3', 'Gamma', 'Owner3', 300);

  const p1 = addShares(createPortfolio('t1'), playerA, 2, 30); // 2*30=60 → wealth=460
  const p2 = addShares(createPortfolio('t2'), playerB, 5, 10); // 5*10=50 → wealth=250
  const p3 = createPortfolio('t3');                             // wealth=300

  const portfolios = new Map([['t1', p1], ['t2', p2], ['t3', p3]]);
  return { teams: [t1, t2, t3], portfolios };
}

describe('calculateRanking', () => {
  test('ordina per ricchezza totale decrescente', () => {
    const { teams, portfolios } = buildTeams();
    const ranking = calculateRanking(teams, portfolios);
    expect(ranking[0].teamId).toBe('t1'); // 460
    expect(ranking[1].teamId).toBe('t3'); // 300
    expect(ranking[2].teamId).toBe('t2'); // 250
  });

  test('rank parte da 1', () => {
    const { teams, portfolios } = buildTeams();
    const ranking = calculateRanking(teams, portfolios);
    expect(ranking.map(e => e.rank)).toEqual([1, 2, 3]);
  });

  test('totalWealth = portfolioValue + budget', () => {
    const { teams, portfolios } = buildTeams();
    const ranking = calculateRanking(teams, portfolios);
    const first = ranking[0];
    expect(first.totalWealth).toBe(first.portfolioValue + first.budget);
  });

  test('assegna premi ai rank corretti', () => {
    const { teams, portfolios } = buildTeams();
    const prizes: PrizeAward[] = [
      { rank: 1, label: '1° posto', amount: 500 },
      { rank: 2, label: '2° posto', amount: 200 },
    ];
    const ranking = calculateRanking(teams, portfolios, prizes);
    expect(ranking[0].prize).toBe(500);
    expect(ranking[1].prize).toBe(200);
    expect(ranking[2].prize).toBe(0);
  });

  test('portfolio assente non causa crash', () => {
    const team = createTeam('t9', 'Solo', 'Owner', 100);
    const portfolios = new Map<string, ReturnType<typeof createPortfolio>>();
    const ranking = calculateRanking([team], portfolios);
    expect(ranking[0].portfolioValue).toBe(0);
    expect(ranking[0].totalWealth).toBe(100);
  });
});

describe('getTopN', () => {
  test('restituisce solo i primi N classificati', () => {
    const { teams, portfolios } = buildTeams();
    const ranking = calculateRanking(teams, portfolios);
    expect(getTopN(ranking, 2).length).toBe(2);
    expect(getTopN(ranking, 2).every(e => e.rank <= 2)).toBe(true);
  });
});

describe('getRankingByTeamId', () => {
  test('trova la squadra per id', () => {
    const { teams, portfolios } = buildTeams();
    const ranking = calculateRanking(teams, portfolios);
    const entry = getRankingByTeamId(ranking, 't2');
    expect(entry).toBeDefined();
    expect(entry?.teamName).toBe('Beta');
  });

  test('restituisce undefined per id inesistente', () => {
    const { teams, portfolios } = buildTeams();
    const ranking = calculateRanking(teams, portfolios);
    expect(getRankingByTeamId(ranking, 'zzz')).toBeUndefined();
  });
});

// ─── FREE_ACCESS_VARIABLE_CAPITAL — calculateRankingByROI ────────────────────

describe('calculateRankingByROI — modello FAVC', () => {
  // Alice: ha investito 150, ora ha budget=80 e portfolio=100 → totalWealth=180, ROI=20%
  // Bob:   ha investito 600, ora ha budget=300 e portfolio=360 → totalWealth=660, ROI=10%
  // Classifica per ricchezza: Bob (660) > Alice (180)  ← criterio sbagliato per FAVC
  // Classifica per ROI%:      Alice (20%) > Bob (10%)  ← criterio corretto FAVC

  const pA = createPlayer({ id: 'pFavc1', name: 'Player FAVC1', role: 'FWD', clubTeam: 'Club', baseValue: 100, currentValue: 100 });
  const pB = createPlayer({ id: 'pFavc2', name: 'Player FAVC2', role: 'DEF', clubTeam: 'Club', baseValue: 360, currentValue: 360 });

  function buildFavcTeams() {
    const alice = createTeam('alice', 'AliceFC', 'Alice', 80);
    const bob   = createTeam('bob',   'BobFC',   'Bob',   300);
    const portA = addShares(createPortfolio('alice'), pA, 1, 100); // value=100
    const portB = addShares(createPortfolio('bob'),   pB, 1, 360); // value=360
    const portfolios = new Map([['alice', portA], ['bob', portB]]);
    const capitals = [
      { teamId: 'alice', totalCapitalDeposited: 150 },
      { teamId: 'bob',   totalCapitalDeposited: 600 },
    ];
    return { teams: [alice, bob], portfolios, capitals };
  }

  test('Alice (150→180, ROI=20%) batte Bob (600→660, ROI=10%) con ranking ROI%', () => {
    const { teams, portfolios, capitals } = buildFavcTeams();
    const ranking = calculateRankingByROI(teams, portfolios, capitals);
    expect(ranking[0].teamId).toBe('alice');
    expect(ranking[1].teamId).toBe('bob');
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].rank).toBe(2);
  });

  test('ROI% calcolato correttamente per ogni squadra', () => {
    const { teams, portfolios, capitals } = buildFavcTeams();
    const ranking = calculateRankingByROI(teams, portfolios, capitals);
    const alice = ranking.find(r => r.teamId === 'alice')!;
    const bob   = ranking.find(r => r.teamId === 'bob')!;
    expect(alice.roiPct).toBeCloseTo(20, 4); // (80+100-150)/150 * 100
    expect(bob.roiPct).toBeCloseTo(10, 4);   // (300+360-600)/600 * 100
  });

  test('ricchezza assoluta non è il criterio principale', () => {
    const { teams, portfolios, capitals } = buildFavcTeams();
    const ranking = calculateRankingByROI(teams, portfolios, capitals);
    // Bob ha ricchezza assoluta maggiore (660 > 180) ma ROI minore
    const bob = ranking.find(r => r.teamId === 'bob')!;
    expect(bob.totalWealth).toBeGreaterThan(ranking.find(r => r.teamId === 'alice')!.totalWealth);
    expect(bob.rank).toBe(2); // ma è secondo perché ROI è inferiore
  });

  test('capitalToDeposited mancante in inputs → usa budget corrente come fallback', () => {
    const { teams, portfolios } = buildFavcTeams();
    // Nessun capitalInput: per ogni team usa team.budget come totalCapitalDeposited
    const ranking = calculateRankingByROI(teams, portfolios, []);
    expect(ranking).toHaveLength(2);
    // ROI(alice) = (80+100-80)/80 * 100 = 125%
    // ROI(bob)   = (300+360-300)/300 * 100 = 120%
    expect(ranking[0].teamId).toBe('alice');
  });

  test('totalWealth disponibile come metrica informativa', () => {
    const { teams, portfolios, capitals } = buildFavcTeams();
    const ranking = calculateRankingByROI(teams, portfolios, capitals);
    for (const entry of ranking) {
      expect(entry.totalWealth).toBe(entry.portfolioValue + entry.budget);
    }
  });

  test('assegna premi ai rank ROI corretti', () => {
    const { teams, portfolios, capitals } = buildFavcTeams();
    const prizes = [{ rank: 1, label: '1° posto', amount: 300 }];
    const ranking = calculateRankingByROI(teams, portfolios, capitals, prizes);
    const alice = ranking.find(r => r.teamId === 'alice')!;
    expect(alice.prize).toBe(300);
    expect(ranking.find(r => r.teamId === 'bob')!.prize).toBe(0);
  });
});
