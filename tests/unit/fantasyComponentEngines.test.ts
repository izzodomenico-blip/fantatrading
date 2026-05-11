import { analyzeRealVotes, buildVotesQualityMarkdown } from '../../src/analysis/realVotesAnalysis';
import { DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG } from '../../src/config/teamBandBonusTables';
import { getBonusMalusPct, getNoVoteBonusMalusPct } from '../../src/engine/fantaTradingBonusTableEngine';
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

  test('SV con policy ZERO vale 0 nella somma squadra', () => {
    const votes = makeVotes(6);
    votes[0] = { playerId: 1, vote: null, played: false };
    const result = calculateTeamVoteBand(votes, { policy: 'ZERO' });
    expect(result.totalVoteSum).toBe(144);
    expect(result.averageVote).toBeCloseTo(144 / 25, 5);
    expect(result.notEvaluatedCount).toBe(1);
  });

  test('SV con policy FIVE vale 5 nella somma squadra', () => {
    const votes = makeVotes(6);
    votes[0] = { playerId: 1, vote: null, played: false };
    const result = calculateTeamVoteBand(votes, { policy: 'FIVE' });
    expect(result.totalVoteSum).toBe(149);
    expect(result.averageVote).toBeCloseTo(149 / 25, 5);
  });

  test('SV con policy EXCLUDE escluso dalla media', () => {
    const votes = makeVotes(6);
    votes[0] = { playerId: 1, vote: null, played: false };
    const result = calculateTeamVoteBand(votes, { policy: 'EXCLUDE' });
    expect(result.totalVoteSum).toBe(144);
    expect(result.evaluatedCount).toBe(24);
    expect(result.averageVote).toBe(6);
  });

  test('SV con policy FIXED_MALUS non contribuisce alla somma ma conserva malus configurabile', () => {
    const votes = makeVotes(6);
    votes[0] = { playerId: 1, vote: null, played: false };
    const result = calculateTeamVoteBand(votes, { policy: 'FIXED_MALUS', fixedMalusPct: -7 });
    expect(result.totalVoteSum).toBe(144);
    expect(result.fixedNoVoteMalusPct).toBe(-7);
    expect(getNoVoteBonusMalusPct({ policy: 'FIXED_MALUS', fixedMalusPct: -7 })).toBe(-7);
  });
});

describe('fantaTradingBonusTableEngine', () => {
  test('tabella bonus/malus ufficiale FantaTrading', () => {
    expect(DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG.isOfficial).toBe(true);
    expect(DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG.source).toBe('Regolamento FantaTrading originale');
  });

  test('restituisce bonus/malus per voto individuale e fascia', () => {
    const result = getBonusMalusPct('FASCIA_4', 7);
    expect(result.bonusMalusPct).toBeGreaterThan(0);
    expect(result.usedFallback).toBe(false);
  });

  test('bonus/malus voto 7 in fascia 3', () => {
    const result = getBonusMalusPct('FASCIA_3', 7);
    expect(result.bonusMalusPct).toBe(1.5);
    expect(result.handling).toBe('EXACT');
  });

  test('bonus/malus voto 5 in fascia 2', () => {
    const result = getBonusMalusPct('FASCIA_2', 5);
    expect(result.bonusMalusPct).toBe(-1.13);
  });

  test('valori ufficiali specifici', () => {
    expect(getBonusMalusPct('FASCIA_1', 7).bonusMalusPct).toBe(0.75);
    expect(getBonusMalusPct('FASCIA_2', 5).bonusMalusPct).toBe(-1.13);
    expect(getBonusMalusPct('FASCIA_3', 7).bonusMalusPct).toBe(1.5);
    expect(getBonusMalusPct('FASCIA_4', 8.5).bonusMalusPct).toBe(3.75);
    expect(getBonusMalusPct('FASCIA_0', 7).bonusMalusPct).toBe(-2.5);
  });

  test.each(['FASCIA_1', 'FASCIA_2', 'FASCIA_3', 'FASCIA_4'] as const)(
    'voto 6 sempre neutro in %s',
    (band) => {
      expect(getBonusMalusPct(band, 6).bonusMalusPct).toBe(0);
    },
  );

  test('FASCIA_0 applica -2.50 a tutti i voti tabellari', () => {
    expect(getBonusMalusPct('FASCIA_0', 3).bonusMalusPct).toBe(-2.5);
    expect(getBonusMalusPct('FASCIA_0', 6).bonusMalusPct).toBe(-2.5);
    expect(getBonusMalusPct('FASCIA_0', 9).bonusMalusPct).toBe(-2.5);
  });

  test('usa fallback se il voto non e presente esattamente in tabella', () => {
    const result = getBonusMalusPct('FASCIA_3', 6.25);
    expect(result.usedFallback).toBe(true);
    expect(result.matchedIndividualVote).toBe(6);
    expect(result.handling).toBe('ROUND_TO_NEAREST');
  });

  test('voti fuori range sono gestiti con clamp controllato', () => {
    const low = getBonusMalusPct('FASCIA_3', 2);
    const high = getBonusMalusPct('FASCIA_3', 10);
    expect(low.outOfRange).toBe(true);
    expect(low.matchedIndividualVote).toBe(3);
    expect(high.outOfRange).toBe(true);
    expect(high.matchedIndividualVote).toBe(9);
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
