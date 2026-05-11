import * as fs from 'fs';
import * as path from 'path';
import { normalizeVoteRow, parseCsv } from '../../src/importers/realVotesImporter';
import { validateVoteHeaders, validateVoteRows } from '../../src/importers/realVotesValidator';

describe('realVotesImporter', () => {
  test('parsa il template voti', () => {
    const templatePath = path.resolve(__dirname, '../../data/templates/votes_template.csv');
    const rows = parseCsv(fs.readFileSync(templatePath, 'utf-8'));
    expect(rows).toHaveLength(1);
    expect(validateVoteHeaders(Object.keys(rows[0]))).toHaveLength(0);

    const normalized = normalizeVoteRow(rows[0], 'votes_template.csv');
    expect(normalized.season).toBe('2024/25');
    expect(normalized.round).toBe(1);
    expect(normalized.role).toBe('P');
    expect(normalized.vote).toBe(6);
    expect(normalized.played).toBe(true);
  });

  test('validazione ruoli P/D/C/A', () => {
    const validRows = ['P', 'D', 'C', 'A'].map((role, idx) => normalizeVoteRow({
      season: '2024/25',
      round: '1',
      playerId: String(idx + 1),
      playerName: `Player ${idx}`,
      club: 'Club',
      role,
      vote: '6',
      fantasyVote: '6',
      minutesPlayed: '90',
      played: 'true',
      starter: 'true',
      goals: '0',
      assists: '0',
      yellowCards: '0',
      redCards: '0',
      penaltiesMissed: '0',
      ownGoals: '0',
    }, 'test.csv'));
    expect(validateVoteRows(validRows).errors.filter(e => e.field === 'role')).toHaveLength(0);

    const invalid = normalizeVoteRow({ ...validRows[0], role: 'X' } as never, 'test.csv');
    expect(validateVoteRows([invalid]).errors.some(e => e.field === 'role')).toBe(true);
  });

  test('played=false rende vote e fantasyVote null e non genera errore voto', () => {
    const row = normalizeVoteRow({
      season: '2024/25',
      round: '1',
      playerId: '1',
      playerName: 'No Vote',
      club: 'Club',
      role: 'A',
      vote: '',
      fantasyVote: '',
      minutesPlayed: '0',
      played: 'false',
      starter: 'false',
      goals: '0',
      assists: '0',
      yellowCards: '0',
      redCards: '0',
      penaltiesMissed: '0',
      ownGoals: '0',
    }, 'test.csv');

    const result = validateVoteRows([row]);
    expect(row.vote).toBeNull();
    expect(row.fantasyVote).toBeNull();
    expect(result.errors.filter(e => e.field === 'vote' || e.field === 'fantasyVote')).toHaveLength(0);
  });
});

