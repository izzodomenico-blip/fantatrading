import * as fs from 'fs';
import * as path from 'path';
import { importAllVotesFromDirectory, NormalizedVoteRow } from '../src/importers/realVotesImporter';
import { validateVoteRows } from '../src/importers/realVotesValidator';
import { ensureDir, writeCSV, writeJSON } from '../src/services/reportWriter';

const RAW_DIR = path.resolve(__dirname, '../data/real/raw/votes');
const OUT_DIR = path.resolve(__dirname, '../data/real/processed/votes');

const HEADERS: Array<keyof NormalizedVoteRow> = [
  'season',
  'round',
  'playerId',
  'playerName',
  'club',
  'role',
  'vote',
  'fantasyVote',
  'minutesPlayed',
  'played',
  'starter',
  'goals',
  'assists',
  'yellowCards',
  'redCards',
  'penaltiesMissed',
  'ownGoals',
  'sourceFile',
];

function main(): void {
  console.log('=== FantaTrading - Import Voti Reali ===\n');
  ensureDir(RAW_DIR);
  ensureDir(OUT_DIR);

  const csvFiles = fs.readdirSync(RAW_DIR).filter(file => /\.csv$/i.test(file));
  if (csvFiles.length === 0) {
    console.log(`Nessun CSV voti trovato in ${RAW_DIR}`);
    console.log('Copia file reali seguendo data/templates/votes_template.csv e riesegui il comando.');
    writeJSON(path.join(OUT_DIR, 'fantacalcio_votes_history.json'), {
      generatedAt: new Date().toISOString(),
      totalRows: 0,
      rows: [],
      note: 'Nessun dato reale voti disponibile.',
    });
    return;
  }

  const results = importAllVotesFromDirectory(RAW_DIR);
  const rows = results.flatMap(r => r.rows);
  const validation = validateVoteRows(rows);

  writeJSON(path.join(OUT_DIR, 'fantacalcio_votes_history.json'), {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    rows,
    validation,
  });

  writeCSV(
    path.join(OUT_DIR, 'fantacalcio_votes_history.csv'),
    HEADERS,
    rows.map(row => HEADERS.map(header => row[header] ?? '')),
  );

  console.log(`File importati: ${results.length}`);
  console.log(`Righe importate: ${rows.length}`);
  console.log(`Errori validazione: ${validation.errors.length}`);
  console.log(`Warning validazione: ${validation.warnings.length}`);
}

main();

