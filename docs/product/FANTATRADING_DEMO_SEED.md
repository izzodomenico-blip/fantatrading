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
npm.cmd run backend:dev
npm.cmd run web:dev
```

Per riportare il team demo allo stato iniziale dopo prove di BUY/SELL reali dalla UI:

```powershell
npm.cmd run backend:seed:demo:reset
```

Il reset cancella e ricrea solo la squadra demo `demo@fantatrading.local` per la stagione `2024/25`, insieme a posizioni, operazioni, settlement e ranking collegati. Non espone un comando in UI e non cancella il catalogo di player, quote o voti importati.

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

La stagione demo preferita e `2024/25`. Vengono importati player reali, club reali, ruoli reali, quotazioni iniziali/finali e voti reali disponibili. La rosa demo ha 25 calciatori reali con composizione FAVC `3 GK / 8 DEF / 8 MID / 6 FWD`.

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
- se il backend non e disponibile, la UI resta su fallback mock/simulazione locale.

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
