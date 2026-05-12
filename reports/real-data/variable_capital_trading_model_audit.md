# Audit: FREE_ACCESS_VARIABLE_CAPITAL_TRADING_MODEL

**Data:** 2026-05-12
**Versione progetto auditata:** post-intraseason-fix (452 test, 27 suite)
**Scope:** verifica di coerenza concettuale ed economica tra il progetto attuale e il modello teorico FREE_ACCESS_VARIABLE_CAPITAL_TRADING_MODEL (di seguito: FAVC).

---

## 1. Executive Summary

Il progetto FantaTrading è stato sviluppato e simulato interamente su un modello a **budget fisso + quota iscrizione obbligatoria** (500 crediti + registrationFee). Il modello FAVC (accesso libero, capitale variabile in euro, classifica su ROI%) **non è implementato** in nessuna parte del codice attuale.

Le divergenze sono strutturali, non parametriche:

| Dimensione | Modello attuale | Modello FAVC |
|---|---|---|
| Accesso | Quota iscrizione obbligatoria | Libero (zero entry fee) |
| Capitale iniziale | Fisso (500 crediti per tutti) | Variabile (utente decide: 150 / 300 / 1000 €) |
| Unità | Crediti virtuali | Euro reali (o euro virtuali indicizzati) |
| Classifica | Ricchezza totale assoluta (crediti) | ROI percentuale sul capitale versato |
| Deposito portafoglio | Non implementato | Campo obbligatorio per ROI corretto |
| Aggiunta capitale in corsa | Non implementata | Necessaria (acquisto giocatori più costosi) |
| Valore giocatore | Crediti | Euro (34 crediti = 34 €) |
| Montepremi | Sì (da commissioni + quota) | Opzionale / assente nel modello puro |

Il progetto è economicamente coerente con sé stesso, ma rappresenta un **modello alternativo** rispetto al FAVC. Prima di qualsiasi sviluppo backend o UI, occorre scegliere definitivamente quale modello si vuole costruire.

---

## 2. Differenza tra Modello Quota Iscrizione e Modello FAVC

### 2.1 Modello attuale (quota iscrizione + budget fisso)

- Ogni utente paga una quota fissa (10–50 crediti/euro) per iscriversi.
- Riceve un budget uniforme (500 crediti) per comprare calciatori.
- La classifica finale ordina per **ricchezza totale assoluta** (valore rosa + budget residuo).
- Il montepremi viene da commissioni di trading + quota di iscrizione.
- Il ROI percentuale è calcolato nell'engine (`roiEngine.ts`) ma **non è usato per la classifica** (`rankingEngine.ts` usa `totalWealth`).

**Vantaggi:** modello semplice, ben bilanciato (tutti partono allo stesso livello), montepremi prevedibile.

**Svantaggio:** richiede barriera d'ingresso economica; la classifica su ricchezza assoluta è equa solo perché tutti partono con lo stesso budget.

### 2.2 Modello FAVC

- Nessuna quota d'iscrizione.
- Ogni utente decide quanto capitale allocare (es. 150 €, 300 €, 600 €, 1.000 €).
- Un giocatore quotato 34 costa 34 € + commissione.
- La classifica su ricchezza assoluta sarebbe **iniqua**: chi versa 1.000 € ha più capitale da apprezzare.
- La classifica equa è il **ROI percentuale**.
- Il montepremi, se presente, deve essere calcolato separatamente (eventuale).

**Vantaggio:** accesso democratico, nessuna barriera economica, scala naturalmente.

**Svantaggio:** senza quota d'iscrizione il montepremi deve essere finanziato interamente dalle commissioni. La solvibilità dipende dal volume di trading.

### 2.3 Incompatibilità strutturale

I due modelli non sono varianti parametriche dello stesso sistema: hanno strutture dati diverse, regole di classifica diverse, e meccanismi di finanziamento diversi. Non è possibile passare dall'uno all'altro modificando solo `registrationFee = 0`.

---

## 3. Verifica Matematica: Giocatore 34 → 35 con Bonus Voto

### Ipotesi

- Giocatore A: quota iniziale Qt.I = 34, quota finale Qt.A = 35, voto = 7 (non porta bonus diretto alla quotazione in questo round).
- Formula FantaTrading: ogni punto di variazione quotazione = 5% del valore iniziale dell'azione.
- Commissione acquisto: 2% (parametro attuale) o 1.5% (parametro consigliato V1).
- Commissione vendita: 1.25% (parametro attuale) o 3% (parametro consigliato V1).

### 3.1 Valore dell'azione a fine stagione

```
delta_quote = Qt.A - Qt.I = 35 - 34 = +1
trading_return_pct = delta_quote × 5 = +5%
sellValue = Qt.I × (1 + trading_return_pct / 100)
          = 34 × 1.05 = 35.70 €
```

Il valore di vendita non è semplicemente Qt.A (35), ma **35.70 €** per effetto della formula FantaTrading (ogni punto vale il 5% del valore iniziale, non il 5% / 34 del valore corrente).

### 3.2 Formula acquisto (parametri attuali: buy 2%)

```
grossBuy   = 34.00 €
commBuy    = 34.00 × 0.02 = 0.68 €
totalCost  = 34.00 + 0.68 = 34.68 €
```

### 3.3 Formula vendita (parametri attuali: sell 1.25%)

```
grossSell  = 35.70 €
commSell   = 35.70 × 0.0125 = 0.446 €
netProceeds = 35.70 - 0.446 = 35.254 €
```

### 3.4 P&L netto su questo singolo giocatore

```
tradingPnL = netProceeds - totalCost
           = 35.254 - 34.68 = +0.574 €  (+1.66% sul costo)
```

### 3.5 Con parametri V1 consigliati (buy 1.5%, sell 3%)

```
commBuy    = 34.00 × 0.015 = 0.51 €
totalCost  = 34.51 €
commSell   = 35.70 × 0.03  = 1.071 €
netProceeds = 35.70 - 1.071 = 34.629 €
tradingPnL = 34.629 - 34.51 = +0.119 €  (+0.34% sul costo)
```

> Il passaggio da Qt.I=34 a Qt.A=35 (+1 punto) genera un guadagno molto contenuto. Con commissioni totali del 4.5% (buy 1.5% + sell 3%), quasi tutta la plusvalenza del 5% viene erosa. Il guadagno netto diventa positivo solo con variazioni > +1 punto.

---

## 4. Formula Acquisto

```
grossBuy   = quantità × prezzoGiocatore (€)
commBuy    = grossBuy × buyCommissionRate
totalCost  = grossBuy + commBuy
```

Il budget dell'utente diminuisce di `totalCost`.
La commissione `commBuy` va al sistema (piattaforma o montepremi secondo lo split).

**Già implementata in:** `src/engine/marketEngine.ts:calculateBuyCost()`.

---

## 5. Formula Vendita

```
grossSell   = quantità × sellValue
sellValue   = Qt.I × (1 + (Qt.A - Qt.I) × 5 / 100)
commSell    = grossSell × sellCommissionRate
netProceeds = grossSell - commSell
```

Il budget dell'utente aumenta di `netProceeds`.
La commissione `commSell` va al sistema.

**Implementata in:** `src/engine/marketEngine.ts:calculateSellProceeds()` e `src/analysis/historicalPortfolioSimulator.ts:buildPortfolio()`.

**Attenzione:** nel motore di simulazione `marketEngine.ts`, il prezzo di vendita usato è `player.currentValue` (valore corrente del calciatore dopo bonus/malus stagionali), non la formula FantaTrading con Qt.I esplicito. Nei backtest storici la formula FantaTrading è applicata correttamente. In un sistema reale serve allineare i due percorsi.

---

## 6. Formula ROI (Modello FAVC Corretto)

```
ROI = (valoreNettoLiquidabileRosa + depositoPortafoglioVirtuale - capitaleTotaleVersato)
      /
      capitaleTotaleVersato
```

### Esempio numerico (nessun doppio conteggio)

```
capitaleTotaleVersato    = 285 €
valoreNettoLiquidabile   = 295 €   (rosa liquidata al netto commissioni vendita)
depositoPortafoglioVirt  =  15 €   (residuo cash non investito)
totaleFinale             = 295 + 15 = 310 €

utile                    = 310 - 285 = 25 €
ROI                      = 25 / 285 = 8.77%
```

Il valore finale rimane 310 €. **Non** si applica nuovamente il ROI al valore finale (errore di doppio conteggio: 310 × 1.0877 = 337.18 è sbagliato).

### Formula implementata attualmente (roiEngine.ts)

```typescript
grossGains = totalWealth - initialBudget
netROIPercent = (netGains / initialBudget) * 100
```

Dove `totalWealth = team.budget + portfolioValue` e `initialBudget` è fisso (500 crediti).

**Differenza critica rispetto al FAVC:**
- Nel modello attuale `initialBudget` è costante per tutti.
- Nel FAVC `capitaleTotaleVersato` è variabile per utente e può cambiare in corsa (versamenti aggiuntivi).
- Il `portfolioValue` nel modello attuale usa `currentValue` (crediti), non la formula FantaTrading con Qt.I.

---

## 7. Deposito Portafoglio Virtuale

Il deposito portafoglio virtuale è il **cash non investito** che l'utente mantiene nel proprio "conto" (proventi da vendite + capitale non ancora speso + eventuali versamenti aggiuntivi).

### Stato attuale

Nel dominio `Team.ts` esiste solo:
```typescript
{
  budget: number,           // cash disponibile
  totalCommissionsPaid: number
}
```

Il campo `budget` fa tutto: rappresenta sia il capitale iniziale residuo, sia i proventi da vendite, sia il cash aggiuntivo versato. Non c'è distinzione tra:
- Capitale originale versato dall'utente (non speso)
- Proventi da vendite (cash rientrato)
- Versamenti aggiuntivi in corsa

**Nel modello FAVC** questa distinzione è necessaria per calcolare correttamente il denominatore del ROI (`capitaleTotaleVersato`). Un utente che vende un giocatore e non reinveste non ha "versato di più": il deposito virtuale cresce, ma il capitale versato rimane invariato.

**Manca:** campo `totalCapitalDeposited` (o equivalente) che traccia solo i versamenti, non i movimenti interni.

---

## 8. Aggiunta Capitale

Nel modello FAVC, l'utente può comprare un giocatore da 150 € anche se il suo "deposito" corrente è 80 €: versa i 70 € mancanti. Questo aumenta il `capitaleTotaleVersato` e il denominatore del ROI.

### Stato attuale

Non esiste nessun meccanismo di deposito aggiuntivo. Il budget è assegnato una volta sola a inizio stagione (`createTeam(id, name, owner, initialBudget)`). Se il budget scende sotto il costo di un acquisto, l'operazione lancia eccezione (`debitTeam: Budget insufficiente`).

**Manca:**
- Funzione `depositCapital(team, amount): Team` che aumenta `budget` e aggiorna `totalCapitalDeposited`.
- Validazione che impedisca depositi dopo la fine della stagione (o durante particolari fasi).
- Tracciamento cumulativo dei versamenti per il calcolo ROI.

---

## 9. Solvibilità del Sistema

### 9.1 Con capitale reale e sole commissioni

Nella simulazione con parametri V1 consigliati (buy 1.5%, sell 3%, 100% commissioni al sistema):

| Partecipanti | Revenue stimata/stagione |
|---:|---:|
| 20 | 170 € |
| 50 | 426 € |
| 100 | 851 € |
| 250 | 2.128 € |
| 500 | 4.256 € |
| 1.000 | 8.512 € |

*(Fonte: reports/real-data/commission_revenue_model_simulation.md, sezione 7)*

Con un costo operativo ipotetico di 200–500 €/stagione (hosting, sviluppo, supporto), il break-even si raggiunge intorno a 50–100 utenti attivi. Il sistema è **solvibile con sole commissioni** sopra questa soglia.

### 9.2 Con quota iscrizione 30 €

A parità di utenti, la quota aggiunge un entrata fissa indipendente dal volume di trading. Con 100 utenti × 30 € = 3.000 € fissi, il break-even scende a pochissimi utenti. Il montepremi (se 80% va ai premi) diventa 2.400 €.

### 9.3 Confronto di solvibilità

| Parametro | Solo commissioni (FAVC puro) | Commissioni + quota 30 € |
|---|---|---|
| Break-even utenti | ~50-100 | ~10-20 |
| Revenue variabile | Alta (dipende da trading) | Media (commissioni) + Fissa (quota) |
| Rischio N piccolo | Elevato | Basso |
| Accessibilità | Massima | Ridotta (barriera 30 €) |
| Montepremi | Solo da commissioni | Commissioni + quota |

Il modello a sole commissioni è solvibile, ma richiede una massa critica di utenti attivi (>50) per sostenere i costi operativi. Sotto quella soglia è a rischio senza sponsor o capitale proprio dell'organizzatore.

---

## 10. Cosa È Già Implementato

| Componente | File | Stato |
|---|---|---|
| Formula acquisto (commissione sul lordo) | `src/engine/marketEngine.ts` | Implementata |
| Formula vendita (provento netto) | `src/engine/marketEngine.ts` | Implementata |
| Commissioni trattenute dal sistema | `src/engine/prizePoolEngine.ts` | Implementata |
| Formula FantaTrading (1 pt = 5% valore) | `src/analysis/historicalPortfolioSimulator.ts` | Implementata nei backtest storici |
| ROI percentuale (calcolo) | `src/engine/roiEngine.ts` | Calcolato ma non usato per ranking |
| Roster 25 giocatori (3P+8D+8C+6A) | `src/config/defaultRules.ts` | Implementato |
| Limite massimo giocatori per ruolo | `src/config/defaultRules.ts` | Implementato |
| Cambi liberi (nessun limite operazioni) | `src/services/fullSeasonSimulator.ts` | Implementati |
| Commissioni acquisto e vendita separate | `src/config/defaultRules.ts` | Implementate |
| Backtest storico buy-and-hold | `src/analysis/historicalPortfolioSimulator.ts` | Completato |
| Backtest intra-stagione (strategie multiple) | `src/analysis/intraseasonTradingBacktest.ts` | Completato |
| Analisi sensibilità commissioni | `reports/real-data/commission_revenue_model_simulation.md` | Completata |
| Analisi solvibilità piattaforma | `reports/real-data/prize_pool_attractiveness_simulation.md` | Completata |

---

## 11. Cosa Manca (rispetto al modello FAVC)

| Feature FAVC | Stato | Note |
|---|---|---|
| Accesso libero (registrationFee = 0 per default) | **Mancante** | Parametro esiste ma non è il default; tutta la logica di montepremi assume quota |
| Capitale variabile per utente | **Mancante** | `initialBudget` fisso e uniforme per tutti |
| Valore giocatore in euro (non crediti) | **Mancante** | Il motore usa unità "crediti" senza ancoraggio a euro |
| Campo `totalCapitalDeposited` nel Team | **Mancante** | Necessario per denominatore ROI FAVC |
| Funzione `depositCapital()` | **Mancante** | Nessun meccanismo di versamento aggiuntivo |
| Denominatore ROI variabile per utente | **Mancante** | `roiEngine.ts` usa `initialBudget` fisso |
| Classifica su ROI% (non su ricchezza assoluta) | **Mancante** | `rankingEngine.ts` ordina per `totalWealth` |
| Deposito portafoglio virtuale come entità separata | **Mancante** | Cash e proventi da vendite sono unificati in `budget` |
| Rosa costruita con qualsiasi budget | **Mancante** | Il simulatore costruisce rose random rispettando la composizione, non il budget individuale |
| Esempio: rosa da 150 € vs rosa da 1.000 € | **Mancante** | Non simulato né modellato |

---

## 12. Impatto su Backend Teams/Portfolio/Market

I moduli backend `Teams`, `Portfolio`, `Market` attualmente non esistono come codice (il glob `app/backend/src/**/*.ts` non restituisce file). Se implementati seguendo il modello attuale (budget fisso), richiederebbero le seguenti modifiche per supportare FAVC:

### 12.1 Modulo Teams

**Attuale schema Team (dominio):**
```typescript
{ id, name, ownerName, budget, totalCommissionsPaid }
```

**Schema richiesto per FAVC:**
```typescript
{
  id, name, ownerName,
  budget: number,                  // cash disponibile (deposito virtuale)
  totalCapitalDeposited: number,   // somma di tutti i versamenti
  totalCommissionsPaid: number,
  deposits: DepositRecord[]        // storico versamenti con timestamp
}
```

**Impatto:** tutte le funzioni `createTeam`, `debitTeam`, `creditTeam` devono essere aggiornate. Il campo `initialBudget` non ha più senso come costante condivisa.

### 12.2 Modulo Portfolio

Il portfolio attuale usa `portfolioValue = Σ(player.currentValue × shares)`. Nel FAVC:
- `sellValue` deve usare la formula FantaTrading (`Qt.I × (1 + delta × 5/100)`).
- Per calcolare il `valoreNettoLiquidabile` servono le quotazioni di acquisto originali (`Qt.I` per ogni posizione), non solo il valore corrente.
- La struttura `PortfolioEntry` deve memorizzare il `purchasePrice` (Qt.I al momento dell'acquisto).

**Attuale:** `src/domain/Portfolio.ts` — verifica se già memorizza `purchasePrice`.

### 12.3 Modulo Market

Il `marketEngine.ts` attuale è corretto nelle formule (commissioni su lordo, netProceeds). Le modifiche richieste:
- Il prezzo corrente del giocatore per la vendita deve derivare dalla formula FantaTrading, non da `player.currentValue` (che nel simulatore corrisponde alla variazione da bonus/malus, non alla quotazione Fantacalcio).
- Aggiunta operazione `DEPOSIT` per versamenti aggiuntivi di capitale.
- Aggiunta operazione `WITHDRAW` (eventuale, se il regolamento lo consente).

### 12.4 API ROI / Ranking

Il backend deve esporre due endpoint separati:
- `/api/ranking/wealth` — classifica per ricchezza assoluta (utile per debug interno)
- `/api/ranking/roi` — classifica per ROI% sul capitale versato (classifica ufficiale FAVC)

Con la struttura attuale (`rankingEngine.ts`), solo la prima è implementata.

---

## 13. Raccomandazione Finale

Di seguito l'analisi dei quattro modelli possibili con valutazione comparata.

---

### Opzione A — Free Access Reale (FAVC puro, con denaro reale)

**Descrizione:** ogni utente versa denaro reale (es. 150–1.000 €), compra giocatori al loro valore in euro, compete per ROI%. Nessuna quota d'iscrizione. Le commissioni finanziano la piattaforma.

**Pro:**
- Accesso massimamente democratico.
- La competizione su ROI% è equa indipendentemente dal capitale.
- Allineamento con il concetto originale FAVC.

**Contro:**
- **Implicazioni legali gravi:** versamenti reali su una piattaforma che gestisce denaro di terzi richiedono licenze (es. Money Service Business, eventualmente gioco d'azzardo se ci sono premi). In Italia, potrebbe rientrare in normative AAMS/ADM.
- Break-even difficile con pochi utenti se non c'è montepremi attrattivo.
- Tutti i valori devono essere in euro, non crediti.

**Raccomandazione:** sconsigliato per il lancio senza analisi legale approfondita.

---

### Opzione B — Free Access Virtuale (FAVC con crediti virtuali, premi opzionali)

**Descrizione:** accesso libero, capitale virtuale deciso dall'utente (es. 150–1.000 crediti), nessuna quota iscrizione. La competizione è su ROI%. Eventuale montepremi fisico solo con sponsorship esplicita o donazioni volontarie.

**Pro:**
- Nessun problema legale (nessun denaro reale in gioco).
- Massima accessibilità.
- ROI% è equo con capitali diversi.
- Può evolvere verso il modello reale in futuro.

**Contro:**
- Senza premi reali, la motivazione competitiva è solo reputazionale.
- Il backend deve implementare `totalCapitalDeposited` e `depositCapital()`.
- La classifica su ROI% richiede modifica del `rankingEngine`.

**Raccomandazione:** **ottima scelta per un MVP/pilot** gratuito. Richiede modifiche strutturali al modello dominio (Team, Portfolio, Ranking), ma non richiede licenze né gestione denaro reale.

---

### Opzione C — Modello Quota Iscrizione (modello attuale)

**Descrizione:** ogni utente paga una quota fissa (10–50 €), riceve budget uniforme, compete per ricchezza assoluta. Montepremi da commissioni + quote.

**Pro:**
- Già completamente simulato e validato (452 test, 6 stagioni reali analizzate).
- Modello economico chiaro e prevedibile.
- Classifica su ricchezza assoluta è equa (tutti partono allo stesso livello).
- Modelli M1–M5 già ottimizzati; parametro consigliato: M5 (quota 10 + 10% margine).

**Contro:**
- Richiede barriera economica d'ingresso.
- Se la quota è reale, valgono le stesse considerazioni legali dell'Opzione A (anche se in scala minore).
- Non è il modello FAVC originale.

**Raccomandazione:** adatto se si vuole un prodotto con montepremi reale e community pagante. Richiede però chiarimento legale sulla natura della quota.

---

### Opzione D — Modello Ibrido (Free Access + Capitale Virtuale + Premi Opzionali)

**Descrizione:** accesso libero, capitale virtuale variabile (utente decide), ROI% per la classifica. Premi opzionali: se gli utenti vogliono competere per premi reali, versano volontariamente una quota di partecipazione al montepremi (opt-in, non obbligatoria).

**Pro:**
- Unisce i vantaggi di A e B: accessibilità totale + incentivo economico per chi lo vuole.
- Il montepremi opt-in è più difendibile legalmente (contributo volontario a un fondo comune, non obbligo).
- La competizione su ROI% rimane equa per tutti i partecipanti (con o senza quota).
- Permette una transizione graduale: prima fase virtual-only, poi fase con opt-in se la community cresce.

**Contro:**
- La complessità del modello dati aumenta (partecipanti con quota vs senza quota).
- Il montepremi con opt-in richiede separazione contabile.
- Ancora da analizzare dal punto di vista legale (anche qui, se c'è un fondo condiviso con payout ai vincitori, potrebbe avere implicazioni).

**Raccomandazione:** **la scelta più promettente a lungo termine**, ma richiede progettazione attenta. Per il pilot iniziale, si può partire con solo la parte virtuale (Opzione B) e aggiungere l'opt-in nella versione successiva.

---

### Sintesi raccomandazione

```
PILOT (0-3 mesi):     Opzione B — Free Access Virtuale
                       Nessun denaro reale. Classifica su ROI%.
                       Obiettivo: validare engagement e comportamento utenti.

V1 (3-12 mesi):       Opzione D — Modello Ibrido
                       Free Access + quota opt-in per montepremi.
                       Obiettivo: monetizzazione graduale con base utenti consolidata.

V2 (>12 mesi):        Opzione C o A, a seconda dell'analisi legale.
                       Solo se la piattaforma ha una base utenti sufficiente e
                       ha ricevuto parere legale su gestione denaro/montepremi.
```

---

### Priorità di implementazione per Opzione B (FAVC Virtuale)

Prima di qualsiasi sviluppo backend/UI, aggiornare il dominio:

1. **`Team`**: aggiungere `totalCapitalDeposited`, `depositHistory`.
2. **`Portfolio`**: aggiungere `purchasePrice` (Qt.I) per ogni posizione aperta.
3. **`rankingEngine`**: aggiungere classifica su `roiPercent` come metrica primaria.
4. **`roiEngine`**: denominatore variabile per utente (`totalCapitalDeposited` invece di `initialBudget`).
5. **`marketEngine`**: aggiungere operazione `DEPOSIT_CAPITAL`.
6. **Simulatore**: aggiornare per testare scenari con capitali eterogenei (es. 10 utenti da 150 crediti, 10 da 500, 10 da 1.000).

---

*Report generato in sola lettura. Nessun codice, UI, backend o regolamento esistente è stato modificato.*
