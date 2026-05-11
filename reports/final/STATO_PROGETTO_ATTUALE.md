# FantaTrading — Stato del Progetto: Audit Completo

**Data audit:** 11/05/2026  
**Scopo:** chiarezza assoluta su cosa è reale, cosa è fittizio e cosa manca.

---

## 1. Moduli Creati

### `src/config/` — Configurazione
| File | Contenuto |
|------|-----------|
| `defaultRules.ts` | Interfaccia `TradingRules` + costante `DEFAULT_RULES` (commissioni, budget, prize pool, mean reversion). Unica fonte di verità dei parametri. |
| `prizeTables.ts` | 3 prize table hardcoded: DEFAULT (top 6), SMALL (top 3), WINNER_TAKES_ALL. |
| `ruleModels.ts` | 5 modelli di regolamento (M1–M5) con commissioni e quote diverse. |
| `simulationPresets.ts` | Preset per il vecchio simulatore (ora non usato). |

### `src/domain/` — Entità di Dominio
Definizioni TypeScript pure (interfacce + costruttori): `Player`, `Team`, `Portfolio`, `MarketOperation`, `Round`, `Season`. Non contengono logica di business — sono solo tipi.

### `src/engine/` — Motori di Calcolo
| File | Cosa calcola |
|------|-------------|
| `marketEngine.ts` | `calculateBuyCost`, `calculateSellProceeds` — commissioni acquisto/vendita |
| `bonusMalusEngine.ts` | `calculateBonusMalus` — conversione statistiche → variazione valore calciatore |
| `prizePoolEngine.ts` | `splitCommission`, `calculatePrizeDistribution` — distribuzione montepremi |
| `rankingEngine.ts` | Ordinamento squadre per ricchezza totale |
| `roiEngine.ts` | ROI netto/lordo per squadra |
| `seasonEngine.ts` | Orchestrazione stagione (usato dal vecchio simulatore, non da fullSeasonSimulator) |

### `src/services/` — Servizi Principali
| File | Ruolo |
|------|-------|
| `fullSeasonSimulator.ts` | **Cuore del progetto.** Simula una stagione completa con Monte Carlo. |
| `dataLoader.ts` | Carica `players.json` e `league_configs.json` da `data/examples/`. |
| `scenarioAnalyzer.ts` | Analisi comparativa Fase 2 (5 scenari per scala). |
| `reportWriter.ts` | Scrittura JSON/CSV su disco. |
| `ruleComparisonEngine.ts` | Confronto 5 modelli × 5 N = 25 scenari (Fase 3). |

### `src/simulation/` — Codice Legacy (NON USATO dagli script)
`monteCarloSimulator.ts`, `scenarioRunner.ts`, `stressTestRunner.ts` erano il simulatore di Fase 1. Sono stati rimpiazzati da `fullSeasonSimulator.ts`. I test di `breakEvenAnalysis` li usano indirettamente, ma nessuno script npm li chiama.

### `src/analysis/` — Analisi Avanzate (Fase 3–4)
| File | Funzione |
|------|---------|
| `sensitivityAnalysis.ts` | One-at-a-time su 7 parametri |
| `ruleOptimizer.ts` | Grid search 150 combinazioni (buy×sell×platform) |
| `prizeTableOptimizer.ts` | Grid search 42 configurazioni prize table |
| `priceModelAnalysis.ts` | Confronto 6 valori di meanReversionRate |
| `breakEvenAnalysis.ts` | Formula analitica break-even operazioni (non monte carlo) |
| `profitabilityAnalysis.ts` | Analisi sul vecchio MonteCarloResult (non usata dagli script) |
| `worstCaseAnalysis.ts` | Analisi worst-case sul vecchio simulatore (non usata) |

### `src/utils/`
- `randomUtils.ts`: RNG LCG seedabile, campionamento Poisson, Box-Muller per normale
- `mathUtils.ts`: mean, stdDev, percentile, clamp
- `statsGenerator.ts`: genera statistiche casuali per partita (gol, assist, cartellini, voto)

---

## 2. Calcoli Realmente Implementati

Il simulatore principale (`fullSeasonSimulator.ts`) implementa il seguente loop:

```
PER ogni stagione (run):
  PER ogni giornata (38):
    PER ogni calciatore (100):
      1. Genera statistiche casuali (gol/assist/cartellini/voto) con probabilità fisse
      2. Calcola bonus/malus in crediti secondo la tabella DEFAULT_BONUS_MALUS_RULES
      3. Applica bonus/malus al valore corrente del calciatore
      4. Applica mean reversion: valore += (baseValue - valore) * 0.05
    
    PER ogni squadra (N):
      1. Estrae numOps ~ Poisson(λ=3) — numero operazioni casuali
      2. PER ogni operazione:
         - Sceglie casualmente BUY (55%) o SELL (45%)
         - Sceglie casualmente un calciatore
         - Esegue acquisto/vendita se il budget lo permette
         - Accumula la commissione nel totale
  
  FINE STAGIONE:
    1. Calcola valore portfolio finale di ogni squadra
    2. Calcola montepremi = commissioni_trading × (1-platformFeeRate) + quota_iscrizione × (1-regPlatformRate)
    3. Calcola ricavo_piattaforma = commissioni_trading × platformFeeRate + quota_iscrizione × regPlatformRate
    4. Ordina squadre per ricchezza_totale (budget + valore_portfolio)
    5. Distribuisce premi ai top N secondo la prize table
    6. Calcola ROI: (premio - quota_iscrizione) / quota_iscrizione
```

I calcoli finanziari sono **algebricamente corretti**: la somma (montepremi + ricavo_piattaforma) è sempre uguale a (commissioni + quote_iscrizione). La conservazione del valore è verificata dai test.

---

## 3. Dati Mock / Fittizi

### 3a. Lista calciatori (`data/examples/players.json`)
100 calciatori con nomi reali di Serie A (Osimhen, Barella, Leão, ecc.) ma:
- **Il `baseValue` è assegnato manualmente** — non è quotazione reale di alcuna piattaforma
- **I club riflettono una stagione passata** (Koulibaly al Chelsea, Lukaku all'Inter, Milinkovic-Savic alla Lazio): i dati sono statici e parzialmente obsoleti
- La distribuzione dei valori va da 4 a 50 crediti, arbitrariamente scalata

### 3b. Statistiche di partita (`statsGenerator.ts`)
Le probabilità usate nella simulazione sono **stime plausibili ma non calibrate**:

| Parametro | Valore usato | Fonte |
|-----------|-------------|-------|
| P(gol attaccante) | λ = 0.35/partita | Stima manuale |
| P(gol centrocampista) | λ = 0.12 | Stima manuale |
| P(gol difensore) | λ = 0.03 | Stima manuale |
| P(assist) | λ = 0.15–0.18 | Stima manuale |
| P(clean sheet) | 35% per GK/DEF | Stima manuale |
| P(cartellino giallo) | 8% | Stima manuale |
| P(titolare) | 65% | Stima manuale |
| Voto (normale) | μ=6.5, σ=1.0 | Stima manuale |

Nessun parametro è stato ricavato da dati storici reali (ad es. Opta, FBref).

### 3c. Comportamento di trading delle squadre
Le squadre **non hanno strategia**. Ogni round:
- Il numero di operazioni è estratto da una Poisson(λ=3) — un'ipotesi arbitraria
- La scelta BUY/SELL è casuale al 55/45% — nessuna logica di portfolio
- Il calciatore comprato/venduto è scelto uniformemente a caso

Questo non modella utenti reali: nessun momentum trading, nessun value investing, nessuna risposta a notizie.

### 3d. Bonus/malus in crediti (`bonusMalusEngine.ts`)
I valori sono inventati (non derivati da Fantacalcio o altra piattaforma):
- Gol GK = +20 cr, Gol FWD = +7 cr
- Cartellino rosso = −10 cr
- Clean sheet GK = +10 cr

### 3e. Parametro `operationsPerTeamPerRound = 3`
Non validato. L'ipotesi che ogni squadra faccia in media 3 operazioni per giornata (×38 = 114 per stagione) è arbitraria. È il driver principale del montepremi.

---

## 4. Dati Reali Mancanti

| Dato | Impatto | Alternativa usata |
|------|---------|------------------|
| Quotazioni calciatori reali (Fantacalcio, Transfermarkt) | Alto — baseValue errati distorcono il montepremi | Valori manuali da 4 a 50 |
| Statistiche storiche Serie A (gol/assist/voti per giocatore) | Alto — le probabilità di statistiche non riflettono le differenze tra giocatori | Lambda uniformi per ruolo |
| Comportamento utenti reali (quante operazioni fanno) | Alto — λ=3 ops/round potrebbe essere 5× sovrastimato o sottostimato | Assunzione λ=3 |
| Quotazioni di mercato dinamiche (offerta/domanda) | Medio — il prezzo non reagisce al mercato ma solo ai bonus/malus | Bonus/malus lineari |
| Dati da piattaforme simili (Sorare, MPGFL, Fotmob) | Medio — nessun benchmark per commissioni o frequenza trading | Assunzioni teoriche |

---

## 5. Report Generati e Dove Sono

Tutti i report sono in `reports/`:

```
reports/
├── simulations/
│   ├── monte_carlo_results.json      (4.8 KB)  — dati grezzi scenari N=20..500
│   └── scenario_comparison.csv       (1.3 KB)  — tabella comparativa
│
├── profitability/
│   ├── profitability_report.json     (6.8 KB)  — metriche per scenario (Fase 2)
│   └── organizer_analysis.csv        (0.6 KB)
│
├── rule-comparison/
│   ├── rule_comparison_detailed.json (22.2 KB) — 25 scenari (5 modelli × 5 N)
│   ├── rule_comparison_summary.csv   (3.6 KB)
│   └── rule_comparison_report.md     (8.6 KB)
│
├── sensitivity/
│   ├── sensitivity_analysis.json     (24.3 KB) — 7 parametri × 6 valori
│   ├── sensitivity_analysis.csv      (4.3 KB)
│   └── sensitivity_analysis.md       (5.9 KB)
│
├── optimizer/
│   ├── optimizer_result.json         (110.6 KB) — 150 combinazioni + Pareto
│   ├── optimizer_candidates.csv      (12.9 KB)
│   └── optimizer_report.md           (3.4 KB)
│
├── prize-table-optimizer/
│   ├── prize_table_optimizer.json    (63.9 KB) — 42 candidati + Pareto
│   ├── prize_table_candidates.csv    (3.7 KB)
│   └── prize_table_report.md         (2.6 KB)
│
├── price-model/
│   ├── price_model_analysis.json     (3.7 KB)  — 6 rate: 0, 0.02, 0.05..0.20
│   ├── price_model_analysis.csv      (0.5 KB)
│   └── price_model_analysis.md       (2.6 KB)
│
└── master/
    ├── MASTER_REPORT.md              (9.1 KB)  — documento consolidato 9 sezioni
    └── EXECUTIVE_SUMMARY.md          (0.9 KB)  — 1 pagina con configurazione finale
```

---

## 6. Script Disponibili (`npm run ...`)

| Comando | Cosa fa | Tempo ~|
|---------|---------|--------|
| `npm test` | Esegue 199 test in 13 suite | ~6s |
| `npm run phase2` | Simula 5 scenari scala (N=20..500) | ~2s |
| `npm run phase3` | Confronto 5 modelli × 5 N = 25 scenari | ~9s |
| `npm run phase3:sensitivity` | Sensitivity 7 parametri × 6 valori | ~10s |
| `npm run phase3:optimize` | Grid search 150 combinazioni | ~15s |
| `npm run phase3:prize-table` | Grid search 42 prize table | ~7s |
| `npm run phase4:price-model` | Confronto 6 mean reversion rates | ~2s |
| `npm run master` | Genera MASTER_REPORT.md (legge JSON esistenti) | <1s |
| `npm run web:install` | Installa dipendenze dashboard React | una tantum |
| `npm run web:dev` | Avvia dashboard su http://localhost:5173 | — |
| `npm run web:build` | Build produzione in app/web/dist/ | ~2s |

---

## 7. Pagine della Dashboard React

La dashboard (`app/web/`) ha 5 pagine navigabili dalla sidebar:

| Pagina | Route | Contenuto |
|--------|-------|-----------|
| Dashboard | `/` | 4 metric card (margine, montepremi, break-even, ROI vincitore) + configurazione raccomandata in formato codice + bar chart scala |
| Analisi per Scala | `/scala` | Line chart N vs montepremi/ricavo/premio-1° + tabella completa + 3 insight card |
| Modelli Regolamento | `/modelli` | 2 bar chart (margine % e ROI/100 per modello) + tabella N=100 + tabella cross-scala + raccomandazioni |
| Sensibilità e Ottimizzazione | `/sensibilita` | 2 horizontal bar chart impatto parametri + tabella Pareto + tabella bestPerObjective |
| Modello Prezzi | `/prezzi` | Line chart dual-axis (drift e Δmontepremi vs rate) + tabella completa + motivazione raccomandazione + 3 prize table card |

---

## 8. Grafici: Dati Reali vs Mock

**Tutti i grafici sono alimentati dai JSON dei report**, generati dalle simulazioni Monte Carlo. Non esistono dati mock nella dashboard.

| Grafico | Fonte | Cosa rappresenta |
|---------|-------|-----------------|
| Bar chart scala (Dashboard) | `profitability_report.json` | Media di 30–200 run Monte Carlo per scenario |
| Line chart Scala | `profitability_report.json` | Idem sopra |
| Bar chart modelli margine | `rule_comparison_detailed.json` | Media di 100 run, N=100, con parametri dei 5 modelli |
| Bar chart sensitivity | `sensitivity_analysis.json` | Range (max−min) su 6 valori per parametro |
| Pareto scatter | `optimizer_result.json` | 5 soluzioni non dominate su 150 candidate |
| Line chart prezzi | `price_model_analysis.json` | 6 punti, 100 run ciascuno |

**ATTENZIONE:** "Dati reali" significa "dati generati dalla simulazione con i parametri descritti al punto 3". Sono internamente coerenti ma basati su assunzioni non validate con dati storici reali.

---

## 9. Assunzioni Economiche nelle Simulazioni

Le seguenti assunzioni sono **hardcoded** e mai variate nell'analisi principale:

| Assunzione | Valore | Impatto se sbagliata |
|------------|--------|---------------------|
| Budget iniziale per squadra | 500 crediti | Alto: più budget = più trading = più montepremi |
| Quota iscrizione (M1/M2/M3) | 50 crediti | Alto: determina il ROI vincitore |
| Quota iscrizione (M4/M5) | 10 crediti | Alto: M4/M5 non sono comparabili a M1/M2/M3 su questa base |
| Calciatori nel dataset | 100 fissi per stagione | Medio: più calciatori = più diversificazione |
| Stagione = 38 giornate | Fisso (Serie A) | Medio |
| λ operazioni per squadra per giornata | 3.0 | **Critico**: è il driver principale del montepremi |
| Bias acquisto/vendita | 55% buy / 45% sell | Medio |
| Prize table di default (Phase 2/3) | Top 6 (40/25/15/10/6/4%) | Alto: determina break-even% strutturale (6/N) |
| Seed RNG | 42 per tutti gli script | Basso: i risultati sono riproducibili ma non indipendenti tra i test |
| Tutte le squadre partecipano a tutte le giornate | Sempre | Medio: un utente reale potrebbe essere inattivo |

### Assunzione critica non documentata: le quote di iscrizione non sono comparabili tra modelli

I modelli M1/M2/M3 usano registrationFee=50, mentre M4/M5 usano registrationFee=10. Questo rende i ROI non direttamente comparabili: il "ROI vincitore 106.536%" di M4 a N=500 è altissimo perché la quota è 10 crediti, non perché il modello sia migliore.

---

## 10. Confronto con il Regolamento Originale

Sì, il confronto è stato effettuato. Il "regolamento originale" corrisponde a **M1 (Originale Puro)**:
- buy=2%, sell=1.25%, platform=0%, montepremi=100% delle commissioni

Risultato del confronto (N=100):
- M1 ha **margine 0%** per l'organizzatore — non è sostenibile come business
- Il montepremi è il più alto tra tutti i modelli ma la piattaforma non incassa nulla
- La raccomandazione del progetto è M2 (aggiunge 10% di margine) o M5 (quota bassa + 10% margine)

**Limiti di questo confronto:**
- Le commissioni originali (2%/1.25%) sono diverse da DEFAULT_RULES (10%/10%) — c'è inconsistenza tra il "default" e il "modello originale"
- Il regolamento formalizzato (`docs/regolamento_formalizzato.md`) non specifica quale fosse la prize table originale — il progetto usa sempre DEFAULT_PRIZE_TABLE (top 6)
- Nessun confronto con piattaforme reali esistenti (Fantacalcio, Sorare, ecc.)

---

## 11. Test Presenti e Cosa Verificano

**199 test, 13 suite, tutti verdi.**

| Suite | Test | Cosa verificano |
|-------|------|-----------------|
| `marketEngine.test.ts` | ~20 | Calcolo commissioni, totalCost=gross+comm, netProceeds=gross−comm |
| `bonusMalusEngine.test.ts` | ~25 | Gol→crediti per ruolo, malus cartellini, clean sheet, no-play |
| `roiEngine.test.ts` | ~15 | ROI netto/lordo, conservazione valore |
| `prizePoolEngine.test.ts` | ~18 | Split commissions, somma premi = 100% pool |
| `rankingEngine.test.ts` | ~12 | Ordinamento per ricchezza, gestione parità |
| `breakEvenAnalysis.test.ts` | ~10 | Formula break-even analitica (no simulazione) |
| `fullSeasonSimulator.test.ts` | ~15 | Monte Carlo: determinismo del seed, scala proporzionale, split corretto |
| `ruleModels.test.ts` | ~16 | Struttura dei 5 modelli, buildConfig |
| `ruleComparisonEngine.test.ts` | ~17 | 25 scenari, raccomandazioni, Pareto |
| `sensitivityAnalysis.test.ts` | ~18 | 7 sweep, monotonia degli effetti, findings |
| `ruleOptimizer.test.ts` | ~11 | Grid search, Pareto frontier, bestPerObjective |
| `prizeTableOptimizer.test.ts` | ~17 | generateGeometricTable, gini, Pareto |
| `priceModelAnalysis.test.ts` | ~12 | Riduzione drift, invarianza economica, rate raccomandato |

**Cosa NON verificano i test:**
- Che le probabilità statistiche (`statsGenerator.ts`) siano calibrate su dati reali
- Che λ=3 ops/round sia plausibile
- Che i valori hardcoded dei bonus/malus abbiano senso economico
- Nessun test di integrazione end-to-end (dalla lettura players.json alla scrittura del report)
- Nessun test della dashboard React

---

## 12. Cosa Manca per Passare da Simulatore a App Reale

### Livello 1 — Dati reali (prerequisito per qualsiasi validità)
- [ ] **Quotazioni calciatori reali**: API Fantacalcio, Transfermarkt o dataset pubblici FBref
- [ ] **Statistiche storiche per calibrare le probabilità**: quanti gol fa davvero un attaccante medio per partita? (La risposta è ~0.35 per la Serie A, che coincide con l'assunzione, ma va verificata per difensori e centrocampisti)
- [ ] **Benchmark λ operazioni**: quante operazioni fanno davvero gli utenti in piattaforme simili?

### Livello 2 — Infrastruttura applicativa
- [ ] **Backend API**: nessun server, nessun endpoint. Tutto è offline in-process
- [ ] **Database**: nessuna persistenza. Ogni run ricomincia da zero
- [ ] **Autenticazione utenti**: nessuna gestione account
- [ ] **Sistema di pagamento / wallet**: i crediti sono puramente virtuali, senza integrazione a denaro reale o token

### Livello 3 — Logica di gioco reale
- [ ] **Mercato con offerta/domanda**: il prezzo attuale non dipende da quanto una squadra vuole comprare un calciatore — è unilateralmente determinato dai bonus/malus
- [ ] **Calendario reale**: le 38 giornate sono contate, non legate a date reali. Nessuna integrazione con il calendario Serie A
- [ ] **Statistiche reali in tempo reale**: i gol/assist vengono generati casualmente — non ci sono dati live
- [ ] **Vincolo `maxPlayersPerPortfolio=25`**: è definito in `TradingRules` ma **non è mai applicato** nel simulatore (InternalTeam.holdings non ha limite di dimensione)

### Livello 4 — Qualità del prodotto
- [ ] **Dashboard `app/admin/`**: la cartella è vuota — nessun pannello amministratore
- [ ] **Prize table dinamica**: l'ottimizzatore ha trovato n=10/top=30% come ottimale per N=50, ma non si adatta automaticamente al numero di partecipanti della lega
- [ ] **Regolamento dinamico**: i parametri (commissioni, prize table) sono configurabili via codice ma non dall'interfaccia utente
- [ ] **Storico stagioni**: nessun archivio di stagioni passate
- [ ] **Notifiche / engagement**: nessun sistema di notifica per giornate, classifiche, acquisti

### Riepilogo distanza dall'app utilizzabile

```
[Simulatore matematico]  ←— SIAMO QUI
         ↓
[Backend API + DB]
         ↓
[Dati reali (calciatori, statistiche live)]
         ↓
[Logica mercato reale (offerta/domanda)]
         ↓
[Autenticazione + wallet]
         ↓
[App utilizzabile dagli utenti]
```

Il progetto è un **motore di validazione economica** solido e ben testato, non un'applicazione. Dimostra che il modello economico è sostenibile sotto le assunzioni dichiarate. Non può essere "lanciato" senza prima risolvere Livello 1 (dati reali) e Livello 2 (infrastruttura).

---

*Audit generato il 11/05/2026 — nessuna funzionalità aggiunta, solo lettura del codice esistente.*
