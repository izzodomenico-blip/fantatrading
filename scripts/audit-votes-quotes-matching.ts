import * as fs from 'fs';
import * as path from 'path';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../src/importers/realVotesImporter';
import { ensureDir, writeCSV } from '../src/services/reportWriter';

const VOTES_PATH = path.resolve(__dirname, '../data/real/processed/votes/fantacalcio_votes_history.json');
const QUOTES_PATH = path.resolve(__dirname, '../data/real/processed/fantacalcio_quotes_history.json');
const REPORT_PATH = path.resolve(__dirname, '../reports/real-data/votes_quotes_matching_report.md');
const CSV_PATH = path.resolve(__dirname, '../data/real/processed/votes/votes_quotes_matching_report.csv');

const TARGET_SEASONS = ['2023/24', '2024/25', '2025/26'];

interface VotePlayer {
  season: string;
  seasonStatus: string;
  playerId: string;
  playerName: string;
  role: string;
  clubs: string[];
  rounds: number[];
  appearances: number;
}

interface QuotePlayer {
  season: string;
  seasonStatus: string;
  playerId: string;
  playerName: string;
  role: string;
  club: string;
}

interface MatchExample {
  playerId: string;
  playerName: string;
  role: string;
  club: string;
  reason?: string;
}

interface MismatchExample {
  playerId: string;
  voteName: string;
  quoteName: string;
  voteRole: string;
  quoteRole: string;
}

interface SeasonAudit {
  season: string;
  seasonStatus: string;
  votePlayers: number;
  quotePlayers: number;
  matchedVotePlayers: number;
  quotePlayersWithoutVotes: number;
  votePlayersWithoutQuote: number;
  matchRatePct: number;
  directPlayerIdMatches: number;
  fallbackNameRoleMatches: number;
  roleMismatches: number;
  nameMismatches: number;
  duplicateVotePlayerIds: number;
  duplicateQuotePlayerIds: number;
  duplicateVoteNameRoleKeys: number;
  duplicateQuoteNameRoleKeys: number;
  unmatchedVoteExamples: MatchExample[];
  unmatchedQuoteExamples: MatchExample[];
  roleMismatchExamples: MismatchExample[];
  nameMismatchExamples: MismatchExample[];
}

function loadJsonRows<T>(filePath: string): T[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { rows?: T[] };
  return raw.rows ?? [];
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameRoleKey(row: { season: string; playerName: string; role: string }): string {
  return `${row.season}|${normalizeName(row.playerName)}|${row.role}`;
}

function playerIdKey(row: { season: string; playerId: string }): string {
  return `${row.season}|${row.playerId}`;
}

function countDuplicateKeys<T>(rows: T[], makeKey: (row: T) => string): number {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = makeKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].filter(count => count > 1).length;
}

function aggregateVotePlayers(rows: NormalizedVoteRow[]): VotePlayer[] {
  const byId = new Map<string, VotePlayer>();
  for (const row of rows) {
    const playerId = String(row.playerId);
    const key = `${row.season}|${playerId}`;
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, {
        season: row.season,
        seasonStatus: row.seasonStatus,
        playerId,
        playerName: row.playerName,
        role: row.role,
        clubs: row.club ? [row.club] : [],
        rounds: [row.round],
        appearances: 1,
      });
      continue;
    }
    if (row.club && !existing.clubs.includes(row.club)) existing.clubs.push(row.club);
    if (!existing.rounds.includes(row.round)) existing.rounds.push(row.round);
    existing.appearances += 1;
  }
  return [...byId.values()].map(row => ({
    ...row,
    clubs: row.clubs.sort(),
    rounds: row.rounds.sort((a, b) => a - b),
  }));
}

function aggregateQuotePlayers(rows: NormalizedQuoteRow[]): QuotePlayer[] {
  return rows.map(row => ({
    season: row.season,
    seasonStatus: row.seasonStatus,
    playerId: String(row.playerId),
    playerName: row.playerName,
    role: row.role,
    club: row.club,
  }));
}

function indexUnique<T>(rows: T[], makeKey: (row: T) => string): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const row of rows) {
    const key = makeKey(row);
    index.set(key, [...(index.get(key) ?? []), row]);
  }
  return index;
}

function exampleFromVote(row: VotePlayer, reason?: string): MatchExample {
  return {
    playerId: row.playerId,
    playerName: row.playerName,
    role: row.role,
    club: row.clubs.join('|'),
    reason,
  };
}

function exampleFromQuote(row: QuotePlayer, reason?: string): MatchExample {
  return {
    playerId: row.playerId,
    playerName: row.playerName,
    role: row.role,
    club: row.club,
    reason,
  };
}

function auditSeason(voteRows: NormalizedVoteRow[], quoteRows: NormalizedQuoteRow[], season: string): SeasonAudit {
  const votes = aggregateVotePlayers(voteRows.filter(row => row.season === season));
  const quotes = aggregateQuotePlayers(quoteRows.filter(row => row.season === season));
  const quoteById = indexUnique(quotes, playerIdKey);
  const quoteByNameRole = indexUnique(quotes, nameRoleKey);
  const matchedVoteIds = new Set<string>();
  const matchedQuoteIds = new Set<string>();
  const roleMismatchExamples: MismatchExample[] = [];
  const nameMismatchExamples: MismatchExample[] = [];
  let roleMismatches = 0;
  let nameMismatches = 0;
  let directPlayerIdMatches = 0;

  for (const vote of votes) {
    const direct = quoteById.get(playerIdKey(vote)) ?? [];
    if (direct.length === 0) continue;
    directPlayerIdMatches += 1;
    matchedVoteIds.add(playerIdKey(vote));
    matchedQuoteIds.add(playerIdKey(direct[0]));

    const quote = direct[0];
    if (quote.role !== vote.role) {
      roleMismatches += 1;
      if (roleMismatchExamples.length < 10) {
        roleMismatchExamples.push({
          playerId: vote.playerId,
          voteName: vote.playerName,
          quoteName: quote.playerName,
          voteRole: vote.role,
          quoteRole: quote.role,
        });
      }
    }
    if (normalizeName(quote.playerName) !== normalizeName(vote.playerName)) {
      nameMismatches += 1;
      if (nameMismatchExamples.length < 10) {
        nameMismatchExamples.push({
          playerId: vote.playerId,
          voteName: vote.playerName,
          quoteName: quote.playerName,
          voteRole: vote.role,
          quoteRole: quote.role,
        });
      }
    }
  }

  let fallbackNameRoleMatches = 0;
  for (const vote of votes) {
    const voteKey = playerIdKey(vote);
    if (matchedVoteIds.has(voteKey)) continue;
    const fallback = (quoteByNameRole.get(nameRoleKey(vote)) ?? [])
      .find(quote => !matchedQuoteIds.has(playerIdKey(quote)));
    if (!fallback) continue;
    fallbackNameRoleMatches += 1;
    matchedVoteIds.add(voteKey);
    matchedQuoteIds.add(playerIdKey(fallback));
  }

  const unmatchedVotes = votes.filter(vote => !matchedVoteIds.has(playerIdKey(vote)));
  const unmatchedQuotes = quotes.filter(quote => !matchedQuoteIds.has(playerIdKey(quote)));
  const matchedVotePlayers = matchedVoteIds.size;

  return {
    season,
    seasonStatus: votes[0]?.seasonStatus ?? quotes[0]?.seasonStatus ?? '',
    votePlayers: votes.length,
    quotePlayers: quotes.length,
    matchedVotePlayers,
    quotePlayersWithoutVotes: unmatchedQuotes.length,
    votePlayersWithoutQuote: unmatchedVotes.length,
    matchRatePct: votes.length > 0 ? (matchedVotePlayers / votes.length) * 100 : 0,
    directPlayerIdMatches,
    fallbackNameRoleMatches,
    roleMismatches,
    nameMismatches,
    duplicateVotePlayerIds: countDuplicateKeys(voteRows.filter(row => row.season === season), row => `${row.season}|${row.round}|${row.playerId}`),
    duplicateQuotePlayerIds: countDuplicateKeys(quotes, playerIdKey),
    duplicateVoteNameRoleKeys: countDuplicateKeys(votes, nameRoleKey),
    duplicateQuoteNameRoleKeys: countDuplicateKeys(quotes, nameRoleKey),
    unmatchedVoteExamples: unmatchedVotes.slice(0, 10).map(row => exampleFromVote(row, 'presente nei voti, assente nelle quotazioni')),
    unmatchedQuoteExamples: unmatchedQuotes.slice(0, 10).map(row => exampleFromQuote(row, 'presente nelle quotazioni, mai apparso nei voti')),
    roleMismatchExamples,
    nameMismatchExamples,
  };
}

function pct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function buildMarkdown(audits: SeasonAudit[]): string {
  const lines: string[] = [];
  lines.push('# FantaTrading - Audit Collegamento Voti e Quotazioni');
  lines.push('');
  lines.push(`**Generato il:** ${new Date().toLocaleString('it-IT')}`);
  lines.push('');
  lines.push('## Sintesi');
  lines.push('');
  lines.push('| Stagione | Stato | Giocatori voti | Giocatori quotazioni | Matched | Match rate | Match Id | Match fallback nome+ruolo | Quotazioni senza voti | Voti senza quotazione | Mismatch ruolo | Mismatch nome |');
  lines.push('|----------|-------|----------------|----------------------|---------|------------|----------|----------------------------|-----------------------|-----------------------|----------------|---------------|');
  for (const audit of audits) {
    lines.push(`| ${audit.season} | ${audit.seasonStatus} | ${audit.votePlayers} | ${audit.quotePlayers} | ${audit.matchedVotePlayers} | ${pct(audit.matchRatePct)} | ${audit.directPlayerIdMatches} | ${audit.fallbackNameRoleMatches} | ${audit.quotePlayersWithoutVotes} | ${audit.votePlayersWithoutQuote} | ${audit.roleMismatches} | ${audit.nameMismatches} |`);
  }
  lines.push('');
  lines.push('## Verifica Codice Giocatore');
  lines.push('');
  lines.push('Il codice `Cod.` importato dai file voti corrisponde al campo `Id` delle quotazioni per la quasi totalita dei giocatori con voto. Il match diretto per `season + playerId` e il criterio primario da usare nel backtest completo; il fallback `season + nome normalizzato + ruolo` va mantenuto solo come recupero diagnostico per casi non coperti da Id.');
  lines.push('');
  lines.push('## Regola SV per Backtest Completo');
  lines.push('');
  lines.push('I file voti normalizzati contengono solo giocatori con voto effettivo: nei dati importati non risultano righe `played=false`. Quindi il backtest completo deve dedurre il senza voto per assenza nel round: per ogni giocatore in rosa, se non esiste una riga voti con lo stesso `season + round + playerId`, quel giocatore va trattato come SV (`played=false`, `vote=null`, `fantasyVote=null`) e poi valutato tramite la `NoVotePolicy` configurata.');
  lines.push('');

  for (const audit of audits) {
    lines.push(`## ${audit.season}`);
    lines.push('');
    lines.push('| Metrica | Valore |');
    lines.push('|---------|--------|');
    lines.push(`| Stato | ${audit.seasonStatus} |`);
    lines.push(`| Match rate | ${pct(audit.matchRatePct)} |`);
    lines.push(`| Match diretto playerId/Cod | ${audit.directPlayerIdMatches} |`);
    lines.push(`| Match fallback season+nome+ruolo | ${audit.fallbackNameRoleMatches} |`);
    lines.push(`| Giocatori quotazioni senza voti | ${audit.quotePlayersWithoutVotes} |`);
    lines.push(`| Giocatori voti senza quotazione | ${audit.votePlayersWithoutQuote} |`);
    lines.push(`| Mismatch ruolo | ${audit.roleMismatches} |`);
    lines.push(`| Mismatch nome | ${audit.nameMismatches} |`);
    lines.push(`| Duplicati voti season+round+playerId | ${audit.duplicateVotePlayerIds} |`);
    lines.push(`| Duplicati quotazioni season+playerId | ${audit.duplicateQuotePlayerIds} |`);
    lines.push(`| Duplicati voti season+nome+ruolo | ${audit.duplicateVoteNameRoleKeys} |`);
    lines.push(`| Duplicati quotazioni season+nome+ruolo | ${audit.duplicateQuoteNameRoleKeys} |`);
    lines.push('');

    lines.push('### Esempi voti senza quotazione');
    lines.push('');
    if (audit.unmatchedVoteExamples.length === 0) {
      lines.push('Nessun esempio: tutti i giocatori nei voti hanno trovato una quotazione.');
    } else {
      for (const row of audit.unmatchedVoteExamples) {
        lines.push(`- ${row.playerId} | ${row.playerName} | ${row.role} | ${row.club}`);
      }
    }
    lines.push('');

    lines.push('### Esempi quotazioni senza voti');
    lines.push('');
    if (audit.unmatchedQuoteExamples.length === 0) {
      lines.push('Nessun esempio: tutti i giocatori quotati hanno almeno un voto.');
    } else {
      for (const row of audit.unmatchedQuoteExamples) {
        lines.push(`- ${row.playerId} | ${row.playerName} | ${row.role} | ${row.club}`);
      }
    }
    lines.push('');

    lines.push('### Esempi mismatch ruolo');
    lines.push('');
    if (audit.roleMismatchExamples.length === 0) {
      lines.push('Nessun mismatch ruolo rilevato sui match diretti.');
    } else {
      for (const row of audit.roleMismatchExamples) {
        lines.push(`- ${row.playerId} | voti: ${row.voteName} (${row.voteRole}) | quotazioni: ${row.quoteName} (${row.quoteRole})`);
      }
    }
    lines.push('');

    lines.push('### Esempi mismatch nome');
    lines.push('');
    if (audit.nameMismatchExamples.length === 0) {
      lines.push('Nessun mismatch nome rilevato sui match diretti.');
    } else {
      for (const row of audit.nameMismatchExamples) {
        lines.push(`- ${row.playerId} | voti: ${row.voteName} | quotazioni: ${row.quoteName} | ruolo ${row.voteRole}/${row.quoteRole}`);
      }
    }
    lines.push('');
  }

  lines.push('## Raccomandazione Tecnica');
  lines.push('');
  lines.push('Per il backtest completo usare `season + round + playerId` come chiave primaria voto-giornata e `season + playerId` come collegamento alle quotazioni. Per i giocatori in rosa non presenti nel file voti della giornata, generare internamente una riga SV derivata senza inventare voto o fantavoto. Il fallback per nome normalizzato e ruolo deve restare limitato a reportistica o migrazioni dati, per evitare collisioni tra omonimi e cambi ruolo.');
  lines.push('');
  lines.push('## Rischi Residui');
  lines.push('');
  lines.push('- Le quotazioni contengono anche giocatori mai apparsi nei voti: sono compatibili con rose/backtest, ma produrranno SV nei round in cui non compaiono.');
  lines.push('- Alcuni nomi possono differire pur condividendo lo stesso Id: il backtest deve fidarsi dell Id, non del nome visuale.');
  lines.push('- I cambi squadra durante la stagione sono visibili nei voti giornata per giornata, mentre le quotazioni hanno una sola squadra normalizzata: non usare la squadra come chiave primaria.');
  lines.push('- Il fallback nome+ruolo puo collidere in presenza di omonimi; usarlo solo quando il codice Id manca o per audit.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const voteRows = loadJsonRows<NormalizedVoteRow>(VOTES_PATH);
  const quoteRows = loadJsonRows<NormalizedQuoteRow>(QUOTES_PATH);
  const audits = TARGET_SEASONS.map(season => auditSeason(voteRows, quoteRows, season));

  ensureDir(path.dirname(REPORT_PATH));
  ensureDir(path.dirname(CSV_PATH));
  fs.writeFileSync(REPORT_PATH, buildMarkdown(audits), 'utf8');
  writeCSV(
    CSV_PATH,
    [
      'season',
      'seasonStatus',
      'votePlayers',
      'quotePlayers',
      'matchedVotePlayers',
      'quotePlayersWithoutVotes',
      'votePlayersWithoutQuote',
      'matchRatePct',
      'directPlayerIdMatches',
      'fallbackNameRoleMatches',
      'roleMismatches',
      'nameMismatches',
      'duplicateVotePlayerIds',
      'duplicateQuotePlayerIds',
      'duplicateVoteNameRoleKeys',
      'duplicateQuoteNameRoleKeys',
    ],
    audits.map(audit => [
      audit.season,
      audit.seasonStatus,
      audit.votePlayers,
      audit.quotePlayers,
      audit.matchedVotePlayers,
      audit.quotePlayersWithoutVotes,
      audit.votePlayersWithoutQuote,
      audit.matchRatePct,
      audit.directPlayerIdMatches,
      audit.fallbackNameRoleMatches,
      audit.roleMismatches,
      audit.nameMismatches,
      audit.duplicateVotePlayerIds,
      audit.duplicateQuotePlayerIds,
      audit.duplicateVoteNameRoleKeys,
      audit.duplicateQuoteNameRoleKeys,
    ]),
  );

  for (const audit of audits) {
    console.log(`${audit.season}: match ${audit.matchedVotePlayers}/${audit.votePlayers} (${pct(audit.matchRatePct)}), quote senza voti ${audit.quotePlayersWithoutVotes}, voti senza quote ${audit.votePlayersWithoutQuote}`);
  }
}

main();
