# FantaTrading — Backend Scaffold

**Versione:** 0.1.0  
**Data:** 2026-05-12  
**Stato:** Scaffolding backend + auth/users/seasons CRUD minimo, build verde, test passati

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
│       │       ├── players/players.module.ts    # Stub
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
| `CORS_ORIGINS` | `http://localhost:5173` | No |

Il file `.env` va creato in `apps/backend/.env` (non nella radice). Non committare mai il `.env` reale.

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
- [x] `GET /health` con risposta strutturata
- [x] `POST /calculations/quote-return` — usa `src/shared` (shared engine)
- [x] `CalculationsService` con `quoteReturn`, `positionValue`, `roi`
- [x] Moduli stub residui per players, teams, market, admin, reports
- [x] Schema Prisma completo con tutti i modelli V1
- [x] Alias TypeScript `@shared` → `src/shared` (tsconfig paths)
- [x] Test unitari: HealthController + CalculationsService (10 test, tutti passati)
- [x] E2E test: health endpoint
- [x] Test integrazione mockata: register, login, me, create/list/update season status
- [x] Script npm radice: `backend:*` e `prisma:*`

---

## 8. Cosa resta fuori da questo scaffold

| Componente | Note |
|------------|------|
| Refresh token | Tabella presente nello schema, flusso non ancora implementato |
| Validazione transizioni stagione | Per ora `PATCH /seasons/:id/status` accetta ogni stato enum valido |
| PlayersService/Controller | Import giocatori, gestione rosa |
| MarketService/Controller | Acquisto/vendita con lock ottimistico |
| CalculationsService completo | Calcolo giornata, aggiornamento moltiplicatori |
| RankingsService | Classifica live e finale |
| ReportsService | Export CSV/PDF |
| AdminService | Gestione utenti, import dati |
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
