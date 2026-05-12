import { NormalizedVoteRow } from '../importers/realVotesImporter';
import { validateVoteRows, VoteValidationResult } from '../importers/realVotesValidator';

export interface SeasonVotesQuality {
  season: string;
  seasonStatus: string;
  rounds: number[];
  roundCount: number;
  recordCount: number;
  playedRows: number;
  notPlayedRows: number;
  missingRoleRows: number;
  missingClubRows: number;
  missingFantasyVoteRows: number;
  isComplete: boolean;
}

export interface RealVotesQualityReport {
  generatedAt: string;
  totalRows: number;
  seasons: string[];
  seasonCount: number;
  rounds: number[];
  players: number;
  playedRows: number;
  notPlayedRows: number;
  missingVoteRows: number;
  missingFantasyVoteRows: number;
  missingRoleRows: number;
  missingClubRows: number;
  validation: VoteValidationResult;
  bySeason: SeasonVotesQuality[];
  status: 'missing_data' | 'valid' | 'invalid';
}

function expectedRoundCount(season: string): number {
  return season === '2025/26' ? 36 : 38;
}

function isCompleteSeason(season: string, status: string, rounds: number[]): boolean {
  if (status !== 'completed') return false;
  const expected = expectedRoundCount(season);
  return rounds.length === expected && rounds[0] === 1 && rounds[rounds.length - 1] === expected;
}

export function analyzeRealVotes(rows: NormalizedVoteRow[]): RealVotesQualityReport {
  const validation = validateVoteRows(rows);
  const playerKeys = new Set(rows.map(r => `${r.season}|${r.playerId}`));
  const playedRows = rows.filter(r => r.played).length;
  const notPlayedRows = rows.length - playedRows;
  const seasons = [...new Set(rows.map(r => r.season))].sort();
  const bySeason = seasons.map(season => {
    const seasonRows = rows.filter(r => r.season === season);
    const rounds = [...new Set(seasonRows.map(r => r.round))].sort((a, b) => a - b);
    const seasonStatus = seasonRows[0]?.seasonStatus ?? '';
    return {
      season,
      seasonStatus,
      rounds,
      roundCount: rounds.length,
      recordCount: seasonRows.length,
      playedRows: seasonRows.filter(r => r.played).length,
      notPlayedRows: seasonRows.filter(r => !r.played).length,
      missingRoleRows: seasonRows.filter(r => !r.role).length,
      missingClubRows: seasonRows.filter(r => !r.club).length,
      missingFantasyVoteRows: seasonRows.filter(r => r.played && r.fantasyVote === null).length,
      isComplete: isCompleteSeason(season, seasonStatus, rounds),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    seasons,
    seasonCount: seasons.length,
    rounds: [...new Set(rows.map(r => r.round))].sort((a, b) => a - b),
    players: playerKeys.size,
    playedRows,
    notPlayedRows,
    missingVoteRows: rows.filter(r => r.played && r.vote === null).length,
    missingFantasyVoteRows: rows.filter(r => r.played && r.fantasyVote === null).length,
    missingRoleRows: rows.filter(r => !r.role).length,
    missingClubRows: rows.filter(r => !r.club).length,
    validation,
    bySeason,
    status: rows.length === 0 ? 'missing_data' : validation.valid ? 'valid' : 'invalid',
  };
}

export function buildVotesQualityCsvRows(report: RealVotesQualityReport): (string | number | boolean)[][] {
  return report.bySeason.map(season => [
    season.season,
    season.seasonStatus,
    season.roundCount,
    season.rounds.join('|'),
    season.recordCount,
    season.playedRows,
    season.notPlayedRows,
    season.missingRoleRows,
    season.missingClubRows,
    season.missingFantasyVoteRows,
    season.isComplete,
  ]);
}

export function buildVotesQualityMarkdown(report: RealVotesQualityReport, mappingIssues: string[] = []): string {
  const lines: string[] = [];
  lines.push('# FantaTrading - Qualita Import Voti Reali');
  lines.push('');
  lines.push(`**Generato il:** ${new Date(report.generatedAt).toLocaleString('it-IT')}`);
  lines.push('');

  if (report.status === 'missing_data') {
    lines.push('## Stato');
    lines.push('');
    lines.push('Nessun dato reale voti e disponibile in `data/real/raw/votes/` o `data/real/processed/votes/`.');
    lines.push('Questo non e un errore: la struttura e pronta, ma serve caricare CSV o Excel reali.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('## Sintesi');
  lines.push('');
  lines.push('| Metrica | Valore |');
  lines.push('|---------|--------|');
  lines.push(`| Stato | ${report.status} |`);
  lines.push(`| Stagioni lette | ${report.seasonCount} |`);
  lines.push(`| Righe totali | ${report.totalRows} |`);
  lines.push(`| Stagioni | ${report.seasons.join(', ')} |`);
  lines.push(`| Giocatori-stagione | ${report.players} |`);
  lines.push(`| Giocatori con voto | ${report.playedRows} |`);
  lines.push(`| Senza voto | ${report.notPlayedRows} |`);
  lines.push(`| Record con ruolo mancante | ${report.missingRoleRows} |`);
  lines.push(`| Record con squadra mancante | ${report.missingClubRows} |`);
  lines.push(`| FantasyVote mancanti con played=true | ${report.missingFantasyVoteRows} |`);
  lines.push(`| Errori validazione | ${report.validation.errors.length} |`);
  lines.push(`| Warning validazione | ${report.validation.warnings.length} |`);
  lines.push(`| Problemi di mapping | ${mappingIssues.length} |`);
  lines.push('');

  lines.push('## Dettaglio per stagione');
  lines.push('');
  lines.push('| Stagione | Stato | Giornate | Record | Con voto | Senza voto | Ruolo mancante | Squadra mancante | Completa |');
  lines.push('|----------|-------|----------|--------|----------|------------|----------------|------------------|----------|');
  for (const season of report.bySeason) {
    lines.push(`| ${season.season} | ${season.seasonStatus} | ${season.roundCount} (${season.rounds.join(', ')}) | ${season.recordCount} | ${season.playedRows} | ${season.notPlayedRows} | ${season.missingRoleRows} | ${season.missingClubRows} | ${season.isComplete} |`);
  }
  lines.push('');

  lines.push('## Stato Completezza');
  lines.push('');
  const season2023 = report.bySeason.find(s => s.season === '2023/24');
  const season2024 = report.bySeason.find(s => s.season === '2024/25');
  const season2025 = report.bySeason.find(s => s.season === '2025/26');
  lines.push(`- 2023/24 completed: ${season2023?.seasonStatus === 'completed' && season2023.isComplete}`);
  lines.push(`- 2024/25 completed: ${season2024?.seasonStatus === 'completed' && season2024.isComplete}`);
  lines.push(`- 2025/26 in_progress: ${season2025?.seasonStatus === 'in_progress'}`);
  lines.push('');

  if (mappingIssues.length > 0) {
    lines.push('## Problemi di mapping');
    lines.push('');
    for (const issue of mappingIssues.slice(0, 50)) {
      lines.push(`- ${issue}`);
    }
    if (mappingIssues.length > 50) {
      lines.push(`- ... altri ${mappingIssues.length - 50} problemi`);
    }
    lines.push('');
  }

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
