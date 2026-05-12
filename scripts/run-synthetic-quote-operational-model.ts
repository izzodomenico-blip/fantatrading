import * as fs from 'fs';
import * as path from 'path';
import { SYNTHETIC_QUOTE_OPERATIONAL_MODEL } from '../src/config/syntheticQuoteOperationalModel';
import { NormalizedQuoteRow } from '../src/importers/realQuotesImporter';
import { NormalizedVoteRow } from '../src/importers/realVotesImporter';
import {
  makeSyntheticRoundQuoteCsv,
  runSyntheticRoundQuoteModel,
} from '../src/engine/syntheticRoundQuoteEngine';

const QUOTES_PATH = path.resolve(__dirname, '../data/real/processed/fantacalcio_quotes_history.json');
const VOTES_PATH = path.resolve(__dirname, '../data/real/processed/votes/fantacalcio_votes_history.json');
const OUT_DIR = path.resolve(__dirname, '../data/real/processed/round-quotes');
const REPORT_DIR = path.resolve(__dirname, '../reports/real-data');
const SEASONS = ['2023/24', '2024/25', '2025/26'];

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readRows<T>(filePath: string): T[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return raw.rows ?? [];
}

function key(row: { season: string; playerId: number | string }): string {
  return `${row.season}|${row.playerId}`;
}

function matchedQuotes(quoteRows: NormalizedQuoteRow[], voteRows: NormalizedVoteRow[]): NormalizedQuoteRow[] {
  const voteKeys = new Set(voteRows.filter(row => SEASONS.includes(row.season)).map(key));
  return quoteRows.filter(row => SEASONS.includes(row.season) && voteKeys.has(key(row)));
}

function fmt(value: number): string {
  return value.toFixed(2);
}

function buildOperationalMarkdown(): string {
  const config = SYNTHETIC_QUOTE_OPERATIONAL_MODEL;
  return [
    '# Modello Sintetico Operativo Quotazioni',
    '',
    '## Decisione',
    '',
    `Il modello operativo sintetico consigliato per future simulazioni intra-stagione esplorative e **${config.modelName}**.`,
    '',
    'Questo modello e stimato e non ufficiale Fantacalcio. Non replica e non sostituisce l algoritmo proprietario Fantacalcio e non sostituisce quotazioni ufficiali giornata per giornata.',
    '',
    '## Scopo',
    '',
    `Purpose: \`${config.purpose}\``,
    '',
    'Il modello puo essere usato come base per simulazioni esplorative di trading intra-stagione, finche non sono disponibili quotazioni ufficiali giornata per giornata.',
    '',
    '## Fonte della scelta',
    '',
    `Studio sorgente: ${config.sourceStudy}`,
    '',
    'La deep optimization ha confrontato modelli operativi e benchmark teorici. `ORACLE_FINAL_ANCHOR` e escluso dai modelli operativi perche usa Qt.A finale ed e solo un limite teorico.',
    '',
    '## Metriche principali',
    '',
    '| Metrica | Valore |',
    '|---------|--------|',
    `| MAE | ${fmt(config.metrics.mae)} |`,
    `| RMSE | ${fmt(config.metrics.rmse)} |`,
    `| Entro 1 punto | ${fmt(config.metrics.within1Pct)}% |`,
    `| Entro 2 punti | ${fmt(config.metrics.within2Pct)}% |`,
    `| Entro 3 punti | ${fmt(config.metrics.within3Pct)}% |`,
    `| MAE attaccanti | ${fmt(config.metrics.attackerMae)} |`,
    '',
    '## Perche ROLE_BONUS_SENSITIVE',
    '',
    '- Ha il miglior equilibrio operativo tra MAE, RMSE, bias e stabilita.',
    '- Riduce in modo marcato l errore sugli attaccanti rispetto ai modelli precedenti.',
    '- Usa segnali coerenti con i dati disponibili: voto/fantavoto, presenze, gol, assist, bonus recenti e dry spell.',
    '- Non usa Qt.A finale nel calcolo giornaliero operativo.',
    '',
    '## Differenza rispetto ad altri modelli',
    '',
    '| Modello | Lettura |',
    '|---------|---------|',
    '| BASELINE | Prima baseline sintetica, piu semplice e meno precisa. |',
    '| AGGRESSIVE | Migliorava la reattivita ma lasciava piu errore sugli attaccanti. |',
    '| ROBUST_MODEL | Miglior errore puro nello studio, ma con maggiore bias sugli attaccanti rispetto alla scelta operativa. |',
    '| ROLE_BONUS_SENSITIVE | Miglior compromesso operativo, soprattutto per ruoli offensivi e attaccanti. |',
    '',
    '## Rischi residui',
    '',
    '- Il modello resta stimato e non ufficiale.',
    '- Le traiettorie giornaliere sono sintetiche, non osservate.',
    '- Mancano quotazioni ufficiali giornata per giornata.',
    '- Mancano dati completi su minuti, titolarita, infortuni, squalifiche, rigori segnati/subiti e data ingresso lista.',
    '- Il futuro backtest intra-stagione dovra essere marcato come esplorativo.',
  ].join('\n');
}

function main(): void {
  if (!fs.existsSync(QUOTES_PATH)) throw new Error(`File quotazioni mancante: ${QUOTES_PATH}`);
  if (!fs.existsSync(VOTES_PATH)) throw new Error(`File voti mancante: ${VOTES_PATH}`);
  ensureDir(OUT_DIR);
  ensureDir(REPORT_DIR);

  const quoteRows = readRows<NormalizedQuoteRow>(QUOTES_PATH);
  const voteRows = readRows<NormalizedVoteRow>(VOTES_PATH);
  const synthetic = runSyntheticRoundQuoteModel(
    matchedQuotes(quoteRows, voteRows),
    voteRows.filter(row => SEASONS.includes(row.season)),
    SYNTHETIC_QUOTE_OPERATIONAL_MODEL.params,
    SEASONS,
  );

  const jsonPath = path.join(OUT_DIR, 'synthetic_round_quotes_history.json');
  const csvPath = path.join(OUT_DIR, 'synthetic_round_quotes_history.csv');
  const reportPath = path.join(REPORT_DIR, 'synthetic_quote_operational_model.md');

  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    modelId: SYNTHETIC_QUOTE_OPERATIONAL_MODEL.modelName,
    officialModel: false,
    purpose: SYNTHETIC_QUOTE_OPERATIONAL_MODEL.purpose,
    sourceStudy: SYNTHETIC_QUOTE_OPERATIONAL_MODEL.sourceStudy,
    metrics: SYNTHETIC_QUOTE_OPERATIONAL_MODEL.metrics,
    params: SYNTHETIC_QUOTE_OPERATIONAL_MODEL.params,
    totalRows: synthetic.rows.length,
    rows: synthetic.rows,
  }, null, 2), 'utf-8');
  fs.writeFileSync(csvPath, makeSyntheticRoundQuoteCsv(synthetic.rows), 'utf-8');
  fs.writeFileSync(reportPath, buildOperationalMarkdown(), 'utf-8');

  console.log(`Operational model: ${SYNTHETIC_QUOTE_OPERATIONAL_MODEL.modelName}`);
  console.log(`Rows: ${synthetic.rows.length}`);
  console.log(`Generated: ${jsonPath}`);
  console.log(`Generated: ${csvPath}`);
  console.log(`Generated: ${reportPath}`);
}

main();
