import { calculateRanking, getTopN, getRankingByTeamId } from '../../src/engine/rankingEngine';
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
