# FantaTrading - Gestione Giocatori Senza Voto

## Policy configurabili

Il motore `teamVoteBandEngine` supporta quattro policy per giocatori senza voto.

| Policy | Effetto sulla somma squadra | Effetto sulla media | Effetto individuale |
|--------|-----------------------------|---------------------|---------------------|
| ZERO | SV vale 0 | divisore resta 25 | nessun malus automatico |
| FIVE | SV vale 5 | divisore resta 25 | nessun malus automatico |
| EXCLUDE | SV non contribuisce | divisore ridotto ai soli valutati | conteggiato come non valutato |
| FIXED_MALUS | SV non contribuisce | divisore resta 25 | malus percentuale configurabile |

## Default attuale

La policy default e `ZERO`, coerente con la prima implementazione strutturale gia presente.

## Considerazioni

- `ZERO` penalizza molto le rose con molti giocatori senza voto.
- `FIVE` attenua la penalizzazione e simula un voto politico basso.
- `EXCLUDE` misura la qualita media dei soli giocatori valutati, ma puo premiare rose incomplete.
- `FIXED_MALUS` separa la fascia squadra dalla penalita individuale per assenza voto.

## Raccomandazione tecnica

Prima del backtest completo serve una decisione regolamentare esplicita sulla policy ufficiale. In assenza di scelta, usare `ZERO` solo per test strutturali e non per conclusioni economiche.
