# FantaTrading V1 — Architettura Tecnica

**Versione:** 1.0  
**Data:** 2026-05-12  
**Stato:** Bozza — da validare con il team di sviluppo  
**Destinatari:** sviluppatori backend e frontend, tech lead, devops

---

## 1. Panoramica architetturale

FantaTrading V1 è un'applicazione web con tre aree distinte: il portale partecipante, il pannello admin e il motore di calcolo. L'architettura è pensata per essere semplice, manutenibile e verificabile: ogni calcolo deve essere riproducibile e auditabile.

Il sistema non richiede scalabilità estrema in questa fase. La priorità è la correttezza dei calcoli economici, la tracciabilità delle operazioni e la facilità di gestione da parte di un admin non tecnico.

### 1.1 Schema ad alto livello

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                       │
│  ┌─────────────────────┐   ┌─────────────────────────┐  │
│  │  App Partecipante   │   │     Pannello Admin      │  │
│  │  (React / Vite)     │   │     (React / Vite)      │  │
│  └──────────┬──────────┘   └───────────┬─────────────┘  │
└─────────────┼─────────────────────────┼────────────────┘
              │  HTTPS / REST JSON       │
              ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND API (NestJS)                   │
│                                                          │
│  Auth  │  Seasons  │  Players  │  Quotes  │  Votes      │
│  Teams │  Market   │  Calc     │  Rankings│  Prizes      │
│  Reports │ Admin Audit │ Import                          │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                  ▼
┌─────────────────┐ ┌────────────┐ ┌──────────────────┐
│   PostgreSQL    │ │ Job Queue  │ │  File Storage    │
│   (Prisma ORM)  │ │ (BullMQ)   │ │  (locale / S3)   │
└─────────────────┘ └────────────┘ └──────────────────┘
```

### 1.2 Principi architetturali

**Correttezza prima della performance.** I calcoli economici devono essere esatti. La priorità è la correttezza degli arrotondamenti, la coerenza tra portafogli e l'immutabilità dei calcoli confermati.

**Admin-first per MVP 1.** Il primo stadio di sviluppo è il pannello admin con import dati e calcolo giornata. I partecipanti accedono solo dal MVP 2.

**Auditabilità completa.** Ogni operazione di calcolo, import, modifica deve essere tracciata con chi l'ha eseguita, quando e con quale risultato.

**Riproducibilità.** Ogni calcolo di giornata deve poter essere rieseguito dagli stessi dati di input producendo lo stesso output. L'hash dei dati di input viene salvato insieme al risultato.

---

## 2. Stack tecnico consigliato

### 2.1 Frontend

| Componente | Tecnologia | Motivazione |
|------------|------------|-------------|
| Framework | React 18 + TypeScript | Già usato nella dashboard analitica del progetto. Team familiare con lo stack. |
| Build tool | Vite 5 | Già configurato nel progetto. Build veloci, HMR ottimale. |
| Routing | React Router v6 | Standard de facto per SPA React. |
| State management | Zustand o React Query | React Query per il server state (fetch/cache/invalidazione). Zustand per stato UI locale. |
| UI components | shadcn/ui + Tailwind CSS | Componenti accessibili, facilmente personalizzabili, nessun vendor lock-in. |
| Form | React Hook Form + Zod | Validazione lato client coerente con la validazione Zod del backend. |
| Grafici | Recharts | Già usato nella dashboard esistente. |
| HTTP client | Axios o fetch nativo | Axios se si vogliono interceptor centralizzati per auth headers. |

**Note:** L'app partecipante e il pannello admin possono condividere lo stesso progetto Vite con routing protetto per ruolo, oppure essere due build separate. Per V1, una build unica con route protette è sufficiente e riduce la complessità di deploy.

### 2.2 Backend

| Componente | Tecnologia | Motivazione |
|------------|------------|-------------|
| Runtime | Node.js 20 LTS | Stesso ecosistema del progetto TypeScript esistente. |
| Framework | NestJS 10 | Struttura modulare, decoratori, DI nativa, supporto TypeScript di prima classe, ottimo per API REST con moduli separati per dominio. |
| Validazione | class-validator + class-transformer | Standard NestJS. Alternativa: Zod con zod-nestjs. |
| Autenticazione | JWT (access token + refresh token) | Stateless, semplice da implementare in NestJS con passport-jwt. |
| Autorizzazione | Guard NestJS per ruolo | RBAC semplice: `PARTECIPANTE`, `ADMIN`. |
| Password | bcrypt | Standard industriale per hash password. |
| File upload | Multer (NestJS built-in) | Per import CSV/Excel. |

**Alternativa framework:** se si preferisce un approccio più leggero, Fastify + TypeBox offre performance superiori con TypeScript nativo. NestJS è preferibile per la struttura modulare che si adatta meglio alla dimensione del progetto e alla separazione dei domini.

### 2.3 Database

| Componente | Tecnologia | Motivazione |
|------------|------------|-------------|
| Database | PostgreSQL 15+ | Robustezza, transazioni ACID, supporto JSON nativo, ottimo per dati finanziari. |
| ORM | Prisma 5 | TypeScript-first, generazione automatica dei tipi, migration tool integrato, ottima DX. Alternativa: Drizzle (più leggero, SQL-first). |
| Connection pooling | PgBouncer o Prisma connection pool | Necessario in produzione per gestire connessioni concorrenti. |

**Perché Prisma e non Drizzle:** Prisma ha un ecosistema più maturo, migrazioni più robuste e una generazione dei tipi che elimina errori di runtime. Drizzle è valido se si vuole più controllo sul SQL generato. Per V1 con un team piccolo, Prisma riduce il boilerplate.

### 2.4 Job queue

| Componente | Tecnologia | Motivazione |
|------------|------------|-------------|
| Queue | BullMQ + Redis | Per il calcolo giornata asincrono e l'import di file di grandi dimensioni. Redis come broker. |
| Redis | Redis 7 | Richiesto da BullMQ. Può essere usato anche per caching sessioni. |

**Alternativa semplificata per MVP 1:** se il calcolo giornata è sufficientemente veloce (< 30 secondi per N = 100–200 partecipanti), si può eseguire in modo sincrono nella richiesta HTTP e aggiungere la queue solo se necessario. Valutare dopo i primi test di carico.

### 2.5 File storage

| Componente | Tecnologia | Motivazione |
|------------|------------|-------------|
| Storage MVP | File system locale | Semplice per MVP. I file importati vengono salvati in `uploads/` con nome univoco. |
| Storage produzione | MinIO (self-hosted) o AWS S3 | API S3-compatibile. MinIO è free e self-hostable. Migrazione da locale a S3 tramite un singolo adapter. |

I file importati (CSV/Excel voti e quotazioni) devono essere conservati come riferimento per l'audit. Non vengono cancellati dopo l'import.

### 2.6 Deployment MVP

| Componente | Opzione |
|------------|---------|
| Hosting | Un singolo VPS (es. DigitalOcean, Hetzner) per MVP |
| Reverse proxy | Nginx |
| SSL | Let's Encrypt (Certbot) |
| Process manager | PM2 per Node.js |
| Database | PostgreSQL su stesso server o managed (es. Supabase free tier per MVP) |
| CI/CD | GitHub Actions per build e deploy automatico |
| Backup DB | pg_dump schedulato + copia su S3 |

---

## 3. Moduli backend

L'applicazione backend è strutturata in moduli NestJS indipendenti. Ogni modulo ha le proprie entità Prisma, i propri service, controller e guard.

### 3.1 Auth

**Responsabilità:** registrazione, login, refresh token, logout, reset password.

Componenti:
- `AuthController`: endpoint pubblici (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`);
- `AuthService`: logica di autenticazione, generazione e validazione JWT;
- `JwtStrategy` (Passport): valida il token in ogni richiesta protetta;
- `RolesGuard`: verifica che l'utente abbia il ruolo richiesto.

Token:
- Access token: durata breve (15 minuti).
- Refresh token: durata lunga (7 giorni), salvato in database o Redis per poter fare revoca.

### 3.2 Users

**Responsabilità:** gestione profilo utente, cambio password, disattivazione account (admin).

Componenti:
- `UsersController`: endpoint `/users/me` (profilo proprio), `/admin/users` (lista admin);
- `UsersService`: CRUD utenti, cambio stato;
- Nessun endpoint pubblico per elencare utenti.

### 3.3 Seasons

**Responsabilità:** creazione e gestione del ciclo di vita delle stagioni.

Componenti:
- `SeasonsController`: endpoint admin per CRUD stagioni, transizioni di stato;
- `SeasonsService`: logica di business per la creazione e le transizioni;
- Validazione: non è possibile modificare i parametri di una stagione `IN_CORSO`.

Transizioni di stato gestite dal service (non modificabili liberamente):
```
CONFIGURATA → QUOTAZIONI_CARICATE → ISCRIZIONI_APERTE → IN_CORSO → CHIUSURA → TERMINATA
```

### 3.4 Players

**Responsabilità:** anagrafica giocatori. I giocatori sono entità globali, condivise tra stagioni.

Componenti:
- `PlayersController`: ricerca e dettaglio giocatori;
- `PlayersService`: creazione (da import), ricerca per nome/ruolo/squadra;
- I giocatori non vengono cancellati, solo archiviati se non più usati.

### 3.5 Quotes

**Responsabilità:** quotazioni dei giocatori per stagione. Import, validazione, aggiornamento.

Componenti:
- `QuotesController`: endpoint admin per import e aggiornamento;
- `QuotesService`: import da CSV/Excel, validazione, calcolo valore posizioni;
- `QuotesImportValidator`: classe separata per la validazione del file di import.

Logica chiave:
- Import atomico: o passa tutta la validazione, o nessuna riga viene salvata;
- Gli aggiornamenti di quotazione devono ricalcolare `currentSellValue` di tutte le posizioni attive che detengono quel giocatore.

### 3.6 Votes

**Responsabilità:** voti per giornata. Import, validazione, derivazione SV.

Componenti:
- `VotesController`: endpoint admin per import voti;
- `VotesService`: import da CSV/Excel, validazione, derivazione SV per assenza;
- `VotesImportValidator`: validazione file.

Logica derivazione SV:
- Dopo l'import, per ogni giocatore presente in almeno una rosa attiva nella stagione: se non compare nel file voti della giornata, viene creato un record `Vote` con `played = false`, `isDerived = true`.

### 3.7 Teams

**Responsabilità:** portafogli partecipanti. Iscrizione, composizione rosa, valore corrente.

Componenti:
- `TeamsController`: iscrizione a stagione, visualizzazione portafoglio, ROI;
- `TeamsService`: creazione portafoglio, aggiornamento valore, calcolo ROI;

Logica ROI:
```
valoreTotalePortafoglio = Σ currentSellValue(i) + availableBudget
ROI = (valoreTotalePortafoglio − initialBudget) / initialBudget × 100
```

### 3.8 Market Operations

**Responsabilità:** acquisto e vendita giocatori durante la stagione.

Componenti:
- `MarketController`: endpoint acquisto e vendita;
- `MarketService`: logica di business, verifica vincoli, atomicità;

Vincoli verificati prima di ogni operazione:
- Budget sufficiente (acquisto);
- Giocatore non già in rosa (acquisto);
- Ruolo non al massimo (acquisto);
- Giocatore in rosa (vendita);
- Stagione in stato `IN_CORSO`;
- Calcolo non in corso per la giornata corrente (lock temporaneo).

Atomicità: ogni operazione (acquisto o vendita) viene eseguita in una transazione Prisma che aggiorna contemporaneamente `PortfolioPosition`, `MarketOperation`, `Team.availableBudget` e `PlatformFee`.

### 3.9 Calculations

**Responsabilità:** calcolo giornata. Applica bonus/malus, aggiorna valori portafogli, aggiorna ROI.

Componenti:
- `CalculationsController`: endpoint admin per lanciare/verificare il calcolo;
- `CalculationsService`: orchestrazione del calcolo (vedi sezione 6);
- `BonusMalusEngine`: calcolo bonus/malus da tabella ufficiale (riusa la logica del motore TypeScript esistente);
- `CalculationJob` (BullMQ): job asincrono per il calcolo;

Il calcolo è idempotente se si parte dagli stessi dati: rieseguirlo sugli stessi voti produce lo stesso risultato. La riesecuzione è possibile solo se l'admin conferma esplicitamente.

### 3.10 Rankings

**Responsabilità:** classifica partecipanti. Aggiornamento dopo ogni calcolo.

Componenti:
- `RankingsController`: endpoint per classifica generale e classifica soglia premi;
- `RankingsService`: calcolo posizioni, snapshot per giornata;

La classifica viene ricalcolata e salvata come snapshot dopo ogni calcolo di giornata confermato. La classifica finale viene congelata (`isFinal = true`) alla chiusura della stagione.

### 3.11 Prizes

**Responsabilità:** struttura premi e assegnazione.

Componenti:
- `PrizesController`: endpoint admin per configurazione e assegnazione;
- `PrizesService`: calcolo montepremi, assegnazione premi a fine stagione;

### 3.12 Reports

**Responsabilità:** esportazione dati in CSV e JSON.

Componenti:
- `ReportsController`: endpoint per trigger export e download;
- `ReportsService`: generazione file CSV/JSON;
- `ReportBuilder`: classe helper per costruire i file;

I report vengono generati on-demand e non sono salvati permanentemente (o salvati per un tempo limitato con download link).

### 3.13 Admin Audit

**Responsabilità:** tracciamento di tutte le operazioni amministrative.

Componenti:
- `AuditService`: unico servizio scrivibile per il log, chiamato dagli altri service;
- `AuditController`: endpoint admin per consultare il log;

Il `AuditLog` è append-only. Non esiste endpoint di DELETE o UPDATE per questa risorsa. A livello di database, l'utente applicativo non ha permessi di UPDATE/DELETE sulla tabella `audit_logs`.

---

## 4. API Draft

Vedere documento separato: `FANTATRADING_V1_API_DRAFT.md`.

---

## 5. Database Schema Draft

Vedere documento separato: `FANTATRADING_V1_DATABASE_SCHEMA_DRAFT.md`.

---

## 6. Pipeline calcolo giornata

Il calcolo giornata è l'operazione centrale del sistema. Deve essere atomico, tracciabile e riproducibile.

### 6.1 Prerequisiti

Prima che l'admin possa lanciare il calcolo per la giornata N:
- I voti della giornata N devono essere stati importati e confermati.
- La stagione deve essere in stato `IN_CORSO`.
- Non ci deve essere un calcolo già in corso (stato `IN_PROGRESS`) per qualsiasi giornata.

### 6.2 Fasi del calcolo

**Fase 1 — Freeze dei dati di input**

Il sistema acquisisce un "snapshot" immutabile dei dati di input:
- quote correnti di tutti i giocatori della stagione;
- voti della giornata (inclusi SV derivati);
- lista di tutte le `PortfolioPosition` in stato `ACTIVE` al momento del lancio.

Viene calcolato l'hash SHA-256 dell'insieme dei dati di input e salvato in `RoundCalculation.inputDataHash`. Questo permette di verificare in futuro che il calcolo sia stato eseguito sugli stessi dati.

**Fase 2 — Calcolo per ogni team**

Per ogni `Team` con `status = ROSA_ATTIVA`:

1. Recupera tutti i giocatori in rosa (`PortfolioPosition` con `status = ACTIVE`).
2. Per ogni giocatore: cerca il suo `Vote` per questa giornata.
   - Se `played = false` (SV): il giocatore viene escluso dalla media squadra e riceve `bonusPct = 0`.
   - Se `played = true`: il giocatore entra nel calcolo della media squadra.
3. Calcola la media squadra: `Σ vote(i) / N` dove N = numero di giocatori con voto valido.
4. Determina la fascia squadra dalla media (tabella sezione 7.7 della functional spec).
5. Per ogni giocatore con voto valido: applica la tabella bonus/malus ufficiale → `bonusPct = tabella[fascia][voto]`.
6. Aggiorna `fantasyMultiplier` di ogni `PortfolioPosition`: `newMultiplier = currentMultiplier × (1 + bonusPct / 100)`.
7. Ricalcola `currentSellValue` di ogni posizione.
8. Ricalcola `Team.currentPortfolioValue` e `Team.currentROI`.

**Fase 3 — Salvataggio risultati**

Tutti gli aggiornamenti della Fase 2 vengono eseguiti in una singola transazione Prisma:
- aggiornamento di tutti i `PortfolioPosition.fantasyMultiplier` e `currentSellValue`;
- aggiornamento di tutti i `Team.currentPortfolioValue` e `currentROI`;
- creazione dei record `RoundPlayerResult` per ogni giocatore con voto;
- aggiornamento dello stato di `RoundCalculation` da `IN_PROGRESS` a `COMPLETED`.

Se la transazione fallisce per qualsiasi motivo, tutti gli aggiornamenti vengono annullati e `RoundCalculation.status` passa a `ERROR`.

**Fase 4 — Aggiornamento classifica**

Dopo il completamento della transazione di calcolo:
- ricalcola le posizioni in classifica ordinando i team per `currentROI` decrescente;
- salva uno snapshot in `Ranking` con `round = N`, `isFinal = false`.

**Fase 5 — Notifiche**

Il sistema crea le notifiche per tutti i partecipanti: "Calcolo giornata N completato".

### 6.3 Riesecuzione del calcolo

Un calcolo già eseguito può essere rieseguito dall'admin solo in caso di correzione dei dati di input (voti errati). Il processo:
1. L'admin corregge i voti (nuova importazione per la giornata).
2. L'admin lancia il rieseguio con conferma esplicita.
3. Il sistema: annulla i `RoundPlayerResult` esistenti, ripristina i `fantasyMultiplier` ai valori pre-calcolo (usando i `RoundPlayerResult` storici), poi esegue il calcolo da capo.
4. Il `RoundCalculation` precedente viene marcato come `SUPERSEDED`, ne viene creato uno nuovo.
5. Tutto viene tracciato nell'audit log con nota della correzione.

### 6.4 Considerazioni sull'esecuzione asincrona

Per N ≤ 200 partecipanti con 25 giocatori ciascuno, il calcolo elabora al massimo 5.000 posizioni per giornata. Con PostgreSQL e Prisma in batch, il tempo atteso è < 5 secondi. Questo rende l'esecuzione sincrona nella richiesta HTTP accettabile per MVP.

Se il numero di partecipanti cresce (N > 500) o se si aggiungono notifiche push, si raccomanda di spostare il calcolo su un job BullMQ con polling lato admin per verificare il completamento.

---

## 7. Sicurezza e auditabilità

### 7.1 Autenticazione e autorizzazione

- JWT con access token a breve durata (15 minuti) e refresh token a lunga durata (7 giorni).
- Il refresh token viene salvato in database per poter fare revoca esplicita (es. cambio password, logout da tutti i dispositivi).
- Route guard NestJS verifica il ruolo per ogni endpoint: `PARTECIPANTE` non può accedere a endpoint `/admin/*`.
- Rate limiting sugli endpoint di login e registrazione (es. 10 tentativi per minuto per IP) tramite `@nestjs/throttler`.

### 7.2 Protezione delle operazioni di mercato

- Ogni operazione di mercato viene eseguita in una transazione serializzabile per evitare race condition (due acquisti simultanei dello stesso giocatore da parte dello stesso utente).
- Il controllo del budget disponibile avviene all'interno della transazione, non prima.
- Un lock ottimistico sul `Team` (campo `version` con incremento a ogni modifica) può essere aggiunto se si prevede alto carico concorrente.

### 7.3 Immutabilità dei calcoli

- I record `RoundCalculation` e `RoundPlayerResult` non vengono mai modificati dopo il completamento: vengono sostituiti (nuovo record) in caso di riesecuzione, e il vecchio viene marcato `SUPERSEDED`.
- I record `MarketOperation` sono append-only.
- I record `AuditLog` sono append-only. L'utente applicativo PostgreSQL usato dall'applicazione non ha permesso `UPDATE` o `DELETE` sulla tabella `audit_logs`.

### 7.4 Gestione errori import

- Ogni import passa per un validator che verifica tutte le righe prima di scrivere qualsiasi dato nel database.
- L'import è atomico: o tutte le righe valide vengono salvate, o nessuna.
- Ogni import (riuscito o fallito) genera un record nell'`AuditLog` con il dettaglio degli errori riscontrati.
- Il file originale viene conservato in storage indipendentemente dall'esito.

### 7.5 Log delle operazioni di mercato

Ogni acquisto e vendita genera:
- un record immutabile in `MarketOperation`;
- un record in `PlatformFee` per la quota piattaforma;
- aggiornamento del budget in `Team` (dentro transazione).

Non esiste endpoint per modificare o cancellare operazioni di mercato. Se un'operazione è errata, l'admin può solo effettuare una compensazione manuale tracciata nell'audit log.

### 7.6 Rollback amministrativo

Il sistema non supporta rollback automatico di una giornata calcolata. Il processo di riesecuzione (sezione 6.3) è il meccanismo di correzione. Ogni step è tracciato nell'audit log.

In casi estremi (errori critici di sistema), il backup del database permette di ripristinare lo stato precedente. La procedura di ripristino va documentata separatamente.

### 7.7 Dati sensibili

- Le password sono memorizzate come hash bcrypt (costo 12).
- I token JWT non contengono dati sensibili oltre a `userId` e `role`.
- Le email dei partecipanti non sono visibili ad altri partecipanti tramite API.
- I report admin con email e dati personali sono accessibili solo con ruolo `ADMIN`.

---

## 8. MVP Roadmap tecnica

### MVP 1 — Backend offline / Admin first (settimane 1–4)

**Obiettivo:** l'admin può gestire una stagione completa senza interfaccia partecipante.

Backend:
- Setup progetto NestJS + Prisma + PostgreSQL;
- Modulo `Auth` (login admin);
- Modulo `Seasons` (CRUD + transizioni di stato);
- Modulo `Players` (anagrafica);
- Modulo `Quotes` (import CSV/Excel + validazione);
- Modulo `Votes` (import CSV/Excel + validazione + derivazione SV);
- Modulo `Calculations` (pipeline calcolo giornata sincrono);
- Modulo `Reports` (export CSV classifica e commissioni);
- Modulo `Admin Audit` (log append-only);
- Script di seed database con dati di test.

Frontend:
- Setup progetto React/Vite;
- Pannello admin (solo):
  - Login admin;
  - Gestione stagioni;
  - Import quotazioni;
  - Import voti;
  - Calcolo giornata;
  - Export report;
  - Audit log.

Deliverable: admin può importare dati stagione 2023/24 o 2024/25 e verificare che i calcoli corrispondano ai risultati del motore TypeScript esistente.

### MVP 2 — Partecipanti e portafogli (settimane 5–7)

**Obiettivo:** i partecipanti possono iscriversi e visualizzare il portafoglio.

Backend:
- Modulo `Users` (registrazione, login partecipante);
- Modulo `Teams` (iscrizione, visualizzazione portafoglio e ROI);
- Modulo `Rankings` (classifica generale);

Frontend:
- Registrazione e login;
- Dashboard personale con ROI e valore portafoglio;
- Classifica generale;
- Creazione rosa (senza mercato attivo: composizione iniziale).

### MVP 3 — Mercato (settimane 8–10)

**Obiettivo:** i partecipanti possono acquistare e vendere giocatori.

Backend:
- Modulo `Market Operations` (acquisto, vendita, validazioni, atomicità);
- Avviso overtrading (logica di rilevamento e notifica);

Frontend:
- Schermata mercato con ricerca e filtri;
- Acquisto con modale di conferma;
- Vendita dalla schermata rosa;
- Storico operazioni;
- Notifiche overtrading.

### MVP 4 — Classifiche e premi (settimane 11–13)

**Obiettivo:** la stagione ha un risultato finale.

Backend:
- Modulo `Prizes` (struttura premi, calcolo montepremi, assegnazione);
- Snapshot classifica per giornata;
- Classifica finale congelata.

Frontend:
- Classifica soglia premi (ROI ≥ 7%);
- Schermata premi con struttura e vincitori;
- Notifiche fine stagione.

### MVP 5 — Raffinamento e dashboard pubblica (settimane 14+)

**Obiettivo:** esperienza utente completa.

Backend:
- Ottimizzazione query e indici;
- Cache Redis per classifica e portafogli;
- Rate limiting avanzato;
- Health check e monitoring.

Frontend:
- Grafici andamento ROI per giornata;
- Dettaglio calciatore con storico quotazioni;
- Dashboard pubblica stagione corrente;
- Sezione regolamento integrata;
- Ottimizzazione performance (lazy loading, code splitting).

---

## 9. Rischi tecnici

### 9.1 Correttezza calcolo ROI e arrotondamenti

**Rischio:** gli arrotondamenti su valori monetari accumulati su 38 giornate possono produrre drift significativi se non gestiti correttamente.

**Mitigazione:**
- Usare `NUMERIC(15,6)` per tutti i campi monetari e percentuali in PostgreSQL (non FLOAT).
- Il calcolo del `fantasyMultiplier` è un prodotto composto su 38 giornate: con valori tipici di ±5%, l'errore di arrotondamento si accumula. Usare precisione a 6 decimali.
- Confrontare i risultati del backend con quelli del motore TypeScript esistente in fase di test.
- Aggiungere test di integrazione che verificano il ROI calcolato per portafogli noti (scenari derivati dai backtest).

### 9.2 Import dati e matching giocatori

**Rischio:** i file di quotazioni e voti usano identificatori testuali (nome giocatore) che possono variare tra fonti diverse (accenti, varianti del nome). Un mismatch fa sì che un giocatore in rosa non riceva i voti.

**Mitigazione:**
- Usare `playerId` numerico come chiave primaria, non il nome. I file di import devono contenere l'ID.
- Se il file contiene solo il nome, implementare un meccanismo di matching fuzzy con revisione manuale da parte dell'admin per i casi ambigui.
- Il pannello di "Controllo qualità dati" deve mostrare esplicitamente i giocatori non matched tra quotazioni e voti, per ogni giornata.
- Tracciare in `AuditLog` ogni caso di matching ambiguo risolto manualmente.

### 9.3 Concorrenza nelle operazioni di mercato

**Rischio:** due richieste di acquisto simultanee dallo stesso utente (doppio click, retry di rete) possono scrivere due `MarketOperation` e scalare il budget due volte.

**Mitigazione:**
- Usare una transazione serializzabile in PostgreSQL per ogni operazione di mercato.
- Aggiungere un lock ottimistico su `Team` (campo `version` incrementale): se la versione cambia tra lettura e scrittura, la transazione viene rilanciata.
- Idempotency key lato client: il frontend invia un UUID per ogni richiesta di operazione; il backend rifiuta duplicati con lo stesso UUID nell'arco di 60 secondi.

### 9.4 Consistenza economica

**Rischio:** dopo un ricalcolo giornata o un aggiornamento quotazioni, i valori dei portafogli devono essere tutti aggiornati atomicamente. Se l'aggiornamento fallisce a metà, alcuni team hanno valori obsoleti.

**Mitigazione:**
- Il calcolo giornata aggiorna tutti i portafogli in un'unica transazione Prisma.
- Aggiungere un campo `lastCalculatedAt` in `Team`: se questo valore è antecedente all'ultimo `RoundCalculation.calculatedAt`, il team ha valori obsoleti. Mostrare avviso nell'interfaccia admin.
- Aggiornamento quotazioni: usare una transazione che aggiorna in batch tutti i `PortfolioPosition` che detengono quel giocatore.

### 9.5 Dimensione del dataset e performance

**Rischio:** con N = 200 partecipanti × 25 giocatori = 5.000 posizioni, più 38 giornate × 600 voti/giornata = 22.800 voti, il dataset è gestibile. Ma le query di classifica o di calcolo ROI "live" per tutti i partecipanti possono essere lente se non indicizzate.

**Mitigazione:**
- Indici su: `(seasonId, userId)` in `teams`, `(teamId, status)` in `portfolio_positions`, `(seasonId, round, playerId)` in `votes`.
- Il `currentROI` è un campo pre-calcolato in `Team`, non calcolato on-the-fly. Viene aggiornato dopo ogni calcolo giornata e dopo ogni operazione di mercato.
- La classifica è uno snapshot pre-calcolato, non una view live.

### 9.6 Migrazione dati dal motore TypeScript esistente

**Rischio:** il motore TypeScript esistente ha logica di calcolo già validata con i backtest. Il backend NestJS deve replicare esattamente quella logica. Divergenze producono risultati diversi e perdita di fiducia nel sistema.

**Mitigazione:**
- Estrarre la logica di calcolo (bonus/malus engine, formula FantaTrading) in un pacchetto npm condiviso o in una libreria interna importata sia dal motore esistente che dal backend NestJS.
- Creare test di integrazione che confrontano il backend con i report CSV del motore esistente per le stagioni 2023/24 e 2024/25.
- Non replicare manualmente la logica: condividerla.
