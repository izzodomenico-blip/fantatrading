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

Poi apri:

```text
http://localhost:5173/partecipante-favc
```

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
