import { NormalizedVoteRow, RealVoteRole, VOTE_REQUIRED_COLUMNS } from './realVotesImporter';

export interface VoteValidationIssue {
  rowIndex: number;
  season: string;
  round: number;
  playerId: number;
  playerName: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface VoteValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errors: VoteValidationIssue[];
  warnings: VoteValidationIssue[];
  duplicateKeys: string[];
}

const VALID_ROLES = new Set<RealVoteRole>(['P', 'D', 'C', 'A']);

function issue(
  row: Partial<NormalizedVoteRow>,
  rowIndex: number,
  field: string,
  message: string,
  severity: 'error' | 'warning',
): VoteValidationIssue {
  return {
    rowIndex,
    season: row.season ?? '',
    round: row.round ?? 0,
    playerId: row.playerId ?? 0,
    playerName: row.playerName ?? '',
    field,
    message,
    severity,
  };
}

export function validateVoteHeaders(headers: string[]): string[] {
  return VOTE_REQUIRED_COLUMNS.filter(col => !headers.includes(col));
}

export function validateVoteRows(rows: NormalizedVoteRow[]): VoteValidationResult {
  const errors: VoteValidationIssue[] = [];
  const warnings: VoteValidationIssue[] = [];
  const seen = new Map<string, number>();

  rows.forEach((row, i) => {
    for (const field of ['season', 'playerName', 'club'] as const) {
      if (!row[field] || String(row[field]).trim() === '') {
        errors.push(issue(row, i, field, `Campo obbligatorio mancante: ${field}`, 'error'));
      }
    }

    if (!VALID_ROLES.has(row.role)) {
      errors.push(issue(row, i, 'role', `Ruolo non valido: "${row.role}" (ammessi: P/D/C/A)`, 'error'));
    }

    if (!Number.isInteger(row.round) || row.round <= 0) {
      errors.push(issue(row, i, 'round', `Round deve essere un intero positivo (trovato: ${row.round})`, 'error'));
    }

    if (!Number.isFinite(row.playerId) || row.playerId <= 0) {
      warnings.push(issue(row, i, 'playerId', `playerId non positivo o non valido: ${row.playerId}`, 'warning'));
    }

    if (row.played) {
      if (typeof row.vote !== 'number' || !Number.isFinite(row.vote)) {
        errors.push(issue(row, i, 'vote', 'vote numerico obbligatorio quando played=true', 'error'));
      }
      if (typeof row.fantasyVote !== 'number' || !Number.isFinite(row.fantasyVote)) {
        errors.push(issue(row, i, 'fantasyVote', 'fantasyVote numerico obbligatorio quando played=true', 'error'));
      }
    } else {
      if (row.vote !== null || row.fantasyVote !== null) {
        warnings.push(issue(row, i, 'played', 'played=false: vote/fantasyVote saranno ignorati dal motore voti', 'warning'));
      }
    }

    if (row.minutesPlayed !== null && (!Number.isFinite(row.minutesPlayed) || row.minutesPlayed < 0)) {
      errors.push(issue(row, i, 'minutesPlayed', `minutesPlayed non valido: ${row.minutesPlayed}`, 'error'));
    }

    for (const field of ['goals', 'assists', 'yellowCards', 'redCards', 'penaltiesMissed', 'ownGoals'] as const) {
      const value = row[field];
      if (!Number.isFinite(value)) {
        errors.push(issue(row, i, field, `Valore numerico non valido: ${field}=${value}`, 'error'));
      }
    }

    const key = `${row.season}|${row.round}|${row.playerId}`;
    if (seen.has(key)) {
      warnings.push(issue(row, i, 'playerId', `Duplicato season+round+playerId (prima riga: ${seen.get(key)})`, 'warning'));
    } else {
      seen.set(key, i);
    }
  });

  const errorRows = new Set(errors.map(e => e.rowIndex));
  const duplicateKeys = [...new Set(warnings
    .filter(w => w.message.startsWith('Duplicato'))
    .map(w => `${w.season}|${w.round}|${w.playerId}`))];

  return {
    valid: errors.length === 0,
    totalRows: rows.length,
    validRows: rows.length - errorRows.size,
    errors,
    warnings,
    duplicateKeys,
  };
}
