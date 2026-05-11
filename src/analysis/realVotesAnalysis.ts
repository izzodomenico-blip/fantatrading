import { NormalizedVoteRow } from '../importers/realVotesImporter';
import { validateVoteRows, VoteValidationResult } from '../importers/realVotesValidator';

export interface RealVotesQualityReport {
  generatedAt: string;
  totalRows: number;
  seasons: string[];
  rounds: number[];
  players: number;
  playedRows: number;
  notPlayedRows: number;
  missingVoteRows: number;
  missingFantasyVoteRows: number;
  validation: VoteValidationResult;
  status: 'missing_data' | 'valid' | 'invalid';
}

export function analyzeRealVotes(rows: NormalizedVoteRow[]): RealVotesQualityReport {
  const validation = validateVoteRows(rows);
  const playerKeys = new Set(rows.map(r => `${r.season}|${r.playerId}`));
  const playedRows = rows.filter(r => r.played).length;
  const notPlayedRows = rows.length - playedRows;

  return {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    seasons: [...new Set(rows.map(r => r.season))].sort(),
    rounds: [...new Set(rows.map(r => r.round))].sort((a, b) => a - b),
    players: playerKeys.size,
    playedRows,
    notPlayedRows,
    missingVoteRows: rows.filter(r => r.played && r.vote === null).length,
    missingFantasyVoteRows: rows.filter(r => r.played && r.fantasyVote === null).length,
    validation,
    status: rows.length === 0 ? 'missing_data' : validation.valid ? 'valid' : 'invalid',
  };
}

export function buildVotesQualityMarkdown(report: RealVotesQualityReport): string {
  const lines: string[] = [];
  lines.push('# FantaTrading - Qualita Dati Voti Reali');
  lines.push('');
  lines.push(`**Generato il:** ${new Date(report.generatedAt).toLocaleString('it-IT')}`);
  lines.push('');

  if (report.status === 'missing_data') {
    lines.push('## Stato');
    lines.push('');
    lines.push('Nessun dato reale voti e disponibile in `data/real/raw/votes/` o `data/real/processed/votes/`.');
    lines.push('Questo non e un errore: la struttura e pronta, ma serve caricare CSV reali seguendo `data/templates/votes_template.csv`.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('## Sintesi');
  lines.push('');
  lines.push('| Metrica | Valore |');
  lines.push('|---------|--------|');
  lines.push(`| Stato | ${report.status} |`);
  lines.push(`| Righe totali | ${report.totalRows} |`);
  lines.push(`| Stagioni | ${report.seasons.join(', ')} |`);
  lines.push(`| Giornate distinte | ${report.rounds.length} |`);
  lines.push(`| Giocatori-stagione | ${report.players} |`);
  lines.push(`| Righe played=true | ${report.playedRows} |`);
  lines.push(`| Righe played=false | ${report.notPlayedRows} |`);
  lines.push(`| Vote mancanti con played=true | ${report.missingVoteRows} |`);
  lines.push(`| FantasyVote mancanti con played=true | ${report.missingFantasyVoteRows} |`);
  lines.push(`| Errori validazione | ${report.validation.errors.length} |`);
  lines.push(`| Warning validazione | ${report.validation.warnings.length} |`);
  lines.push('');

  if (report.validation.errors.length > 0) {
    lines.push('## Primi errori');
    lines.push('');
    for (const error of report.validation.errors.slice(0, 20)) {
      lines.push(`- Riga ${error.rowIndex}: ${error.field} - ${error.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
