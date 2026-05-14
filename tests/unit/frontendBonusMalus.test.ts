import {
  calculateTeamBandLabel,
  getOfficialBonusMalusPct,
  type TeamBand,
} from '../../app/web/src/utils/bonusMalusTable';
import {
  computeRosterVoteStats,
  statusLabel,
} from '../../app/web/src/utils/rosterVoteStats';
import type { DemoPosition } from '../../app/web/src/mock/favcDemoData';
import type { PlayerTrendPoint } from '../../app/web/src/utils/playerTrend';

function point(round: number, overrides: Partial<PlayerTrendPoint> = {}): PlayerTrendPoint {
  return {
    round,
    quote: 10,
    quoteChange: 0,
    fantaTradingReturnPct: 0,
    estimatedValue: 10,
    vote: 6,
    fantasyVote: 6,
    isSv: false,
    fantasyBonusPct: 0,
    source: 'synthetic',
    ...overrides,
  };
}

describe('frontend bonusMalusTable', () => {
  it('matches official ranges from regolamento', () => {
    expect(calculateTeamBandLabel(null)).toBe<TeamBand>('FASCIA_0');
    expect(calculateTeamBandLabel(4.99)).toBe<TeamBand>('FASCIA_0');
    expect(calculateTeamBandLabel(5)).toBe<TeamBand>('FASCIA_1');
    expect(calculateTeamBandLabel(5.49)).toBe<TeamBand>('FASCIA_1');
    expect(calculateTeamBandLabel(5.5)).toBe<TeamBand>('FASCIA_2');
    expect(calculateTeamBandLabel(5.99)).toBe<TeamBand>('FASCIA_2');
    expect(calculateTeamBandLabel(6)).toBe<TeamBand>('FASCIA_3');
    expect(calculateTeamBandLabel(6.18)).toBe<TeamBand>('FASCIA_3'); // example from user spec
    expect(calculateTeamBandLabel(6.49)).toBe<TeamBand>('FASCIA_3');
    expect(calculateTeamBandLabel(6.5)).toBe<TeamBand>('FASCIA_4');
    expect(calculateTeamBandLabel(8.4)).toBe<TeamBand>('FASCIA_4');
  });

  it('returns +1.50% for voto 7 in Fascia 3 (esempio regolamento)', () => {
    expect(getOfficialBonusMalusPct('FASCIA_3', 7)).toBe(1.5);
  });

  it('treats voto 6 as neutro nelle fasce 1-4', () => {
    expect(getOfficialBonusMalusPct('FASCIA_1', 6)).toBe(0);
    expect(getOfficialBonusMalusPct('FASCIA_2', 6)).toBe(0);
    expect(getOfficialBonusMalusPct('FASCIA_3', 6)).toBe(0);
    expect(getOfficialBonusMalusPct('FASCIA_4', 6)).toBe(0);
  });

  it('applies generic -2.5% malus in Fascia 0 indipendentemente dal voto', () => {
    expect(getOfficialBonusMalusPct('FASCIA_0', 5)).toBe(-2.5);
    expect(getOfficialBonusMalusPct('FASCIA_0', 7)).toBe(-2.5);
    expect(getOfficialBonusMalusPct('FASCIA_0', 9)).toBe(-2.5);
  });

  it('returns 0% for SV regardless of band', () => {
    expect(getOfficialBonusMalusPct('FASCIA_4', 7, true)).toBe(0);
    expect(getOfficialBonusMalusPct('FASCIA_0', 5, true)).toBe(0);
  });

  it('returns 0 when vote is null (no data)', () => {
    expect(getOfficialBonusMalusPct('FASCIA_3', null)).toBe(0);
  });

  it('uses closest-tabular vote when fractional values appear', () => {
    // voto 7.2 closest to 7 -> Fascia 3 +1.50
    expect(getOfficialBonusMalusPct('FASCIA_3', 7.2)).toBe(1.5);
    // voto 7.4 closest to 7.5 -> Fascia 3 +2.00
    expect(getOfficialBonusMalusPct('FASCIA_3', 7.4)).toBe(2);
  });
});

describe('rosterVoteStats', () => {
  function makePosition(trend: PlayerTrendPoint[]): DemoPosition {
    return {
      id: 'p',
      playerName: 'Giocatore',
      realTeam: 'Inter',
      role: 'C',
      initialQuote: 10,
      currentQuote: 10,
      fantasyMultiplier: 1,
      status: 'ACTIVE',
      trend,
    };
  }

  it('computes media voto escludendo SV', () => {
    const stats = computeRosterVoteStats(makePosition([
      point(1, { vote: 6, isSv: false }),
      point(2, { vote: 7, isSv: false }),
      point(3, { vote: null, isSv: true }),
      point(4, { vote: null, isSv: true }),
    ]));
    expect(stats.avgVote).toBe(6.5); // (6+7)/2
    expect(stats.presences).toBe(2);
    expect(stats.sv).toBe(2);
  });

  it('reports miglior e peggior voto solo tra le presenze', () => {
    const stats = computeRosterVoteStats(makePosition([
      point(1, { vote: 5 }),
      point(2, { vote: 8 }),
      point(3, { vote: null, isSv: true }),
      point(4, { vote: 6.5 }),
    ]));
    expect(stats.bestVote).toBe(8);
    expect(stats.worstVote).toBe(5);
  });

  it('flagga stato rischio_sv quando ci sono 3 o piu SV nelle ultime 5', () => {
    const stats = computeRosterVoteStats(makePosition([
      point(1, { vote: 6 }),
      point(2, { vote: null, isSv: true }),
      point(3, { vote: null, isSv: true }),
      point(4, { vote: null, isSv: true }),
      point(5, { vote: 6 }),
    ]));
    expect(stats.status).toBe('rischio_sv');
  });

  it('flagga stato in_forma quando media ultime 5 >= 6.5', () => {
    const stats = computeRosterVoteStats(makePosition([
      point(1, { vote: 7 }),
      point(2, { vote: 7 }),
      point(3, { vote: 6.5 }),
      point(4, { vote: 7 }),
      point(5, { vote: 7 }),
    ]));
    expect(stats.status).toBe('in_forma');
  });

  it('flagga stato in_calo quando media ultime 5 < 5.5', () => {
    const stats = computeRosterVoteStats(makePosition([
      point(1, { vote: 5 }),
      point(2, { vote: 5 }),
      point(3, { vote: 5 }),
      point(4, { vote: 5 }),
      point(5, { vote: 5 }),
    ]));
    expect(stats.status).toBe('in_calo');
  });

  it('returns SV count = 0 when nessun SV', () => {
    const stats = computeRosterVoteStats(makePosition([
      point(1, { vote: 6 }),
      point(2, { vote: 6 }),
    ]));
    expect(stats.sv).toBe(0);
  });

  it('returns null when no plays', () => {
    const stats = computeRosterVoteStats(makePosition([
      point(1, { vote: null, isSv: true }),
      point(2, { vote: null, isSv: true }),
    ]));
    expect(stats.avgVote).toBeNull();
    expect(stats.bestVote).toBeNull();
    expect(stats.worstVote).toBeNull();
  });

  it('returns readable italian labels', () => {
    expect(statusLabel('in_forma')).toBe('in forma');
    expect(statusLabel('in_calo')).toBe('in calo');
    expect(statusLabel('rischio_sv')).toBe('rischio SV');
    expect(statusLabel('stabile')).toBe('stabile');
  });
});
