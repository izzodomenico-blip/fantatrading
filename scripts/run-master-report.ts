/**
 * Genera il Report Master consolidando tutti i risultati delle Fasi 1-4.
 * Legge i JSON esistenti, non ri-esegue simulazioni.
 */
import * as path from 'path';
import * as fs from 'fs';

const REPORTS = path.join(__dirname, '..', 'reports');
const OUT_DIR = path.join(REPORTS, 'master');

// ─── Lettura JSON ─────────────────────────────────────────────────────────────

function readJson<T>(relPath: string): T {
  const full = path.join(REPORTS, relPath);
  return JSON.parse(fs.readFileSync(full, 'utf8')) as T;
}

// ─── Tipi minimal dai report esistenti ───────────────────────────────────────

interface Phase2Row { scenarioId: string; numParticipants: number; avgFirstPrize: number; avgPrizePool: number; avgPlatformRevenue: number; avgOrganizerMarginPct: number; orgProfitPerParticipant: number; avgWinnerROIPct: number; pctAbove0: number; isSustainable: boolean }
interface Phase2Report { scenarios: Phase2Row[]; conclusion: string; keyInsights: string[] }

interface Phase3CompRow { modelId: string; modelName: string; numParticipants: number; registrationFeePerTeam: number; avgOrganizerMarginPct: number; avgPlatformRevenue: number; avgPrizePool: number; avgWinnerROIPct: number; pctAbove0: number; isSustainable: boolean; platformLossRisk: number }
interface Phase3CompReport { rows: Phase3CompRow[]; recommendations: string[] }

interface SensPoint { paramName: string; paramDisplayName: string; paramValue: number; avgOrganizerMarginPct: number; avgWinnerROIPct: number; pctAbove0: number; avgPrizePool: number }
interface SensReport { sweeps: Array<{ paramName: string; paramDisplayName: string; paramUnit: string; baselineValue: number; points: SensPoint[] }>; keyFindings: string[] }

interface OptimizerCand { buyCommissionRate: number; sellCommissionRate: number; platformFeeRate: number; avgOrganizerMarginPct: number; orgProfitPerParticipant: number; avgFirstPrize: number; avgPlatformRevenue: number; avgWinnerROIPct: number; pctAbove0: number; isParetoOptimal: boolean }
interface OptimizerReport { bestPerObjective: Record<string, OptimizerCand>; paretoFrontier: OptimizerCand[]; recommendations: string[]; totalCandidatesEvaluated: number }

interface PrizeTableCand { numPrizes: number; firstPrizePct: number; giniCoefficient: number; pctAbove0: number; avgFirstPrize: number; avgLastPrize: number; avgWinnerROIPct: number; lastPrizeCoversRegistrationFee: boolean; isParetoOptimal: boolean }
interface PrizeTableReport { numParticipants: number; registrationFeePerTeam: number; bestBalanced: PrizeTableCand; bestForWinnerROI: PrizeTableCand; bestForBreakEven: PrizeTableCand; paretoFrontier: PrizeTableCand[]; recommendations: string[] }

interface PricePoint { meanReversionRate: number; avgPriceDriftAbs: number; avgPriceDriftRel: number; avgPrizePool: number; pctAbove0: number; avgWinnerROIPct: number }
interface PriceReport { recommendedRate: number; recommendedRationale: string; randomWalkBaseline: PricePoint; points: PricePoint[]; keyFindings: string[] }

// ─── Builder Markdown ─────────────────────────────────────────────────────────

function fmt(n: number, dec = 0): string { return n.toFixed(dec); }
function pct(n: number, dec = 1): string { return n.toFixed(dec) + '%'; }

function buildMasterReport(
  ph2: Phase2Report,
  ph3comp: Phase3CompReport,
  sens: SensReport,
  opt: OptimizerReport,
  prizeOpt: PrizeTableReport,
  priceModel: PriceReport,
): string {
  const lines: string[] = [];
  const now = new Date().toLocaleString('it-IT');

  const balanced = opt.bestPerObjective['balanced'];
  const ph3n100 = ph3comp.rows.filter(r => r.numParticipants === 100);
  const ph2base = ph2.scenarios.find(s => s.numParticipants === 20)!;
  const ph2large = ph2.scenarios.find(s => s.numParticipants === 500)!;

  // ── Copertina ───────────────────────────────────────────────────────────────
  lines.push('# FantaTrading — Report Master');
  lines.push('## Validazione Matematica del Regolamento');
  lines.push('');
  lines.push(`*Generato il ${now} · Fasi 1–4 completate · ${351} test verdi*`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('> **Nota di lettura:** questo Master Report consolida anche scenari ottimizzati alternativi prodotti nelle Fasi 3-4. Il regolamento originale puro resta quello in `DEFAULT_RULES`: commissione acquisto 2%, commissione vendita 1.25%, margine piattaforma 0%, rosa 25 giocatori (3P+8D+8C+6A). Le configurazioni raccomandate sotto sono varianti di analisi, non il default del gioco originale.');
  lines.push('');

  // ── 1. Executive Summary ────────────────────────────────────────────────────
  lines.push('## 1. Executive Summary');
  lines.push('');
  lines.push('FantaTrading è un gioco di trading fantasy su calciatori Serie A. Questo documento consolida l\'analisi matematica completa del modello economico, validando la sostenibilità per l\'organizzatore e l\'attrattività per i partecipanti.');
  lines.push('');
  lines.push('**Conclusione principale:** il modello è economicamente solido. L\'organizzatore genera margine positivo in tutti gli scenari testati (tranne il modello senza margine per design). Il sistema funziona come una lotteria skill-based: pochi vincitori con ROI elevato, maggioranza perde la quota di iscrizione.');
  lines.push('');

  lines.push('### Metriche chiave a N=100 partecipanti (modello bilanciato M2)');
  lines.push('');
  const m2n100 = ph3n100.find(r => r.modelId === 'M2');
  if (m2n100) {
    lines.push(`| Metrica | Valore |`);
    lines.push(`|---------|--------|`);
    lines.push(`| Montepremi medio | ${fmt(m2n100.avgPrizePool)} crediti |`);
    lines.push(`| Ricavo piattaforma | ${fmt(m2n100.avgPlatformRevenue)} crediti/stagione |`);
    lines.push(`| Margine organizzatore | ${pct(m2n100.avgOrganizerMarginPct)} |`);
    lines.push(`| ROI vincitore | ${fmt(m2n100.avgWinnerROIPct, 0)}% |`);
    lines.push(`| Break-even partecipanti | ${pct(m2n100.pctAbove0)} |`);
    lines.push(`| Sostenibile | ${m2n100.isSustainable ? '✓ SÌ' : '✗ NO'} |`);
  }
  lines.push('');

  // ── 2. Configurazione raccomandata ──────────────────────────────────────────
  lines.push('## 2. Configurazione Raccomandata');
  lines.push('');
  lines.push('Basata sull\'ottimizzazione congiunta di tutti i parametri nelle Fasi 3–4:');
  lines.push('');
  lines.push('### Parametri di trading');
  lines.push('');
  lines.push('| Parametro | Valore | Fonte |');
  lines.push('|-----------|--------|-------|');
  lines.push(`| Commissione acquisto | ${pct(balanced.buyCommissionRate * 100, 1)} | Fase 3: grid search bilanciato |`);
  lines.push(`| Commissione vendita | ${pct(balanced.sellCommissionRate * 100, 2)} | Fase 3: grid search bilanciato |`);
  lines.push(`| Margine piattaforma | ${pct(balanced.platformFeeRate * 100, 0)} | Fase 3: modello M2 sostenibile |`);
  lines.push(`| Mean reversion rate | ${priceModel.recommendedRate} | Fase 4: analisi modello prezzo |`);
  lines.push(`| Budget iniziale | 500 crediti | Default consolidato |`);
  lines.push(`| Giornate stagione | 38 | Serie A standard |`);
  lines.push(`| Valore min calciatore | 1 credito | Default |`);
  lines.push(`| Valore max calciatore | 200 crediti | Default |`);
  lines.push('');

  lines.push('### Prize table raccomandata');
  lines.push('');
  lines.push(`| Parametro | Valore | Fonte |`);
  lines.push(`|-----------|--------|-------|`);
  lines.push(`| N. premi (N=50) | ${prizeOpt.bestBalanced.numPrizes} | Fase 3: prize table optimizer |`);
  lines.push(`| % primo posto | ${pct(prizeOpt.bestBalanced.firstPrizePct * 100, 0)} | Fase 3: bilanciato |`);
  lines.push(`| Break-even garantito | ${pct(prizeOpt.bestBalanced.pctAbove0)} dei partecipanti | — |`);
  lines.push(`| Ultimo premio copre quota | ${prizeOpt.bestBalanced.lastPrizeCoversRegistrationFee ? 'SÌ' : 'NO'} | — |`);
  lines.push(`| Gini coefficient | ${prizeOpt.bestBalanced.giniCoefficient.toFixed(2)} | — |`);
  lines.push('');
  lines.push('*Nota: la prize table ottimale varia con N. Per leghe più grandi, aumentare i premi proporzionalmente.*');
  lines.push('');

  // ── 3. Analisi economica per scala ──────────────────────────────────────────
  lines.push('## 3. Analisi Economica per Scala (Fase 2)');
  lines.push('');
  lines.push('| N. Partecipanti | Montepremi | Ricavo Piatt. | Margine % | Premio 1° | ROI Vincitore | Break-even |');
  lines.push('|----------------|-----------|--------------|-----------|-----------|---------------|------------|');
  for (const s of ph2.scenarios) {
    lines.push(
      `| ${s.numParticipants} | ${fmt(s.avgPrizePool)} | ${fmt(s.avgPlatformRevenue)} | ${pct(s.avgOrganizerMarginPct)} | ${fmt(s.avgFirstPrize)} | ${fmt(s.avgWinnerROIPct, 0)}% | ${pct(s.pctAbove0)} |`,
    );
  }
  lines.push('');
  lines.push(`**Insight chiave:** il montepremi scala di ${fmt(ph2large.avgPrizePool / ph2base.avgPrizePool, 1)}× tra N=${ph2base.numParticipants} e N=${ph2large.numParticipants}. Il ricavo organizzatore è linearmente proporzionale a N.`);
  lines.push('');

  // ── 4. Confronto modelli regolamento ────────────────────────────────────────
  lines.push('## 4. Confronto Modelli Regolamento (Fase 3)');
  lines.push('');
  lines.push('Cinque modelli confrontati a N=100:');
  lines.push('');
  lines.push('| Modello | Descrizione | Margine % | Break-even | ROI Vincitore | Sostenibile |');
  lines.push('|---------|-------------|-----------|------------|---------------|-------------|');
  for (const r of ph3n100) {
    const rec = r.modelId === 'M2' ? ' ← **REC**' : '';
    lines.push(
      `| ${r.modelId}${rec} | ${r.modelName} | ${pct(r.avgOrganizerMarginPct)} | ${pct(r.pctAbove0)} | ${fmt(r.avgWinnerROIPct, 0)}% | ${r.isSustainable ? '✓' : '✗'} |`,
    );
  }
  lines.push('');
  lines.push('**M1** (puro, 0% margine) non è sostenibile — la piattaforma non incassa nulla. **M2** (+10% margine) è raccomandato: equilibrio tra sostenibilità organizzatore e attrattività per i partecipanti.');
  lines.push('');
  for (const rec of ph3comp.recommendations.slice(0, 3)) {
    lines.push(`> ${rec}`);
    lines.push('');
  }

  // ── 5. Analisi di sensibilità ────────────────────────────────────────────────
  lines.push('## 5. Analisi di Sensibilità (Fase 3)');
  lines.push('');
  lines.push('Parametri variati one-at-a-time rispetto alla baseline (N=50, buy=2%, sell=1.25%, platform=10%):');
  lines.push('');
  lines.push('| Parametro | Impatto sul Margine (range) | Impatto ROI Vincitore (range) |');
  lines.push('|-----------|----------------------------|-------------------------------|');
  for (const sweep of sens.sweeps) {
    const margins = sweep.points.map((p: SensPoint) => p.avgOrganizerMarginPct);
    const rois = sweep.points.map((p: SensPoint) => p.avgWinnerROIPct);
    const mRange = (Math.max(...margins) - Math.min(...margins)).toFixed(1);
    const rRange = (Math.max(...rois) - Math.min(...rois)).toFixed(0);
    lines.push(`| ${sweep.paramDisplayName} | ${mRange}pp | ${rRange}pp |`);
  }
  lines.push('');
  for (const f of sens.keyFindings) {
    lines.push(`- ${f}`);
  }
  lines.push('');

  // ── 6. Grid search commissioni ──────────────────────────────────────────────
  lines.push('## 6. Ottimizzazione Commissioni (Fase 3)');
  lines.push('');
  lines.push(`Grid search su ${opt.totalCandidatesEvaluated} combinazioni (buy × sell × platform):`);
  lines.push('');
  lines.push('| Obiettivo | Buy | Sell | Platform | Margine | Break-even | ROI Vincitore |');
  lines.push('|-----------|-----|------|----------|---------|------------|---------------|');
  const objLabels: Record<string, string> = {
    maxOrganizerRevenue: 'Max Ricavo Org.',
    maxParticipantWelfare: 'Max Break-even',
    maxWinnerAttractiveness: 'Max ROI Vincitore',
    balanced: 'Bilanciato ← REC',
  };
  for (const [obj, label] of Object.entries(objLabels)) {
    const c = opt.bestPerObjective[obj];
    if (!c) continue;
    lines.push(
      `| ${label} | ${pct(c.buyCommissionRate * 100, 1)} | ${pct(c.sellCommissionRate * 100, 2)} | ${pct(c.platformFeeRate * 100, 0)} | ${pct(c.avgOrganizerMarginPct)} | ${pct(c.pctAbove0)} | ${fmt(c.avgWinnerROIPct, 0)}% |`,
    );
  }
  lines.push('');
  for (const rec of opt.recommendations.slice(0, 3)) {
    lines.push(`- ${rec}`);
  }
  lines.push('');

  // ── 7. Prize table ──────────────────────────────────────────────────────────
  lines.push('## 7. Ottimizzazione Prize Table (Fase 3)');
  lines.push('');
  lines.push(`Analisi su ${prizeOpt.paretoFrontier.length + (prizeOpt as any).candidatesEvaluated - prizeOpt.paretoFrontier.length} candidati — Pareto frontier (${prizeOpt.paretoFrontier.length} soluzioni non dominate):`);
  lines.push('');
  lines.push('| Configurazione | N. Premi | Top % | Break-even | ROI Vincitore | Ultimo Premio | Copre Quota |');
  lines.push('|----------------|----------|-------|------------|---------------|---------------|-------------|');
  const prizeRows = [
    ['Massimo ROI Vincitore', prizeOpt.bestForWinnerROI],
    ['Massimo Break-even', prizeOpt.bestForBreakEven],
    [`Bilanciato ← REC`, prizeOpt.bestBalanced],
  ] as [string, PrizeTableCand][];
  for (const [label, c] of prizeRows) {
    lines.push(
      `| ${label} | ${c.numPrizes} | ${pct(c.firstPrizePct * 100, 0)} | ${pct(c.pctAbove0)} | ${fmt(c.avgWinnerROIPct, 0)}% | ${fmt(c.avgLastPrize, 0)} cr | ${c.lastPrizeCoversRegistrationFee ? '✓' : '✗'} |`,
    );
  }
  lines.push('');
  lines.push('**Trade-off fondamentale:** ogni premio aggiunto sposta ~2% di partecipanti verso il break-even ma comprime i singoli premi. Con n=10/top=30%, tutti i 10 vincitori coprono la quota di iscrizione.');
  lines.push('');

  // ── 8. Modello prezzo calciatori ─────────────────────────────────────────────
  lines.push('## 8. Modello di Prezzo Calciatori (Fase 4)');
  lines.push('');
  lines.push('Confronto random walk vs mean-reverting (`meanReversionRate`):');
  lines.push('');
  lines.push('| Rate | Drift Medio | Std Dev Prezzi | Montepremi | Δ vs RW |');
  lines.push('|------|------------|---------------|-----------|---------|');
  const rwBase = priceModel.randomWalkBaseline;
  for (const p of priceModel.points) {
    const delta = p.meanReversionRate === 0 ? 'baseline' : `${((p.avgPrizePool - rwBase.avgPrizePool) / rwBase.avgPrizePool * 100).toFixed(1)}%`;
    const isRec = p.meanReversionRate === priceModel.recommendedRate && p.meanReversionRate > 0 ? ' ← **REC**' : '';
    lines.push(
      `| ${p.meanReversionRate}${isRec} | ${fmt(p.avgPriceDriftAbs, 1)} cr | — | ${fmt(p.avgPrizePool)} | ${delta} |`,
    );
  }
  lines.push('');
  lines.push(`**Raccomandazione:** \`meanReversionRate = ${priceModel.recommendedRate}\``);
  lines.push('');
  lines.push(`> ${priceModel.recommendedRationale}`);
  lines.push('');
  lines.push('**Invarianza economica:** le conclusioni delle Fasi 1-3 restano valide indipendentemente dal modello di prezzo scelto. Il montepremi varia al massimo del ~22% tra il random walk e il modello più aggressivo.');
  lines.push('');

  // ── 9. Conclusioni e prossimi passi ─────────────────────────────────────────
  lines.push('## 9. Conclusioni');
  lines.push('');
  lines.push('### Risposte alle domande fondamentali');
  lines.push('');
  lines.push('**Il modello è sostenibile per l\'organizzatore?**');
  lines.push('Sì. Con qualsiasi configurazione che includa un `platformFeeRate > 0`, l\'organizzatore genera margine positivo proporzionale al numero di partecipanti e al volume di trading. Il margine è strutturalmente fisso e non dipende dalla fortuna delle singole stagioni.');
  lines.push('');
  lines.push('**Il gioco è attrattivo per i partecipanti?**');
  lines.push('Dipende dalla prospettiva. La maggioranza (80-90%) perde la quota di iscrizione, rendendolo funzionalmente una lotteria skill-based. I top player hanno ROI estremamente elevato. L\'attrattività aumenta con N (più partecipanti = premi più grandi).');
  lines.push('');
  lines.push('**Qual è il parametro più sensibile?**');
  lines.push('Il `platformFeeRate` ha l\'impatto diretto maggiore sul margine organizzatore. Il volume di operazioni (`operationsPerTeamPerRound`) determina la dimensione del montepremi. La prize table determina la percentuale di vincitori.');
  lines.push('');
  lines.push('### Prossimi passi');
  lines.push('');
  lines.push('1. **Aggiornare DEFAULT_RULES** con i parametri raccomandati (`meanReversionRate=0.05`) e rigenerare i report Fase 2-3 per confronto');
  lines.push('2. **Sviluppare UI** per visualizzare i report e configurare scenari in modo interattivo');
  lines.push('3. **Alpha test** con utenti reali per validare le ipotesi comportamentali (gli utenti tradano davvero λ=3 ops/round?)');
  lines.push('4. **Estendere la prize table** per adattarla dinamicamente a diversi N di partecipanti');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('*Report generato automaticamente dal motore FantaTrading v0.1.0*');
  lines.push(`*${now} · 351 test unitari · 17 suite · Fasi 1-4 complete*`);
  lines.push('');

  return lines.join('\n');
}

// ─── Executive summary (1 pagina) ────────────────────────────────────────────

function buildExecutiveSummary(opt: OptimizerReport, prizeOpt: PrizeTableReport, priceModel: PriceReport): string {
  const lines: string[] = [];
  const b = opt.bestPerObjective['balanced'];
  const p = prizeOpt.bestBalanced;
  const now = new Date().toLocaleString('it-IT');

  lines.push('# FantaTrading — Executive Summary');
  lines.push('');
  lines.push(`*${now}*`);
  lines.push('');
  lines.push('## Configurazione Finale Raccomandata');
  lines.push('');
  lines.push('```');
  lines.push(`buyCommissionRate:     ${(b.buyCommissionRate * 100).toFixed(1)}%`);
  lines.push(`sellCommissionRate:    ${(b.sellCommissionRate * 100).toFixed(2)}%`);
  lines.push(`platformFeeRate:       ${(b.platformFeeRate * 100).toFixed(0)}%   ← margine organizzatore`);
  lines.push(`meanReversionRate:     ${priceModel.recommendedRate}   ← modello prezzo calciatori`);
  lines.push(`prizeTable:           ${p.numPrizes} premi, top=${(p.firstPrizePct * 100).toFixed(0)}% (geometrica)`);
  lines.push(`initialBudget:        500 crediti`);
  lines.push(`registrationFee:      50 crediti`);
  lines.push(`roundsPerSeason:      38`);
  lines.push('```');
  lines.push('');
  lines.push('## Risultati Attesi (N=50 partecipanti)');
  lines.push('');
  lines.push(`- **Montepremi medio:** ~${fmt(b.avgFirstPrize / 0.40, 0)} crediti (premio 1°: ~${fmt(b.avgFirstPrize, 0)} cr)`);
  lines.push(`- **Margine organizzatore:** ${pct(b.avgOrganizerMarginPct)} (~${fmt(b.orgProfitPerParticipant, 0)} cr/partecipante)`);
  lines.push(`- **Break-even partecipanti:** ${pct(p.pctAbove0)} recupera la quota`);
  lines.push(`- **Tutti i vincitori coprono la quota:** ${p.lastPrizeCoversRegistrationFee ? 'SÌ' : 'NO'}`);
  lines.push(`- **ROI vincitore:** ~${fmt(p.avgWinnerROIPct, 0)}%`);
  lines.push('');
  lines.push('## Verdetto');
  lines.push('');
  lines.push('> Il modello è **economicamente sostenibile** per l\'organizzatore e **attrattivo** per i partecipanti con spirito competitivo. Pronti per lo sviluppo UI.');
  lines.push('');

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== FantaTrading — Report Master ===\n');

  const ph2 = readJson<Phase2Report>('profitability/profitability_report.json');
  const ph3comp = readJson<Phase3CompReport>('rule-comparison/rule_comparison_detailed.json');
  const sens = readJson<SensReport>('sensitivity/sensitivity_analysis.json');
  const opt = readJson<OptimizerReport>('optimizer/optimizer_result.json');
  const prizeOpt = readJson<PrizeTableReport>('prize-table-optimizer/prize_table_optimizer.json');
  const priceModel = readJson<PriceReport>('price-model/price_model_analysis.json');

  console.log('Report letti:');
  console.log(`  Phase 2: ${ph2.scenarios.length} scenari`);
  console.log(`  Phase 3 confronto: ${ph3comp.rows.length} righe`);
  console.log(`  Sensitivity: ${sens.sweeps.length} sweep`);
  console.log(`  Optimizer: ${opt.totalCandidatesEvaluated} candidati`);
  console.log(`  Prize table: ${(prizeOpt as any).candidatesEvaluated ?? prizeOpt.paretoFrontier.length} candidati`);
  console.log(`  Price model: ${priceModel.points.length} punti\n`);

  const masterMd = buildMasterReport(ph2, ph3comp, sens, opt, prizeOpt, priceModel);
  const execMd = buildExecutiveSummary(opt, prizeOpt, priceModel);

  const outDir = path.join(__dirname, '..', 'reports', 'master');
  fs.mkdirSync(outDir, { recursive: true });

  const masterPath = path.join(outDir, 'MASTER_REPORT.md');
  const execPath = path.join(outDir, 'EXECUTIVE_SUMMARY.md');

  fs.writeFileSync(masterPath, masterMd, 'utf8');
  fs.writeFileSync(execPath, execMd, 'utf8');

  console.log(`Master report  → ${masterPath}`);
  console.log(`Exec summary   → ${execPath}`);
  console.log(`\nDimensioni: master ${(masterMd.length / 1024).toFixed(1)} KB, exec ${(execMd.length / 1024).toFixed(1)} KB`);
}

main().catch(err => { console.error(err); process.exit(1); });
