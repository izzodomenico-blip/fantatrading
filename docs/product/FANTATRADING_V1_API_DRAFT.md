# FantaTrading V1 — API Draft

**Versione:** 1.0  
**Data:** 2026-05-12  
**Stato:** Bozza — da validare con il team di sviluppo  
**Destinatari:** sviluppatori backend e frontend

---

## Convenzioni

- Base URL: `https://api.fantatrading.app/v1` (da definire)
- Autenticazione: Bearer token JWT nell'header `Authorization: Bearer <token>`
- Tutti i body sono in JSON (`Content-Type: application/json`), salvo gli endpoint di upload
- Tutti i timestamp sono in ISO 8601 UTC: `2026-05-12T10:30:00Z`
- I valori monetari e le percentuali sono numeri con precisione decimale (es. `4.50`, `0.02`)
- Gli errori seguono il formato standard:
  ```json
  {
    "statusCode": 400,
    "error": "Bad Request",
    "message": "Descrizione errore",
    "details": [{ "field": "email", "issue": "Email già registrata" }]
  }
  ```
- `[P]` = richiede autenticazione partecipante
- `[A]` = richiede autenticazione admin
- `[PUB]` = endpoint pubblico

---

## Autenticazione — `/auth`

### POST /auth/register `[PUB]`

Registra un nuovo partecipante.

**Body:**
```json
{
  "email": "mario.rossi@example.com",
  "password": "SecurePass123!",
  "firstName": "Mario",
  "lastName": "Rossi"
}
```

**Response 201:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "mario.rossi@example.com",
    "firstName": "Mario",
    "lastName": "Rossi",
    "role": "PARTECIPANTE"
  }
}
```

**Errori:** 409 se email già registrata; 400 se password non conforme.

---

### POST /auth/login `[PUB]`

Autentica un utente.

**Body:**
```json
{
  "email": "mario.rossi@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "...",
    "firstName": "Mario",
    "lastName": "Rossi",
    "role": "PARTECIPANTE"
  }
}
```

**Errori:** 401 se credenziali errate; 403 se account disabilitato.

---

### POST /auth/refresh `[PUB]`

Rinnova l'access token.

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response 200:**
```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

**Errori:** 401 se refresh token non valido o scaduto.

---

### POST /auth/logout `[P]`

Invalida il refresh token corrente.

**Body:** `{ "refreshToken": "eyJ..." }`

**Response 204:** No content.

---

### POST /auth/forgot-password `[PUB]`

Invia l'email di reset password.

**Body:** `{ "email": "mario.rossi@example.com" }`

**Response 200:** `{ "message": "Se l'email esiste, riceverai le istruzioni." }`

Risposta generica per non rivelare se l'email è registrata.

---

### POST /auth/reset-password `[PUB]`

Reimposta la password con il token ricevuto via email.

**Body:**
```json
{
  "token": "reset_token_uuid",
  "newPassword": "NewSecurePass456!"
}
```

**Response 200:** `{ "message": "Password aggiornata." }`

---

## Utenti — `/users`

### GET /users/me `[P]`

Restituisce il profilo dell'utente autenticato.

**Response 200:**
```json
{
  "id": "uuid",
  "email": "mario.rossi@example.com",
  "firstName": "Mario",
  "lastName": "Rossi",
  "role": "PARTECIPANTE",
  "status": "ACTIVE",
  "createdAt": "2026-05-01T10:00:00Z"
}
```

---

### PATCH /users/me `[P]`

Aggiorna il profilo (nome, cognome).

**Body:**
```json
{ "firstName": "Mario", "lastName": "Bianchi" }
```

**Response 200:** profilo aggiornato.

---

### PATCH /users/me/password `[P]`

Cambia la password.

**Body:**
```json
{
  "currentPassword": "oldPass",
  "newPassword": "NewSecurePass456!"
}
```

**Response 200:** `{ "message": "Password aggiornata." }`

**Errori:** 400 se password corrente errata.

---

## Stagioni — `/seasons`

### GET /seasons `[P]`

Lista delle stagioni visibili al partecipante (solo quelle con iscrizioni aperte o in corso).

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "FantaTrading 2025/26",
    "footballSeason": "2025/26",
    "status": "ISCRIZIONI_APERTE",
    "registrationCloseAt": "2026-08-25T23:59:59Z",
    "startDate": "2026-08-28T00:00:00Z",
    "endDate": "2027-05-25T23:59:59Z",
    "totalRounds": 38,
    "initialBudget": 500,
    "buyCommissionRate": 0.02,
    "sellCommissionRate": 0.02,
    "platformFeeRate": 0.10,
    "prizeThreshold": 0.07,
    "participantsCount": 42
  }
]
```

---

### GET /seasons/:seasonId `[P]`

Dettaglio di una stagione specifica.

**Response 200:** oggetto stagione completo (stesso formato della lista).

---

### POST /seasons/:seasonId/join `[P]`

Iscrive il partecipante alla stagione.

**Body:** nessuno.

**Response 201:**
```json
{
  "teamId": "uuid",
  "seasonId": "uuid",
  "initialBudget": 500,
  "availableBudget": 500,
  "status": "ROSA_INCOMPLETA"
}
```

**Errori:** 409 se già iscritto; 400 se iscrizioni chiuse.

---

## Giocatori — `/players`

### GET /players `[P]`

Lista giocatori disponibili nella stagione corrente del partecipante. Supporta filtri e paginazione.

**Query params:**
- `seasonId` (obbligatorio): UUID stagione
- `role`: `GK` | `DEF` | `MID` | `FWD`
- `search`: stringa di ricerca per nome
- `minQuote`: numero
- `maxQuote`: numero
- `page`: numero (default 1)
- `limit`: numero (default 50, max 200)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "Lautaro",
      "lastName": "Martinez",
      "role": "FWD",
      "realTeam": "Inter",
      "currentQuote": 42.0,
      "initialQuote": 40.0,
      "quoteVariation": 2.0,
      "quoteVariationPct": 10.0,
      "currentSellValue": 44.1,
      "buyCost": 44.964,
      "inMyRoster": false
    }
  ],
  "total": 640,
  "page": 1,
  "limit": 50
}
```

---

### GET /players/:playerId `[P]`

Dettaglio di un singolo giocatore con storico voti.

**Query params:**
- `seasonId` (obbligatorio)

**Response 200:**
```json
{
  "id": "uuid",
  "firstName": "Lautaro",
  "lastName": "Martinez",
  "role": "FWD",
  "realTeam": "Inter",
  "currentQuote": 42.0,
  "initialQuote": 40.0,
  "currentSellValue": 44.1,
  "buyCost": 44.964,
  "inMyRoster": false,
  "votes": [
    {
      "round": 1,
      "vote": 7.0,
      "fantasyVote": 8.0,
      "bonusPct": 2.5,
      "played": true
    }
  ]
}
```

---

## Portafoglio — `/teams`

### GET /teams/my `[P]`

Restituisce il portafoglio del partecipante nella stagione corrente.

**Query params:**
- `seasonId` (obbligatorio)

**Response 200:**
```json
{
  "teamId": "uuid",
  "userId": "uuid",
  "seasonId": "uuid",
  "status": "ROSA_ATTIVA",
  "initialBudget": 500,
  "availableBudget": 87.32,
  "currentPortfolioValue": 521.45,
  "currentROI": 4.29,
  "totalCommissionsPaid": 12.80,
  "rosterSummary": { "GK": 3, "DEF": 8, "MID": 8, "FWD": 6 },
  "positions": [
    {
      "positionId": "uuid",
      "playerId": "uuid",
      "playerName": "Lautaro Martinez",
      "role": "FWD",
      "realTeam": "Inter",
      "initialQuote": 40.0,
      "buyValue": 44.0,
      "currentSellValue": 44.1,
      "variationPct": 0.23,
      "variationCredits": 0.10,
      "fantasyMultiplier": 1.012,
      "boughtAt": "2026-08-28T10:00:00Z"
    }
  ]
}
```

---

### GET /teams/my/roi-history `[P]`

Storico del ROI del partecipante giornata per giornata.

**Query params:** `seasonId`

**Response 200:**
```json
{
  "teamId": "uuid",
  "roiHistory": [
    { "round": 1, "roi": 2.10, "portfolioValue": 510.50, "calculatedAt": "2026-09-05T18:00:00Z" },
    { "round": 2, "roi": 3.40, "portfolioValue": 517.00, "calculatedAt": "2026-09-12T18:00:00Z" }
  ]
}
```

---

## Mercato — `/market`

### POST /market/buy `[P]`

Acquista un giocatore.

**Body:**
```json
{
  "seasonId": "uuid",
  "playerId": "uuid",
  "idempotencyKey": "client-generated-uuid"
}
```

**Response 201:**
```json
{
  "operationId": "uuid",
  "type": "BUY",
  "playerId": "uuid",
  "playerName": "Lautaro Martinez",
  "valueAtOperation": 44.1,
  "commissionAmount": 0.882,
  "totalCost": 44.982,
  "budgetBefore": 132.30,
  "budgetAfter": 87.32,
  "executedAt": "2026-09-10T15:30:00Z"
}
```

**Errori:**
- 400 se budget insufficiente;
- 409 se giocatore già in rosa;
- 409 se ruolo al massimo;
- 409 se idempotencyKey già usata (operazione duplicata);
- 403 se stagione non in corso.

---

### POST /market/sell `[P]`

Vende un giocatore.

**Body:**
```json
{
  "seasonId": "uuid",
  "positionId": "uuid",
  "idempotencyKey": "client-generated-uuid"
}
```

**Response 201:**
```json
{
  "operationId": "uuid",
  "type": "SELL",
  "playerId": "uuid",
  "playerName": "Lautaro Martinez",
  "valueAtOperation": 44.1,
  "commissionAmount": 0.882,
  "netProceeds": 43.218,
  "budgetBefore": 87.32,
  "budgetAfter": 130.538,
  "executedAt": "2026-09-10T15:35:00Z"
}
```

**Errori:**
- 404 se posizione non trovata o non appartiene al team;
- 400 se la vendita viola la composizione minima della rosa;
- 403 se stagione non in corso.

---

### GET /market/operations `[P]`

Storico operazioni del partecipante.

**Query params:**
- `seasonId` (obbligatorio)
- `type`: `BUY` | `SELL`
- `page`, `limit`

**Response 200:**
```json
{
  "data": [
    {
      "operationId": "uuid",
      "type": "BUY",
      "playerId": "uuid",
      "playerName": "Lautaro Martinez",
      "role": "FWD",
      "valueAtOperation": 44.1,
      "commissionAmount": 0.882,
      "netAmount": -44.982,
      "budgetAfter": 87.32,
      "round": 5,
      "executedAt": "2026-09-10T15:30:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 50
}
```

---

## Classifica — `/rankings`

### GET /rankings `[P]`

Classifica generale della stagione.

**Query params:**
- `seasonId` (obbligatorio)
- `round`: numero giornata (default: ultima disponibile)

**Response 200:**
```json
{
  "seasonId": "uuid",
  "round": 10,
  "isFinal": false,
  "calculatedAt": "2026-10-25T18:00:00Z",
  "myPosition": 15,
  "rankings": [
    {
      "position": 1,
      "userId": "uuid",
      "displayName": "Mario R.",
      "roi": 8.34,
      "portfolioValue": 541.70,
      "totalOperations": 3,
      "aboveSurvival": true,
      "abovePrize": true
    },
    {
      "position": 2,
      "userId": "uuid",
      "displayName": "Luigi B.",
      "roi": 6.91,
      "portfolioValue": 534.55,
      "totalOperations": 7,
      "aboveSurvival": true,
      "abovePrize": false
    }
  ]
}
```

---

### GET /rankings/prize `[P]`

Classifica soglia premi: solo partecipanti con ROI ≥ soglia configurata.

**Query params:** `seasonId`

**Response 200:**
```json
{
  "seasonId": "uuid",
  "prizeThreshold": 0.07,
  "prizeStructure": [
    { "position": 1, "pct": 0.30, "amount": 450.00 },
    { "position": 2, "pct": 0.20, "amount": 300.00 }
  ],
  "eligibleParticipants": 12,
  "myPosition": null,
  "rankings": [ ... ]
}
```

---

## Notifiche — `/notifications`

### GET /notifications `[P]`

Lista notifiche dell'utente autenticato.

**Query params:** `page`, `limit`, `unreadOnly` (boolean)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "ROUND_CALCULATED",
      "title": "Calcolo giornata 10 completato",
      "body": "Il tuo ROI è ora 4.29%.",
      "read": false,
      "createdAt": "2026-10-25T18:05:00Z"
    }
  ],
  "unreadCount": 3,
  "total": 15
}
```

---

### PATCH /notifications/read-all `[P]`

Segna tutte le notifiche come lette.

**Response 200:** `{ "updatedCount": 3 }`

---

## Admin — Stagioni `/admin/seasons`

### GET /admin/seasons `[A]`

Lista di tutte le stagioni.

**Response 200:** array di stagioni con tutti i campi, incluso stato.

---

### POST /admin/seasons `[A]`

Crea una nuova stagione.

**Body:**
```json
{
  "name": "FantaTrading 2025/26",
  "footballSeason": "2025/26",
  "registrationOpenAt": "2026-08-01T00:00:00Z",
  "registrationCloseAt": "2026-08-25T23:59:59Z",
  "startDate": "2026-08-28T00:00:00Z",
  "endDate": "2027-05-25T23:59:59Z",
  "totalRounds": 38,
  "initialBudget": 500,
  "buyCommissionRate": 0.02,
  "sellCommissionRate": 0.02,
  "platformFeeRate": 0.10,
  "survivalThreshold": 0.00,
  "prizeThreshold": 0.07,
  "noVotePolicy": "PLAYER_ZERO_TEAM_EXCLUDE",
  "rosterComposition": { "GK": 3, "DEF": 8, "MID": 8, "FWD": 6 }
}
```

**Response 201:** stagione creata.

---

### PATCH /admin/seasons/:seasonId/status `[A]`

Transizione di stato della stagione.

**Body:**
```json
{ "status": "ISCRIZIONI_APERTE" }
```

**Response 200:** stagione aggiornata.

**Errori:** 400 se la transizione richiesta non è valida dallo stato corrente.

---

### GET /admin/seasons/:seasonId/summary `[A]`

Riepilogo admin della stagione: partecipanti, giornate, ricavo piattaforma.

**Response 200:**
```json
{
  "seasonId": "uuid",
  "status": "IN_CORSO",
  "participantsTotal": 50,
  "participantsWithCompleteRoster": 48,
  "lastCalculatedRound": 10,
  "platformRevenueAccumulated": 42.30,
  "pctAboveSurvival": 62.0,
  "pctAbovePrize": 18.0
}
```

---

## Admin — Import `/admin/import`

### POST /admin/import/quotes `[A]`

Importa le quotazioni iniziali o gli aggiornamenti.

**Content-Type:** `multipart/form-data`

**Form fields:**
- `file`: file CSV o Excel
- `seasonId`: UUID
- `type`: `INITIAL` | `UPDATE`

**Response 200 (validazione ok, import confermato):**
```json
{
  "importId": "uuid",
  "type": "INITIAL",
  "rowsImported": 640,
  "rowsSkipped": 0,
  "breakdownByRole": { "GK": 60, "DEF": 180, "MID": 210, "FWD": 190 },
  "quoteRange": { "min": 1.0, "max": 52.0 }
}
```

**Response 422 (validazione fallita, nessun dato scritto):**
```json
{
  "valid": false,
  "errors": [
    { "row": 15, "field": "role", "value": "X", "issue": "Ruolo non valido. Valori attesi: P, D, C, A" },
    { "row": 42, "field": "initialQuote", "value": "-5", "issue": "La quotazione deve essere > 0" }
  ]
}
```

---

### POST /admin/import/votes `[A]`

Importa i voti di una giornata.

**Content-Type:** `multipart/form-data`

**Form fields:**
- `file`: file CSV o Excel
- `seasonId`: UUID
- `round`: numero giornata

**Response 200:**
```json
{
  "importId": "uuid",
  "seasonId": "uuid",
  "round": 10,
  "playersWithVote": 580,
  "svDerived": 42,
  "svBreakdown": {
    "totalRosterPlayers": 1200,
    "presentInVoteFile": 1158,
    "derivedAsSv": 42
  }
}
```

**Response 422 (validazione fallita):**
```json
{
  "valid": false,
  "errors": [
    { "row": 8, "field": "vote", "value": "11.5", "issue": "Voto fuori range (0-10)" }
  ]
}
```

---

### GET /admin/import/history `[A]`

Storico degli import eseguiti.

**Query params:** `seasonId`, `type` (`QUOTES` | `VOTES`), `page`, `limit`

**Response 200:**
```json
{
  "data": [
    {
      "importId": "uuid",
      "type": "VOTES",
      "seasonId": "uuid",
      "round": 10,
      "status": "SUCCESS",
      "rowsImported": 580,
      "executedBy": "admin@fantatrading.app",
      "executedAt": "2026-10-25T16:00:00Z",
      "originalFilename": "voti_giornata10.csv"
    }
  ],
  "total": 22
}
```

---

## Admin — Calcolo `/admin/calculations`

### GET /admin/calculations `[A]`

Lista dei calcoli giornata per una stagione.

**Query params:** `seasonId`

**Response 200:**
```json
[
  {
    "id": "uuid",
    "round": 10,
    "status": "COMPLETED",
    "totalPlayersWithVote": 580,
    "totalSvDerived": 42,
    "avgPortfolioVariation": 1.23,
    "calculatedAt": "2026-10-25T18:00:00Z",
    "calculatedBy": "admin@fantatrading.app"
  }
]
```

---

### POST /admin/calculations `[A]`

Lancia il calcolo per una giornata.

**Body:**
```json
{
  "seasonId": "uuid",
  "round": 11
}
```

**Response 202 (accepted — calcolo avviato):**
```json
{
  "calculationId": "uuid",
  "status": "IN_PROGRESS",
  "message": "Calcolo avviato per la giornata 11."
}
```

**Errori:**
- 400 se i voti non sono stati importati per questa giornata;
- 409 se è già in corso un calcolo per questa stagione;
- 409 se il calcolo è già stato eseguito per questa giornata (usare endpoint riesecuzione).

---

### GET /admin/calculations/:calculationId `[A]`

Stato di un calcolo specifico.

**Response 200:**
```json
{
  "id": "uuid",
  "round": 11,
  "status": "COMPLETED",
  "totalPlayersWithVote": 590,
  "totalSvDerived": 38,
  "avgPortfolioVariation": 0.87,
  "inputDataHash": "sha256:abcdef...",
  "calculatedAt": "2026-11-01T18:02:15Z",
  "notes": null
}
```

---

### POST /admin/calculations/:calculationId/recalculate `[A]`

Riesegue un calcolo già completato (richiede conferma esplicita).

**Body:**
```json
{
  "confirm": true,
  "reason": "Corretti voti errati giocatore ID xyz per la giornata 11."
}
```

**Response 202:** stesso formato del calcolo normale.

**Errori:** 400 se `confirm !== true`; 400 se i voti non sono stati aggiornati.

---

## Admin — Dati giocatori `/admin/players`

### GET /admin/players `[A]`

Lista completa giocatori con filtri estesi.

**Query params:** `seasonId`, `role`, `search`, `hasQuote`, `hasVote` (boolean), `page`, `limit`

**Response 200:** array di giocatori con campi estesi (externalId, quote, statistiche voti).

---

### GET /admin/players/quality-check `[A]`

Controllo qualità dati per una giornata.

**Query params:** `seasonId`, `round`

**Response 200:**
```json
{
  "seasonId": "uuid",
  "round": 11,
  "matched": 575,
  "quoteOnlyNoVote": 35,
  "voteOnlyNoQuote": 12,
  "svDerived": 42,
  "anomalies": [
    { "type": "VOTE_OUT_OF_RANGE", "playerId": "uuid", "playerName": "...", "vote": 11.0 }
  ]
}
```

---

## Admin — Utenti `/admin/users`

### GET /admin/users `[A]`

Lista partecipanti iscritti a una stagione.

**Query params:** `seasonId`, `status` (`ROSA_INCOMPLETA` | `ROSA_ATTIVA`), `page`, `limit`

**Response 200:**
```json
{
  "data": [
    {
      "userId": "uuid",
      "email": "mario.rossi@example.com",
      "firstName": "Mario",
      "lastName": "Rossi",
      "teamStatus": "ROSA_ATTIVA",
      "rosterCompletion": { "GK": 3, "DEF": 8, "MID": 8, "FWD": 6, "isComplete": true },
      "currentROI": 4.29,
      "totalOperations": 3
    }
  ],
  "total": 50
}
```

---

### GET /admin/users/:userId/team `[A]`

Dettaglio portafoglio di un partecipante visto dall'admin.

**Query params:** `seasonId`

**Response 200:** stesso formato di `GET /teams/my` ma con email e dati completi.

---

### PATCH /admin/users/:userId/status `[A]`

Disabilita o riabilita un account.

**Body:** `{ "status": "DISABLED", "reason": "Violazione regolamento." }`

**Response 200:** utente aggiornato.

---

## Admin — Premi `/admin/prizes`

### GET /admin/prizes/:seasonId `[A]`

Configurazione premi della stagione.

**Response 200:**
```json
{
  "seasonId": "uuid",
  "status": "DRAFT",
  "totalCommissions": 420.50,
  "platformFeeAmount": 42.05,
  "prizePoolAmount": 378.45,
  "prizeStructure": [
    { "position": 1, "pct": 0.40, "amount": 151.38 },
    { "position": 2, "pct": 0.25, "amount": 94.61 },
    { "position": 3, "pct": 0.15, "amount": 56.77 }
  ],
  "eligibleParticipants": 9
}
```

---

### PUT /admin/prizes/:seasonId `[A]`

Aggiorna la struttura premi (solo se stagione non terminata).

**Body:**
```json
{
  "prizeStructure": [
    { "position": 1, "pct": 0.40 },
    { "position": 2, "pct": 0.25 },
    { "position": 3, "pct": 0.15 }
  ]
}
```

**Response 200:** configurazione aggiornata con importi calcolati.

---

### POST /admin/prizes/:seasonId/distribute `[A]`

Assegna i premi a fine stagione. Solo se stagione in stato `CHIUSURA` o `TERMINATA`.

**Body:**
```json
{ "confirm": true }
```

**Response 200:**
```json
{
  "distributed": true,
  "awards": [
    { "userId": "uuid", "displayName": "Mario R.", "position": 1, "roi": 9.23, "amount": 151.38 },
    { "userId": "uuid", "displayName": "Luigi B.", "position": 2, "roi": 7.80, "amount": 94.61 }
  ]
}
```

---

## Admin — Report `/admin/reports`

### POST /admin/reports/generate `[A]`

Genera un report esportabile.

**Body:**
```json
{
  "seasonId": "uuid",
  "type": "FINAL_RANKINGS",
  "format": "CSV"
}
```

Tipi disponibili: `FINAL_RANKINGS`, `COMMISSIONS_BY_PARTICIPANT`, `PLATFORM_REVENUE`, `ROUND_CALCULATIONS`, `PRIZE_AWARDS`.

**Response 200:**
```json
{
  "reportId": "uuid",
  "downloadUrl": "/admin/reports/uuid/download",
  "expiresAt": "2026-05-12T20:00:00Z"
}
```

---

### GET /admin/reports/:reportId/download `[A]`

Scarica il file generato.

**Response 200:** file binario con header `Content-Disposition: attachment; filename="..."`

---

## Admin — Audit Log `/admin/audit`

### GET /admin/audit `[A]`

Lista del log di audit.

**Query params:**
- `seasonId`
- `action`: enum action type
- `userId`: filtra per admin specifico
- `status`: `SUCCESS` | `ERROR`
- `from`, `to`: range di date ISO 8601
- `page`, `limit`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userEmail": "admin@fantatrading.app",
      "action": "IMPORT_VOTES",
      "entityType": "RoundCalculation",
      "entityId": "uuid",
      "detail": { "round": 10, "rowsImported": 580, "svDerived": 42 },
      "status": "SUCCESS",
      "executedAt": "2026-10-25T16:00:00Z"
    }
  ],
  "total": 85
}
```

**Nota:** questo endpoint è read-only. Non esiste `POST`, `PATCH` o `DELETE` per `/admin/audit`.

---

## Codici di stato HTTP utilizzati

| Codice | Significato nel contesto FantaTrading |
|--------|--------------------------------------|
| 200 | Operazione completata con successo |
| 201 | Risorsa creata (acquisto, vendita, iscrizione) |
| 202 | Operazione accettata e in corso (calcolo asincrono) |
| 204 | Completato senza corpo (logout) |
| 400 | Input non valido (campo mancante, formato errato, violazione regola business) |
| 401 | Token mancante o scaduto |
| 403 | Ruolo insufficiente o account disabilitato |
| 404 | Risorsa non trovata |
| 409 | Conflitto (duplicato, stato non compatibile) |
| 422 | Dati semanticamente non validi (es. validazione import fallita) |
| 429 | Troppe richieste (rate limit) |
| 500 | Errore interno non previsto |
| 503 | Servizio temporaneamente non disponibile (calcolo in corso) |
