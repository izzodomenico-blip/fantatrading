# FantaTrading Demo Seed

Questo seed popola un database locale con una demo backend completa per la pagina `/partecipante-favc`.

## Prerequisiti

- PostgreSQL attivo.
- Database locale `fantatrading_dev` disponibile.
- `.env` configurato con `DATABASE_URL` e `JWT_SECRET`.
- Migrazioni Prisma applicate.

## Comandi

```powershell
npm.cmd run prisma:migrate:dev
npm.cmd run backend:seed:demo
npm.cmd run backend:seed:demo:2025-26
npm.cmd run backend:dev
npm.cmd run web:dev
```

Per riportare il team demo allo stato iniziale dopo prove di BUY/SELL reali dalla UI:

```powershell
npm.cmd run backend:seed:demo:reset
npm.cmd run backend:seed:demo:2025-26:reset
```

Il reset cancella e ricrea solo la squadra demo `demo@fantatrading.local` per la stagione indicata, insieme a posizioni, operazioni, settlement e ranking collegati. Non espone un comando in UI e non cancella il catalogo di player, quote o voti importati.

Poi apri:

```text
http://localhost:5173/partecipante-favc
```

In sviluppo sono supportate entrambe le origin frontend:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Il backend puo essere raggiunto da:

```text
http://localhost:3000
http://127.0.0.1:3000
```

Configura `CORS_ORIGINS` in `.env` con entrambe le origin locali:

```text
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Se `CORS_ORIGINS` non e impostata, il backend abilita queste due origin solo in `development`; in `production` resta restrittivo e richiede origin esplicite.

## Credenziali Demo

Admin locale:

```text
admin@fantatrading.local / password
```

Partecipante locale:

```text
demo@fantatrading.local / password
```

Queste credenziali sono solo per sviluppo locale e demo, non per produzione.

## Dati Importati

Il seed usa solo dati gia presenti nel repository:

- `data/real/processed/fantacalcio_quotes_history.json`
- `data/real/processed/votes/fantacalcio_votes_history.json`
- `data/real/processed/round-quotes/synthetic_round_quotes_history.json`

La stagione principale per la creazione nuova squadra e `2025/26`, con status `IN_PROGRESS` se popolata dal seed `backend:seed:demo:2025-26`. La stagione `2024/25` resta disponibile come demo storica/backtest. Vengono importati player reali, club reali, ruoli reali, quotazioni iniziali/finali e voti reali disponibili. La rosa demo ha 25 calciatori reali con composizione FAVC `3 GK / 8 DEF / 8 MID / 6 FWD`.

## Cosa Aspettarsi Nella UI

Con backend acceso e seed eseguito, `/partecipante-favc` mostra:

- badge `Backend collegato`;
- dati team e portafoglio dal database;
- nomi reali dei calciatori;
- club e ruoli reali;
- quotazioni iniziali/finali reali;
- carte giocatore con mini grafico tipo borsa;
- dettaglio player con storico round-by-round;
- settlement finale virtuale, contabile, senza payout reale.
- BUY/SELL reali demo backend solo dopo conferma esplicita nella UI.
- creazione squadra da `/partecipante-favc/crea-squadra` con capitale virtuale iniziale libero e rosa completa 3/8/8/6.
- se il backend non e disponibile, la UI resta su fallback mock/simulazione locale.

## Creazione Squadra Dalla UI

Apri:

```text
http://localhost:5173/partecipante-favc/crea-squadra
```

Il flusso usa:

- `POST /teams` per creare un team vuoto con `initialVirtualCapital`, quando non esiste gia un team per stagione.
- `POST /teams/create-with-roster` per confermare in modo atomico una rosa completa dalla UI.
- `POST /market/buy` resta usato dalle operazioni mercato su team gia creato.

La pagina carica come stagione principale `2025/26`. Se la stagione e `IN_PROGRESS`, mostra: `Stagione 2025/26 in corso - dati disponibili fino alla giornata importata`. Se il team demo 2025/26 esiste gia, la UI mostra la scelta tra continuare la squadra esistente oppure ricostruire/reset demo alla conferma finale. Il reset UI e limitato alla demo locale e non parte mai prima della conferma.

La commissione acquisto e il 2%:

```text
costo totale = quotazione + (quotazione * 0,02)
```

Esempio: quota 34, commissione 0,68, costo totale 34,68. Se il cash virtuale iniziale non basta, la UI mostra il capitale virtuale extra che verra aggiunto solo dopo conferma.

Se manca `QuoteHistory` ufficiale, il trend usa `synthetic_round_quotes_history.json` ed e mostrato come andamento stimato nel pilot, non quotazione ufficiale Fantacalcio round-by-round.

## Autenticazione Demo

In sviluppo, se la pagina trova il backend ma non trova un token locale, prova automaticamente il login demo con `demo@fantatrading.local / password` e salva il JWT in `localStorage`. In produzione questo comportamento non e attivo.

Per impostare manualmente un token:

```powershell
$body = @{ email = "demo@fantatrading.local"; password = "password" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login -Body $body -ContentType "application/json"
```

Poi salva `accessToken` in `localStorage` con chiave `fantatrading_access_token`.

## Vincoli

- Nessun pagamento reale.
- Nessun payout reale.
- Nessuna modifica al modello FAVC.
- Settlement solo virtuale/contabile.
- Ranking principale su ROI%.
- Fallback mock frontend invariato quando backend, token, database o team non sono disponibili.
- Le operazioni reali demo modificano il database solo dopo conferma; la sezione `Simula cambio` resta locale e non scrive sul database.
- La creazione squadra non comporta pagamenti reali: `initialVirtualCapital` e l'eventuale extra sono solo capitale virtuale.
