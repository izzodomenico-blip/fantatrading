# FantaTrading Engine

Motore matematico e simulativo per verificare la sostenibilità economica del regolamento FantaTrading.

---

## Cos'è FantaTrading

FantaTrading è un gioco di fantamercato in cui i partecipanti comprano e vendono quote di calciatori reali.
I valori dei calciatori variano in base alle prestazioni reali (bonus/malus).
La piattaforma guadagna trattenendo una quota delle commissioni sulle operazioni di mercato.
I partecipanti con il portfolio più prezioso a fine stagione vincono premi dal montepremi.

L'obiettivo di questo progetto è **verificare matematicamente** che il regolamento sia sostenibile:
- la piattaforma genera ricavi sufficienti a coprire i costi operativi;
- il montepremi premia adeguatamente i vincitori rispetto all'investimento iniziale;
- le commissioni non penalizzano eccessivamente i partecipanti attivi.

---

## Struttura del Progetto

```
src/
├── config/       # Parametri configurabili (commissioni, premi, preset simulazione)
├── domain/       # Modelli dati puri (Player, Team, Portfolio, Round, Season, ...)
├── engine/       # Logica di business (mercato, bonus/malus, ROI, montepremi, ranking)
├── simulation/   # Motori di simulazione (Monte Carlo, scenari, stress test)
├── analysis/     # Analisi economiche (break-even, sensibilità, worst-case, ottimizzatore)
├── services/     # Servizi di orchestrazione ad alto livello
└── utils/        # Funzioni di utilità (random, arrotondamento, statistiche)

tests/
├── unit/         # Test unitari per ciascun engine e modulo
├── integration/  # Test di integrazione (simulazioni end-to-end brevi)
└── fixtures/     # Dati di test riproducibili

docs/             # Documentazione del regolamento e delle formule
data/             # Dati storici e di esempio per calibrare le simulazioni
reports/          # Output delle simulazioni e analisi
scripts/          # Script CLI per eseguire simulazioni da terminale
```

---

## Fasi del Progetto

### Fase 1 — Modello matematico e dominio (attuale)
Definire le entità del gioco (Player, Team, Portfolio), i parametri configurabili
e i motori di calcolo (commissioni, bonus/malus, ROI, montepremi, ranking).
**Output:** tutti i file `src/domain/` e `src/engine/` con test unitari verdi.

### Fase 2 — Motore di simulazione
Implementare il simulatore Monte Carlo, lo scenario runner e lo stress tester.
Ogni simulazione genera una stagione completa con N squadre, M operazioni per round,
varianza casuale sui valori dei calciatori.
**Output:** `src/simulation/` funzionante, report in `reports/simulations/`.

### Fase 3 — Analisi economica
Calcolare break-even, analisi di sensibilità alle commissioni, scenari worst-case,
confronto tra varianti del regolamento.
**Output:** `src/analysis/` funzionante, report in `reports/profitability/` e `reports/rule-comparison/`.

### Fase 4 — Ottimizzazione del regolamento
Usare i risultati delle analisi per suggerire parametri ottimali del regolamento
(tasso di commissione, split montepremi, quota piattaforma).
**Output:** `src/analysis/ruleOptimizer.ts`, report in `reports/final/`.

### Fase 5 — Interfaccia (futura)
Dashboard web per visualizzare simulazioni in tempo reale e confrontare scenari.
**Output:** `app/web/` e `app/admin/`.

---

## Quick Start

```bash
npm install
npm test               # esegui tutti i test unitari
npm run test:coverage  # con copertura del codice
npm run build          # compila TypeScript → dist/
npm run simulate       # esegui simulazione di default da CLI
```

---

## Parametri Chiave del Regolamento

| Parametro                   | Valore di default | Descrizione                                      |
|-----------------------------|-------------------|--------------------------------------------------|
| `buyCommissionRate`         | 10%               | Commissione trattenuta sull'acquisto             |
| `sellCommissionRate`        | 10%               | Commissione trattenuta sulla vendita             |
| `prizePoolContributionRate` | 80%               | Quota delle commissioni che va al montepremi     |
| `platformFeeRate`           | 20%               | Quota delle commissioni che va alla piattaforma  |
| `initialBudget`             | 500 crediti       | Budget iniziale per ogni squadra                 |
| `maxPlayersPerPortfolio`    | 25 calciatori     | Numero massimo di calciatori nel portfolio       |
| `roundsPerSeason`           | 38 giornate       | Durata della stagione                            |

Tutti i parametri sono modificabili in `src/config/defaultRules.ts`.

---

## Domande a cui Risponde il Motore

1. Con N squadre e X operazioni medie per giornata, il montepremi finale copre i premi promessi?
2. A quale tasso di commissione la piattaforma raggiunge il break-even?
3. Un giocatore attivo (molte operazioni) ha un ROI peggiore di uno passivo?
4. Qual è lo scenario peggiore per la piattaforma (poche operazioni, bassa partecipazione)?
5. Come cambia la sostenibilità al variare del numero di squadre partecipanti?
