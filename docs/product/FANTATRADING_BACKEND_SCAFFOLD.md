# FantaTrading — Backend Scaffold

**Versione:** 0.1.0  
**Data:** 2026-05-12  
**Stato:** Scaffolding backend + auth/users/seasons + dati base giocabili, build verde, test passati

---

## 1. Struttura creata

```
FantaTrading/
├── apps/
│   └── backend/
│       ├── nest-cli.json
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── .env.example
│       ├── src/
│       │   ├── main.ts                          # Bootstrap NestJS
│       │   ├── app.module.ts                    # Root module
│       │   ├── config/
│       │   │   └── app.config.ts                # Config tipizzata (@nestjs/config)
│       │   ├── common/
│       │   │   ├── filters/
│       │   │   │   └── http-exception.filter.ts # Formato errori uniformi
│       │   │   └── interceptors/
│       │   │       └── logging.interceptor.ts   # Log HTTP con timing
│       │   ├── health/
│       │   │   ├── health.controller.ts         # GET /health
│       │   │   ├── health.module.ts
│       │   │   └── health.controller.spec.ts    # Test unitario
│       │   └── modules/
│       │       ├── calculations/
│       │       │   ├── calculations.controller.ts  # POST /calculations/quote-return
│       │       │   ├── calculations.service.ts     # Usa src/shared (formula canonica)
│       │       │   ├── calculations.module.ts
│       │       │   ├── calculations.service.spec.ts # Test con shared engine
│       │       │   └── dto/
│       │       │       └── quote-return.dto.ts
│       │       ├── seasons/seasons.module.ts    # Stub
│       │       ├── players/                    # List/filter/get + import batch
│       │       ├── quotes/                     # List/get quote + import processed JSON
│       │       ├── votes/                      # List votes + import processed JSON
│       │       ├── teams/teams.module.ts        # Stub
│       │       ├── market/market.module.ts      # Stub
│       │       ├── admin/admin.module.ts        # Stub
│       │       └── reports/reports.module.ts    # Stub
│       └── test/
│           ├── jest-e2e.json
│           └── health.e2e-spec.ts               # E2E health check
├── prisma/
│   └── schema.prisma                            # Schema completo PostgreSQL
└── package.json                                 # Script backend:* e prisma:*
```

---

## 2. Come avviare

### Prerequisiti

- Node.js 20 LTS
- PostgreSQL 15+ in esecuzione
- `npm install` già eseguito nella radice

### Prima volta

```bash
# 1. Installare dipendenze backend
npm run backend:install

# 2. Copiare e configurare .env
cp apps/backend/.env.example apps/backend/.env
# Editare DATABASE_URL e JWT_SECRET

# 3. Generare Prisma client
npm run prisma:generate

# 4. Eseguire migration (richiede DB attivo)
npm run prisma:migrate:dev

# 5. Avviare in modalità sviluppo
npm run backend:dev
```

### Avvio quotidiano

```bash
npm run backend:dev        # Hot reload, porta 3000
```

---

## 3. Configurazione .env

| Variabile | Esempio | Obbligatoria |
|-----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:pass@localhost:5432/fantatrading_dev` | Sì |
| `PORT` | `3000` | No (default: 3000) |
| `NODE_ENV` | `development` | No |
| `JWT_SECRET` | stringa ≥ 32 caratteri | Sì (in prod) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | No |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | No |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | No |

Il file `.env` va creato in `apps/backend/.env` (non nella radice). Non committare mai il `.env` reale.

In `NODE_ENV=development`, se `CORS_ORIGINS` non e valorizzata, il backend abilita automaticamente solo:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

In `NODE_ENV=production`, il default resta restrittivo: nessuna origin browser viene abilitata se `CORS_ORIGINS` non e configurata esplicitamente.

---

## 4. Endpoint implementati

### `GET /health`

```json
{
  "status": "ok",
  "appName": "fantatrading-backend",
  "version": "0.1.0",
  "timestamp": "2026-05-12T10:00:00.000Z"
}
```

### `POST /calculations/quote-return`

**Request:**
```json
{
  "initialQuote": 10,
  "currentQuote": 12
}
```

**Response:**
```json
{
  "initialQuote": 10,
  "currentQuote": 12,
  "quoteStepReturnPct": 10,
  "description": "Ogni punto di differenza vale +5%. Qt.I=10 Qt.A=12 → +10%"
}
```

Usa `calculateQuoteStepReturn` da `src/shared` — formula canonica FantaTrading.

### `POST /auth/register`

Registra un nuovo utente con ruolo `PARTICIPANT`, hash password `bcrypt` e restituisce un JWT access token.

### `POST /auth/login`

Valida email/password con `bcrypt.compare` e restituisce un JWT access token.

### `GET /users/me`

Restituisce l'utente autenticato dal bearer token JWT.

### `POST /users`

Crea un utente. Endpoint protetto: ruoli `ADMIN` e `SUPER_ADMIN`.

### `GET /users/:id`

Legge un utente per id. Endpoint protetto: ruoli `ADMIN` e `SUPER_ADMIN`.

### `POST /seasons`

Crea una stagione. Endpoint protetto: ruoli `ADMIN` e `SUPER_ADMIN`.

### `GET /seasons`

Lista le stagioni disponibili per un utente autenticato.

### `GET /seasons/:id`

Legge una stagione per id per un utente autenticato.

### `PATCH /seasons/:id/status`

Aggiorna lo stato stagione. Endpoint protetto: ruoli `ADMIN` e `SUPER_ADMIN`.

Stati supportati: `DRAFT`, `OPEN`, `LOCKED`, `IN_PROGRESS`, `COMPLETED`, `ARCHIVED`.

### `GET /players`

Lista giocatori per utente autenticato. Filtri supportati: `seasonId`, `role`, `club`, `search`.

### `GET /players/:id`

Dettaglio giocatore con quote e voti collegati.

### `POST /players/import`

Upsert/import batch giocatori. Endpoint protetto: ruoli `ADMIN` e `SUPER_ADMIN`.

### `GET /quotes`

Lista quotazioni per stagione. Query obbligatoria: `seasonId`. Filtri opzionali: `role`, `club`.

### `GET /quotes/:seasonId/:playerId`

Dettaglio quotazione per coppia stagione/giocatore.

### `GET /votes`

Lista voti per stagione e, opzionalmente, giornata. Query: `seasonId`, `round`.

### `GET /votes/player/:playerId`

Lista voti per giocatore, opzionalmente filtrata per `seasonId`.

### `POST /teams`

Crea la squadra del partecipante autenticato per una stagione.

Body:
```json
{
  "seasonId": "uuid-stagione"
}
```

Vincoli:

- solo ruolo `PARTICIPANT`;
- una sola squadra per utente/stagione;
- budget iniziale copiato da `Season.initialBudget`;
- stato pubblico iniziale `DRAFT` (mappato internamente su `ROSA_INCOMPLETA`).

### `GET /teams/my`

Lista le squadre dell utente autenticato. Gli admin possono leggere tutte le squadre a scopo operativo, ma non possono operare sul mercato come utenti.

### `GET /teams/:id`

Dettaglio squadra. Il partecipante puo leggere solo le proprie squadre; `ADMIN` e `SUPER_ADMIN` possono leggere qualsiasi squadra.

### `GET /teams/:id/portfolio`

Restituisce posizioni attive e riepilogo portafoglio: valore iniziale, budget disponibile, valore corrente posizioni, valore totale corrente, commissioni totali pagate, ROI corrente, numero giocatori, composizione ruoli e validita rosa.

### `POST /market/buy`

Acquista un giocatore per una squadra del partecipante autenticato.

Body:
```json
{
  "teamId": "uuid-team",
  "playerId": "uuid-player"
}
```

Regole applicate:

- il team deve appartenere all utente autenticato;
- admin e super admin possono leggere, ma non operare come utenti;
- il giocatore deve avere una quotazione nella stagione del team;
- vietati duplicati attivi dello stesso giocatore;
- composizione massima: 3 `GK`, 8 `DEF`, 8 `MID`, 6 `FWD`, totale 25;
- commissione acquisto dalla stagione, default V1 2%;
- commissione trattenuta al 100% dal sistema;
- creazione di `PortfolioPosition`;
- creazione di `MarketOperation` di tipo `BUY`;
- aggiornamento budget, commissioni totali, valore portafoglio e ROI.

Esempio acquisto con quotazione 100 e fee 2%:

```json
{
  "operation": {
    "type": "BUY",
    "grossAmount": 100,
    "commissionAmount": 2,
    "netAmount": 102,
    "systemRevenue": 2
  }
}
```

### `POST /market/sell`

Vende una posizione attiva del partecipante autenticato.

Body con player:
```json
{
  "teamId": "uuid-team",
  "playerId": "uuid-player"
}
```

Body con posizione:
```json
{
  "teamId": "uuid-team",
  "positionId": "uuid-position"
}
```

Regole applicate:

- valore lordo calcolato con shared engine: `+1` quotazione = `+5%`;
- perdita massima -100%, sell value con floor a zero;
- commissione vendita dalla stagione, default V1 2%;
- commissione trattenuta al 100% dal sistema;
- posizione marcata `SOLD`;
- creazione di `MarketOperation` di tipo `SELL`;
- aggiornamento budget, commissioni totali, valore portafoglio e ROI.

Esempio vendita con sell value 100 e fee 2%:

```json
{
  "operation": {
    "type": "SELL",
    "grossAmount": 100,
    "commissionAmount": 2,
    "netAmount": 98,
    "systemRevenue": 2
  }
}
```

### `GET /market/operations?teamId=...`

Lista operazioni mercato di una squadra. Il partecipante vede solo le proprie operazioni; `ADMIN` e `SUPER_ADMIN` possono leggere le operazioni di ogni team. Ogni riga espone anche `grossAmount`, `commissionAmount`, `netAmount` e `systemRevenue` derivati dai campi Prisma esistenti.

### `POST /admin/import/quotes`

Importa quotazioni da JSON processed. Endpoint protetto: ruoli `ADMIN` e `SUPER_ADMIN`.

Body minimo:
```json
{
  "seasonId": "uuid-stagione"
}
```

Body con path esplicito:
```json
{
  "seasonId": "uuid-stagione",
  "sourcePath": "data/real/processed/fantacalcio_quotes_history.json"
}
```

Il backend legge il file processed, importa solo le righe con `season` uguale a `footballSeason` della stagione DB, normalizza i ruoli `P/D/C/A` in `GK/DEF/MID/FWD`, upserta i player via `externalId`, upserta le quote e crea un record in `import_logs`.

### `POST /admin/import/votes`

Importa voti da JSON processed. Endpoint protetto: ruoli `ADMIN` e `SUPER_ADMIN`.

Body minimo:
```json
{
  "seasonId": "uuid-stagione"
}
```

Body per singola giornata:
```json
{
  "seasonId": "uuid-stagione",
  "round": 1,
  "sourcePath": "data/real/processed/votes/fantacalcio_votes_history.json"
}
```

Il backend importa solo le righe con `season` coerente con la stagione DB e, se indicato, solo la giornata `round`. Ogni import restituisce `recordsRead`, `recordsImported`, `recordsSkipped`, `errors`, `warnings`, `importLogId`.

### `GET /api/docs`

Swagger UI automatica (disponibile solo con `NODE_ENV !== production`).

---

## 5. Script disponibili

```bash
npm run backend:install      # npm install nella cartella backend
npm run backend:dev          # avvio con hot reload
npm run backend:build        # compilazione TypeScript (dist/)
npm run backend:test         # test unitari backend (Jest)
npm run prisma:generate      # genera Prisma Client dai tipi schema
npm run prisma:migrate:dev   # applica migration al DB di sviluppo
npm run prisma:studio        # Prisma Studio (GUI database)
```

---

## 6. Schema Prisma — tabelle implementate

| Tabella | Descrizione |
|---------|-------------|
| `users` | Utenti (partecipanti e admin) |
| `refresh_tokens` | Token di refresh per auth JWT |
| `seasons` | Stagioni (parametri regolamento inclusi) |
| `players` | Giocatori reali |
| `quotes` | Quotazioni per stagione/giocatore |
| `quote_history` | Storico variazioni quotazione |
| `votes` | Voti per giornata |
| `teams` | Squadre (una per utente per stagione) |
| `portfolio_positions` | Posizioni aperte/chiuse nei portafogli |
| `market_operations` | Log immutabile di acquisti e vendite |
| `round_calculations` | Calcoli di giornata con hash input |
| `round_player_results` | Dettaglio per giocatore per giornata |
| `rankings` | Classifica per giornata e finale |
| `prize_pools` | Pool premi per stagione |
| `prize_awards` | Assegnazione premi per team |
| `platform_fees` | Fee piattaforma per operazione |
| `import_logs` | Log import CSV quotazioni/voti |
| `audit_logs` | Log audit append-only |

**Tutti i valori monetari usano `Decimal(15,6)`** per evitare errori floating-point.  
**`fantasy_multiplier` usa `Decimal(15,10)`** per preservare la precisione su 38 giornate di moltiplicazioni.  
**`version` in `teams`** supporta il lock ottimistico.

---

## 7. Cosa è implementato in questo scaffold

- [x] NestJS bootstrap con ValidationPipe globale, CORS, Swagger
- [x] Config tipizzata via `@nestjs/config`
- [x] PrismaService globale con `onModuleInit`/`onModuleDestroy`
- [x] Auth base: register, login, bcrypt, JWT access token
- [x] JwtAuthGuard e RolesGuard (`PARTICIPANT`, `ADMIN`, `SUPER_ADMIN`)
- [x] UsersModule minimo: create user, find by email/id, endpoint `GET /users/me`
- [x] SeasonsModule CRUD minimo: create/list/get/update status
- [x] PlayersModule: list/get/filter e import batch admin
- [x] QuotesModule: list/get e import da JSON processed
- [x] VotesModule: list per stagione/giornata, voti per player e import da JSON processed
- [x] Admin import: `POST /admin/import/quotes`, `POST /admin/import/votes`, log import e protezione admin
- [x] TeamsModule: create team, list my teams, dettaglio team, portfolio summary, ownership check
- [x] MarketModule: buy/sell, vincoli rosa V1, commissioni 2%, operation log, lista operazioni
- [x] `GET /health` con risposta strutturata
- [x] `POST /calculations/quote-return` — usa `src/shared` (shared engine)
- [x] `CalculationsService` con `quoteReturn`, `positionValue`, `roi`
- [x] Moduli stub residui per reports
- [x] Schema Prisma completo con tutti i modelli V1
- [x] Alias TypeScript `@shared` → `src/shared` (tsconfig paths)
- [x] Test unitari: HealthController + CalculationsService (10 test, tutti passati)
- [x] E2E test: health endpoint
- [x] Test integrazione mockata: register, login, me, create/list/update season status
- [x] Test integrazione mockata: import quotes, import votes, list/filter players, list votes by round, import endpoint protetto
- [x] Test integrazione mockata: create team, doppio team bloccato, buy/sell, duplicati, composizione ruoli, portfolio summary, operation log, accesso negato
- [x] Script npm radice: `backend:*` e `prisma:*`

---

## 8. Cosa resta fuori da questo scaffold

| Componente | Note |
|------------|------|
| Refresh token | Tabella presente nello schema, flusso non ancora implementato |
| Validazione transizioni stagione | Per ora `PATCH /seasons/:id/status` accetta ogni stato enum valido |
| Upload multipart import | Gli endpoint admin leggono JSON processed già presenti nel repository; upload file non ancora implementato |
| Lock ottimistico market | `version` su team presente nello schema, lock transazionale avanzato non ancora implementato |
| CalculationsService completo | Calcolo giornata, aggiornamento moltiplicatori |
| RankingsService | Classifica live e finale |
| ReportsService | Export CSV/PDF |
| AdminService completo | Gestione utenti avanzata, audit browsing e report admin |
| BullMQ | Job queue per calcoli asincroni |
| File upload | Multer per import CSV |
| Prisma migration seed | Dati iniziali (admin user, stagione test) |
| Autenticazione e2e | Test integrazione con DB reale |

---

## 9. Architettura path alias

Il backend importa le formule canoniche via alias `@shared`:

```typescript
// apps/backend/src/modules/calculations/calculations.service.ts
import { calculateQuoteStepReturn } from '@shared';
```

L'alias è risolto da `tsconfig.json` del backend:
```json
"paths": {
  "@shared": ["../../src/shared/index"],
  "@shared/*": ["../../src/shared/*"]
}
```

`../../` dalla radice di `apps/backend/` porta alla radice del repository, poi `src/shared/`.  
`nest build` risolve i path alias automaticamente tramite `@nestjs/cli`.
