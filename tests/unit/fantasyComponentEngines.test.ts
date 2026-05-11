import { analyzeRealVotes, buildVotesQualityMarkdown } from '../../src/analysis/realVotesAnalysis';
import { getBonusMalusPct } from '../../src/engine/fantaTradingBonusTableEngine';
import { calculateTeamVoteBand, getTeamVoteBand, TeamVoteInput } from '../../src/engine/teamVoteBandEngine';

function makeVotes(vote: number, count = 25): TeamVoteInput[] {
  return Array.from({ length: count }, (_, i) => ({ playerId: i + 1, vote, played: true }));
}

describe('teamVoteBandEngine', () => {
  test('somma voti rosa da 25 giocatori', () => {
    const result = calculateTeamVoteBand(makeVotes(6));
    expect(result.totalVoteSum).toBe(150);
    expect(result.averageVote).toBe(6);
    expect(result.playedCount).toBe(25);
    expect(result.teamBand).toBe('FASCIA_3');
  });

  test.each([
    [4.99, 'FASCIA_0'],
    [5.0, 'FASCIA_1'],
    [5.49, 'FASCIA_1'],
    [5.5, 'FASCIA_2'],
    [5.99, 'FASCIA_2'],
    [6.0, 'FASCIA_3'],
    [6.49, 'FASCIA_3'],
    [6.5, 'FASCIA_4'],
  ] as const)('boundary fascia media %s -> %s', (average, expected) => {
    expect(getTeamVoteBand(average)).toBe(expected);
  });

  test('played=false contribuisce zero alla somma voti', () => {
    const votes = makeVotes(6);
    votes[0] = { playerId: 1, vote: null, played: false };
    const result = calculateTeamVoteBand(votes);
    expect(result.totalVoteSum).toBe(144);
    expect(result.playedCount).toBe(24);
  });
});

describe('fantaTradingBonusTableEngine', () => {
  test('restituisce bonus/malus per voto individuale e fascia', () => {
    const result = getBonusMalusPct('FASCIA_4', 7);
    expect(result.bonusMalusPct).toBeGreaterThan(0);
    expect(result.usedFallback).toBe(false);
  });

  test('usa fallback se il voto non e presente esattamente in tabella', () => {
    const result = getBonusMalusPct('FASCIA_3', 6.25);
    expect(result.usedFallback).toBe(true);
    expect(result.matchedIndividualVote).toBe(6);
  });
});

describe('realVotesAnalysis', () => {
  test('nessun dato reale disponibile genera report chiaro', () => {
    const report = analyzeRealVotes([]);
    const markdown = buildVotesQualityMarkdown(report);
    expect(report.status).toBe('missing_data');
    expect(markdown).toContain('Nessun dato reale voti');
    expect(markdown).not.toContain('TypeError');
  });
});
