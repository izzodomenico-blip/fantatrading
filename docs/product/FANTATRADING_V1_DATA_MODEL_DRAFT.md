# FantaTrading V1 — Modello Dati Preliminare

**Versione:** 1.0  
**Data:** 2026-05-12  
**Stato:** Bozza — da validare con lo stack tecnico scelto  
**Destinatari:** sviluppatori backend, architetti di sistema

---

## Note preliminari

Questo documento descrive le entità principali del sistema, i loro campi e le relazioni. Non è un DDL né uno schema definitivo: è una specifica funzionale del modello dati, indipendente dal database scelto (relazionale o no).

I tipi indicati sono logici (string, number, boolean, datetime, enum). La traduzione in tipi specifici del database è responsabilità del team di sviluppo.

Le relazioni sono espresse come chiavi esterne logiche. La gestione di indici, vincoli e performance è fuori scope di questo documento.

La semantica prodotto corrente è `FREE_ACCESS_VIRTUAL_CAPITAL`: accesso libero, nessuna quota iscrizione obbligatoria, capitale virtuale variabile, ranking principale su ROI%. Alcuni nomi di campo restano legacy per compatibilità (`initialBudget`, `availableBudget`, `PlatformFee`), ma nel modello funzionale vanno letti come capitale virtuale depositato, liquidità virtuale e registro commissioni trattenute dal sistema.

---

## Entità

### 1. User

Rappresenta qualsiasi utente del sistema, sia partecipante che admin.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | Identificatore univoco |
| `email` | string | Univoco nel sistema |
| `passwordHash` | string | Hash della password (bcrypt o equivalente) |
| `firstName` | string | Nome |
| `lastName` | string | Cognome |
| `role` | enum | `PARTECIPANTE`, `ADMIN`, `SUPER_ADMIN` |
| `status` | enum | `ACTIVE`, `DISABLED` |
| `createdAt` | datetime | Data creazione account |
| `updatedAt` | datetime | Ultima modifica |

**Relazioni:**
- Un `User` con ruolo `PARTECIPANTE` può avere molti `Team` (uno per stagione).
- Un `User` con ruolo `ADMIN` può creare e gestire molte `Season`.

**Vincoli:**
- `email` deve essere univoca.
- `role` determina le schermate e le azioni accessibili.

---

### 2. Season

Rappresenta una stagione di gioco.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | Identificatore univoco |
| `name` | string | Es. "FantaTrading 2025/26" |
| `footballSeason` | string | Es. "2025/26" |
| `status` | enum | `CONFIGURATA`, `QUOTAZIONI_CARICATE`, `ISCRIZIONI_APERTE`, `IN_CORSO`, `CHIUSURA`, `TERMINATA` |
| `registrationOpenAt` | datetime | Inizio iscrizioni |
| `registrationCloseAt` | datetime | Fine iscrizioni |
| `startDate` | datetime | Inizio stagione |
| `endDate` | datetime | Fine stagione prevista |
| `totalRounds` | number | Numero giornate (es. 38) |
| `accessModel` | enum | `FREE_ACCESS_VIRTUAL_CAPITAL` per il pilot |
| `entryFeeRequired` | boolean | `false` nel modello base |
| `initialBudget` | number | Legacy: nel modello FAVC non è un budget massimo; usare 0 o leggere come capitale virtuale iniziale |
| `buyCommissionRate` | number | Es. 0.02 (2%) |
| `sellCommissionRate` | number | Es. 0.02 (2%) |
| `commissionRetentionRate` | number | Es. 1.00 (100% delle commissioni trattenute dal sistema) |
| `survivalThreshold` | number | Es. 0.00 (0%) |
| `prizeThreshold` | number | Es. 0.07 (7%), usata per scenari opzionali a premi |
| `prizesEnabled` | boolean | `false` nel modello base; `true` solo per scenari opzionali/premium |
| `noVotePolicy` | enum | `PLAYER_ZERO_TEAM_EXCLUDE`, `EXCLUDE`, `FIVE`, `ZERO`, `PLAYER_MALUS_TEAM_EXCLUDE` |
| `rosterComposition` | object | `{ GK: 3, DEF: 8, MID: 8, FWD: 6 }` |
| `createdBy` | FK → User | Admin che ha creato la stagione |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

**Relazioni:**
- Una `Season` ha molti `Player` (tramite `Quote`).
- Una `Season` ha molti `Team`.
- Una `Season` ha molti `RoundCalculation`.
- Una `Season` può avere un `PrizePool` solo se abilita uno scenario opzionale a premi.

---

### 3. Player

Rappresenta un calciatore reale nel sistema. I dati anagrafici sono indipendenti dalla stagione.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | Identificatore univoco interno |
| `externalId` | string | ID esterno (es. da fonte dati ufficiale), nullable |
| `firstName` | string | |
| `lastName` | string | |
| `role` | enum | `GK` (portiere), `DEF` (difensore), `MID` (centrocampista), `FWD` (attaccante) |
| `realTeam` | string | Nome squadra di calcio reale |
| `createdAt` | datetime | |

**Relazioni:**
- Un `Player` può avere molte `Quote` (una per stagione).
- Un `Player` può avere molti `Vote` (uno per stagione + giornata).
- Un `Player` può essere in molte `PortfolioPosition`.

**Note:** i dati anagrafici di un giocatore non cambiano tra una stagione e l'altra. La squadra reale può cambiare: valutare se tracciare la squadra per stagione o solo quella corrente.

---

### 4. Quote

Rappresenta la quotazione di un giocatore in una stagione specifica. Traccia il valore iniziale, il valore corrente e lo storico delle variazioni.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `seasonId` | FK → Season | |
| `playerId` | FK → Player | |
| `initialQuote` | number | Quotazione all'inizio della stagione (Qt.I) |
| `currentQuote` | number | Quotazione corrente (aggiornata nel tempo) |
| `finalQuote` | number | Quotazione finale (Qt.A), null se stagione non terminata |
| `importedAt` | datetime | Data dell'import che ha caricato questa quota |
| `updatedAt` | datetime | Ultima modifica della quotazione corrente |

**Relazioni:**
- `Quote` appartiene a una `Season` e a un `Player`.
- `Quote` è referenziata da `PortfolioPosition`.

**Vincoli:**
- Coppia (`seasonId`, `playerId`) deve essere univoca.
- `initialQuote` > 0.

**Calcolo valore corrente posizione:**
```
sellValue = max(0, initialQuote × fantasyMultiplier × (1 + (currentQuote − initialQuote) × 5 / 100))
```

---

### 5. Vote

Rappresenta i voti di un calciatore in una specifica giornata di una stagione.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `seasonId` | FK → Season | |
| `round` | number | Numero giornata (1–38) |
| `playerId` | FK → Player | |
| `vote` | number | Voto reale (es. 5.5), null se SV |
| `fantasyVote` | number | Voto fantasy (es. 6.0), null se SV |
| `played` | boolean | `true` se ha un voto valido, `false` se SV |
| `isDerived` | boolean | `true` se lo SV è derivato per assenza nel file, `false` se esplicitamente nel file |
| `importedAt` | datetime | Data dell'import |

**Relazioni:**
- `Vote` appartiene a una `Season`, un `Player` e a un numero di giornata.

**Vincoli:**
- Terna (`seasonId`, `round`, `playerId`) deve essere univoca.
- Se `played = false`, `vote` e `fantasyVote` sono null.

---

### 6. Team

Rappresenta il portafoglio di un partecipante in una stagione specifica.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `userId` | FK → User | Il partecipante |
| `seasonId` | FK → Season | La stagione |
| `status` | enum | `ROSA_INCOMPLETA`, `ROSA_ATTIVA`, `STAGIONE_CONCLUSA` |
| `initialBudget` | number | Legacy: capitale virtuale totale depositato (`totalCapitalDeposited`) |
| `availableBudget` | number | Legacy: liquidità virtuale disponibile (`virtualCashBalance`) |
| `totalCapitalDeposited` | number | Campo concettuale consigliato: capitale virtuale totale depositato |
| `virtualCashBalance` | number | Campo concettuale consigliato: liquidità virtuale disponibile |
| `totalCommissionsPaid` | number | Totale commissioni pagate (acquisto + vendita) |
| `currentPortfolioValue` | number | Valore corrente del portafoglio (ricalcolato dopo ogni operazione/calcolo) |
| `currentTotalWealth` | number | Valore assoluto informativo: portafoglio + liquidità virtuale |
| `currentROI` | number | ROI corrente in percentuale |
| `registeredAt` | datetime | Data iscrizione |
| `updatedAt` | datetime | |

**Relazioni:**
- Un `Team` appartiene a un `User` e a una `Season`.
- Un `Team` ha molte `PortfolioPosition` (i giocatori in rosa).
- Un `Team` ha molte `MarketOperation`.

**Vincoli:**
- Coppia (`userId`, `seasonId`) deve essere univoca (un partecipante può avere al massimo un team per stagione).

---

### 7. PortfolioPosition

Rappresenta la posizione di un singolo giocatore nel portafoglio di un team.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `teamId` | FK → Team | |
| `playerId` | FK → Player | |
| `quoteId` | FK → Quote | La quotazione al momento dell'acquisto |
| `initialQuote` | number | Quotazione Qt.I al momento dell'acquisto (denormalizzato per calcoli) |
| `buyValue` | number | Valore del giocatore al momento dell'acquisto (prima della commissione) |
| `buyCommission` | number | Commissione pagata all'acquisto |
| `totalBuyCost` | number | Costo totale = buyValue + buyCommission |
| `fantasyMultiplier` | number | Moltiplicatore composto dei bonus/malus accumulati (default 1.0) |
| `currentSellValue` | number | Valore di vendita corrente (ricalcolato) |
| `boughtAt` | datetime | |
| `boughtInRound` | number | Giornata in cui è stato acquistato (null se acquistato prima dell'inizio) |
| `status` | enum | `ACTIVE` (in rosa), `SOLD` (venduto) |

**Relazioni:**
- `PortfolioPosition` appartiene a un `Team`.
- `PortfolioPosition` referenzia un `Player` e una `Quote`.

**Vincoli:**
- Un giocatore non può apparire due volte in stato `ACTIVE` nello stesso `Team`.

**Calcolo valore corrente:**
```
currentSellValue = max(0, initialQuote × fantasyMultiplier × (1 + (quote.currentQuote − initialQuote) × 5 / 100))
```

---

### 8. MarketOperation

Rappresenta una singola operazione di acquisto o vendita eseguita da un partecipante.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `teamId` | FK → Team | |
| `playerId` | FK → Player | |
| `positionId` | FK → PortfolioPosition | La posizione creata (acquisto) o chiusa (vendita) |
| `type` | enum | `BUY`, `SELL` |
| `valueAtOperation` | number | Valore del giocatore al momento dell'operazione |
| `commissionRate` | number | Tasso commissione applicato (es. 0.02) |
| `commissionAmount` | number | Importo commissione in crediti |
| `netAmount` | number | Crediti scalati dalla liquidità virtuale (acquisto) o aggiunti (vendita) |
| `budgetBefore` | number | Legacy: liquidità virtuale prima dell'operazione |
| `budgetAfter` | number | Legacy: liquidità virtuale dopo l'operazione |
| `capitalAdded` | number | Capitale virtuale aggiunto dall'acquisto se la liquidità non basta |
| `round` | number | Giornata in cui è avvenuta l'operazione (null se fuori stagione) |
| `executedAt` | datetime | |

**Relazioni:**
- `MarketOperation` appartiene a un `Team`.

**Note:** questa entità è il log immutabile delle operazioni di mercato. Non viene mai modificata dopo la creazione.

---

### 9. RoundCalculation

Rappresenta i risultati del calcolo di una giornata per l'intera stagione.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `seasonId` | FK → Season | |
| `round` | number | Numero giornata |
| `status` | enum | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `ERROR` |
| `calculatedAt` | datetime | Timestamp del completamento |
| `calculatedBy` | FK → User | Admin che ha lanciato il calcolo |
| `totalPlayersWithVote` | number | Numero giocatori con voto valido in questa giornata |
| `totalSvDerived` | number | Numero totale di SV derivati per assenza |
| `avgPortfolioVariation` | number | Variazione media dei portafogli in questa giornata |
| `inputDataHash` | string | Hash dei dati di input (voti + quotazioni) per garantire la riproducibilità |
| `notes` | string | Note dell'admin (es. correzioni applicate) |

**Relazioni:**
- `RoundCalculation` appartiene a una `Season`.
- Un `RoundCalculation` genera molti `RoundPlayerResult`.

---

### 9a. RoundPlayerResult (sotto-entità di RoundCalculation)

Dettaglio del risultato per ogni giocatore in ogni giornata.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `roundCalculationId` | FK → RoundCalculation | |
| `playerId` | FK → Player | |
| `vote` | number | Voto della giornata (null se SV) |
| `teamBand` | enum | `FASCIA_0`..`FASCIA_4` (della squadra del partecipante che lo detiene) |
| `teamAvg` | number | Media squadra calcolata per questa giornata |
| `bonusPct` | number | Bonus/malus in percentuale applicato (0 se SV) |
| `svStatus` | boolean | `true` se SV in questa giornata |

**Note:** questa entità permette di ricostruire il calcolo di ogni giornata in modo completo.

---

### 10. Ranking

Rappresenta la classifica di una stagione in un dato momento.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `seasonId` | FK → Season | |
| `teamId` | FK → Team | |
| `userId` | FK → User | Denormalizzato per query veloci |
| `position` | number | Posizione in classifica |
| `roi` | number | ROI al momento del calcolo |
| `portfolioValue` | number | Valore portafoglio |
| `totalOperations` | number | Numero totale operazioni eseguite |
| `isFinal` | boolean | `true` se è la classifica finale congelata |
| `calculatedAt` | datetime | Quando è stato calcolato questo snapshot |
| `round` | number | Dopo quale giornata è stato calcolato (null se finale) |

**Relazioni:**
- `Ranking` appartiene a una `Season` e a un `Team`.

**Note:** la classifica viene ricalcolata dopo ogni giornata e salvata come snapshot. La classifica finale (`isFinal = true`) viene congelata alla chiusura della stagione.

---

### 11. PrizePool

Rappresenta la struttura e il montepremi di una stagione solo quando viene attivato uno scenario opzionale/premium a premi. Nel modello base free access può non esistere o restare in stato `DRAFT`.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `seasonId` | FK → Season (1:1) | |
| `totalCommissions` | number | Commissioni totali generate nella stagione |
| `systemCommissionRevenue` | number | Commissioni trattenute dal sistema |
| `prizePoolAmount` | number | Montepremi disponibile solo per scenario opzionale a premi |
| `fundingSource` | enum | `NONE`, `OPTIONAL_ENTRY_FEE`, `SPONSOR`, `DECLARED_PRIZE_FUND` |
| `prizeStructure` | JSON | Array di { position: number, pct: number, amount: number } |
| `status` | enum | `DRAFT`, `CONFIRMED`, `DISTRIBUTED` |
| `confirmedBy` | FK → User | Admin che ha confermato |
| `confirmedAt` | datetime | |

**Relazioni:**
- `PrizePool` appartiene a una `Season`.
- `PrizePool` ha molti `PrizeAward`.

---

### 11a. PrizeAward (sotto-entità di PrizePool)

Rappresenta il premio assegnato a un singolo partecipante.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `prizePoolId` | FK → PrizePool | |
| `teamId` | FK → Team | |
| `userId` | FK → User | Denormalizzato |
| `position` | number | Posizione in classifica al momento dell'assegnazione |
| `roi` | number | ROI finale |
| `amount` | number | Importo del premio in crediti virtuali o in altra forma dichiarata nello scenario opzionale |
| `awardedAt` | datetime | |

---

### 11b. FinalSettlement

Rappresenta lo snapshot auditabile di riscossione virtuale finale del portafoglio. Non rappresenta un pagamento reale.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `seasonId` | FK → Season | |
| `teamId` | FK → Team | |
| `userId` | FK → User | Denormalizzato |
| `totalCapitalDeposited` | number | Capitale virtuale totale depositato |
| `initialRosterCost` | number | Costo lordo delle posizioni attive |
| `virtualCashBalance` | number | Liquidità virtuale disponibile |
| `activePositionsValue` | number | Valore lordo posizioni attive |
| `applyFinalSellCommission` | boolean | `true` nello scenario attuale |
| `finalSellCommissionRate` | number | Commissione vendita usata per la liquidazione |
| `finalSellCommissionAmount` | number | Importo commissione finale |
| `netLiquidationValue` | number | Valore netto liquidabile della rosa |
| `finalLiquidationValue` | number | Valore finale virtualmente riscuotibile |
| `profitLoss` | number | Utile/perdita virtuale |
| `roiPct` | number | ROI percentuale |
| `rankByRoi` | number | Ranking per ROI%, se disponibile |
| `isPrizeEligible` | boolean | Soglia premio opzionale superata |
| `calculatedAt` | datetime | Timestamp calcolo |
| `calculatedBy` | FK → User | Admin che ha calcolato, nullable |

**Nota:** se una stagione è `COMPLETED`, uno snapshot già calcolato deve essere considerato stabile e non sovrascritto.

---

### 12. CommissionLedger

Traccia le commissioni accumulate per giornata e per partecipante. Il 100% delle commissioni acquisto/vendita è trattenuto dal sistema nel modello base.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `seasonId` | FK → Season | |
| `teamId` | FK → Team | Partecipante che ha generato la commissione |
| `operationId` | FK → MarketOperation | Operazione che ha generato la commissione |
| `grossCommission` | number | Commissione lorda generata dall'operazione |
| `systemRetainedAmount` | number | Importo trattenuto dal sistema (grossCommission × commissionRetentionRate) |
| `calculatedAt` | datetime | |

**Note:** questa entità sostituisce concettualmente la vecchia `PlatformFee`. Se il backend mantiene il nome legacy, la semantica corretta è comunque registro delle commissioni trattenute dal sistema.

---

### 13. AuditLog

Traccia tutte le operazioni amministrative.

| Campo | Tipo | Note |
|-------|------|-------|
| `id` | string (UUID) | |
| `userId` | FK → User | Chi ha eseguito l'operazione |
| `seasonId` | FK → Season | Nullable — se l'operazione riguarda una stagione specifica |
| `action` | enum | `IMPORT_QUOTES`, `IMPORT_VOTES`, `CALCULATE_ROUND`, `RECALCULATE_ROUND`, `OPEN_SEASON`, `CLOSE_SEASON`, `ASSIGN_PRIZES`, `DISABLE_USER`, `EXPORT_REPORT` |
| `entityType` | string | Es. "Season", "RoundCalculation", "User" |
| `entityId` | string | ID dell'entità coinvolta |
| `detail` | JSON | Dettaglio dell'operazione (es. numero righe importate, errori) |
| `status` | enum | `SUCCESS`, `ERROR` |
| `errorMessage` | string | Nullable — messaggio di errore se status = `ERROR` |
| `executedAt` | datetime | |

**Vincoli:**
- Non modificabile dopo la creazione. Nessun `UPDATE` o `DELETE` consentito su questa tabella.

---

## Relazioni principali

```
User ──────────────── Team (N:M tramite Team, un User può partecipare a più Season)
Season ──────────────── Team (una Season ha molti Team)
Season ──────────────── Quote (una Season ha molte Quote, una per giocatore)
Season ──────────────── Vote (una Season ha molti Vote)
Season ──────────────── RoundCalculation (una Season ha molti calcoli)
Season ──────────────── PrizePool (1:1)
Team ──────────────── PortfolioPosition (un Team ha molte posizioni)
Team ──────────────── MarketOperation (un Team ha molte operazioni)
Player ──────────────── Quote (un Player ha una Quote per Season)
Player ──────────────── Vote (un Player ha molti Vote nel tempo)
PortfolioPosition ──── Quote (ogni posizione referenzia la sua Quote)
MarketOperation ─────── PortfolioPosition (ogni operazione referenzia la posizione)
RoundCalculation ───── RoundPlayerResult (dettaglio per giocatore)
PrizePool ──────────── PrizeAward (lista vincitori)
Season ──────────────── FinalSettlement (snapshot riscossione finale)
MarketOperation ───── CommissionLedger / PlatformFee legacy (una riga per ogni commissione generata)
```

---

## Calcoli derivati (non salvati, calcolati on-the-fly)

Questi valori non devono necessariamente essere salvati nel database. Vengono calcolati quando necessario:

| Valore | Formula |
|--------|---------|
| Valore corrente posizione | `max(0, initialQuote × fantasyMultiplier × (1 + (currentQuote − initialQuote) × 5 / 100))` |
| Valore totale portafoglio informativo | `Σ currentSellValue(i) + virtualCashBalance` |
| ROI corrente | `(netLiquidationValue + virtualCashBalance − totalCapitalDeposited) / totalCapitalDeposited × 100` |
| Fascia squadra | `f(mediaSquadraGiornata)` secondo tabella soglie |
| Media squadra | `Σ vote(i) / N` su giocatori con voto valido |
| Commissione acquisto | `valueAtOperation × buyCommissionRate` |
| Commissione vendita | `valueAtOperation × sellCommissionRate` |
| Ricavo sistema | `Σ grossCommission × commissionRetentionRate` |

**Nota importante:** il valore corrente della posizione dipende da `fantasyMultiplier`, che è il prodotto composto dei bonus/malus di tutte le giornate passate. Questo valore deve essere aggiornato a ogni calcolo di giornata e salvato in `PortfolioPosition.fantasyMultiplier`.

---

## Enum di riferimento

### PlayerRole
`GK` | `DEF` | `MID` | `FWD`

### UserRole
`PARTECIPANTE` | `ADMIN` | `SUPER_ADMIN`

### SeasonStatus
`CONFIGURATA` | `QUOTAZIONI_CARICATE` | `ISCRIZIONI_APERTE` | `IN_CORSO` | `CHIUSURA` | `TERMINATA`

### TeamStatus
`ROSA_INCOMPLETA` | `ROSA_ATTIVA` | `STAGIONE_CONCLUSA`

### NoVotePolicy
`PLAYER_ZERO_TEAM_EXCLUDE` | `EXCLUDE` | `FIVE` | `ZERO` | `PLAYER_MALUS_TEAM_EXCLUDE`

### TeamBand
`FASCIA_0` | `FASCIA_1` | `FASCIA_2` | `FASCIA_3` | `FASCIA_4`

### OperationType
`BUY` | `SELL`

### AuditAction
`IMPORT_QUOTES` | `IMPORT_VOTES` | `CALCULATE_ROUND` | `RECALCULATE_ROUND` | `OPEN_SEASON` | `CLOSE_SEASON` | `ASSIGN_PRIZES` | `DISABLE_USER` | `EXPORT_REPORT`

---

## Note implementative

1. **Atomicità delle operazioni di mercato:** l'acquisto e la vendita devono essere atomici. In un database relazionale, usare transazioni. Se il sistema non garantisce atomicità, liquidità virtuale, capitale virtuale depositato e posizione possono andare in stato inconsistente.

2. **Ricalcolo fantasyMultiplier:** dopo ogni calcolo di giornata, `fantasyMultiplier` di ogni posizione attiva deve essere aggiornato moltiplicandolo per `(1 + bonusPct / 100)` della giornata. Questo aggiornamento deve essere parte della transazione del calcolo giornata.

3. **Immutabilità dell'AuditLog:** la tabella `AuditLog` non deve mai subire UPDATE o DELETE. Se si usa un database relazionale, valutare permessi a livello di database o una write-once append table.

4. **Storico quotazioni:** la versione corrente del modello non traccia lo storico delle quotazioni intermedie (solo `initialQuote` e `currentQuote`). Se si vogliono grafici di andamento della quotazione giornata per giornata, aggiungere una tabella `QuoteHistory` con `(quoteId, round, value, updatedAt)`.

5. **Soft delete:** l'entità `User` usa il campo `status = DISABLED` invece di cancellazione fisica, per preservare l'integrità referenziale con `Team`, `MarketOperation` e `AuditLog`.
