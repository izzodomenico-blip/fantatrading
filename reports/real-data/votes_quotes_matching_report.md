# FantaTrading - Audit Collegamento Voti e Quotazioni

**Generato il:** 12/05/2026, 08:24:42

## Sintesi

| Stagione | Stato | Giocatori voti | Giocatori quotazioni | Matched | Match rate | Match Id | Match fallback nome+ruolo | Quotazioni senza voti | Voti senza quotazione | Mismatch ruolo | Mismatch nome |
|----------|-------|----------------|----------------------|---------|------------|----------|----------------------------|-----------------------|-----------------------|----------------|---------------|
| 2023/24 | completed | 587 | 539 | 512 | 87.22% | 512 | 0 | 27 | 75 | 0 | 0 |
| 2024/25 | completed | 598 | 560 | 524 | 87.63% | 524 | 0 | 36 | 74 | 0 | 0 |
| 2025/26 | in_progress | 565 | 531 | 497 | 87.96% | 497 | 0 | 34 | 68 | 0 | 0 |

## Verifica Codice Giocatore

Il codice `Cod.` importato dai file voti corrisponde al campo `Id` delle quotazioni per la quasi totalita dei giocatori con voto. Il match diretto per `season + playerId` e il criterio primario da usare nel backtest completo; il fallback `season + nome normalizzato + ruolo` va mantenuto solo come recupero diagnostico per casi non coperti da Id.

## Regola SV per Backtest Completo

I file voti normalizzati contengono solo giocatori con voto effettivo: nei dati importati non risultano righe `played=false`. Quindi il backtest completo deve dedurre il senza voto per assenza nel round: per ogni giocatore in rosa, se non esiste una riga voti con lo stesso `season + round + playerId`, quel giocatore va trattato come SV (`played=false`, `vote=null`, `fantasyVote=null`) e poi valutato tramite la `NoVotePolicy` configurata.

## 2023/24

| Metrica | Valore |
|---------|--------|
| Stato | completed |
| Match rate | 87.22% |
| Match diretto playerId/Cod | 512 |
| Match fallback season+nome+ruolo | 0 |
| Giocatori quotazioni senza voti | 27 |
| Giocatori voti senza quotazione | 75 |
| Mismatch ruolo | 0 |
| Mismatch nome | 0 |
| Duplicati voti season+round+playerId | 0 |
| Duplicati quotazioni season+playerId | 0 |
| Duplicati voti season+nome+ruolo | 0 |
| Duplicati quotazioni season+nome+ruolo | 0 |

### Esempi voti senza quotazione

- 4869 | Dominguez | C | Bologna
- 5446 | Van Hooijdonk | A | Bologna
- 418 | Goldaniga | D | Cagliari
- 4498 | Henderson L. | C | Empoli
- 6011 | Ekong | A | Empoli
- 4184 | Brekalo | A | Fiorentina
- 6243 | Borrelli | A | Frosinone
- 6442 | Canotto | A | Frosinone
- 2083 | Biraschi | D | Genoa
- 5365 | Dragusin | D | Genoa

### Esempi quotazioni senza voti

- 159 | Sepe | P | Lazio
- 510 | Pegolo | P | Sassuolo
- 543 | Padelli | P | Udinese
- 2799 | Frattali | P | Frosinone
- 4351 | Brancolini | P | Lecce
- 4491 | Berardi A. | P | Verona
- 5304 | Boer | P | Roma
- 6210 | Popa | P | Torino
- 6255 | Gori | P | Monza
- 6406 | Borbei | P | Lecce

### Esempi mismatch ruolo

Nessun mismatch ruolo rilevato sui match diretti.

### Esempi mismatch nome

Nessun mismatch nome rilevato sui match diretti.

## 2024/25

| Metrica | Valore |
|---------|--------|
| Stato | completed |
| Match rate | 87.63% |
| Match diretto playerId/Cod | 524 |
| Match fallback season+nome+ruolo | 0 |
| Giocatori quotazioni senza voti | 36 |
| Giocatori voti senza quotazione | 74 |
| Mismatch ruolo | 0 |
| Mismatch nome | 0 |
| Duplicati voti season+round+playerId | 0 |
| Duplicati quotazioni season+playerId | 0 |
| Duplicati voti season+nome+ruolo | 0 |
| Duplicati quotazioni season+nome+ruolo | 0 |

### Esempi voti senza quotazione

- 2792 | Musso | P | Atalanta
- 5067 | Bakker | D | Atalanta
- 5324 | Godfrey | D | Atalanta
- 6231 | Azzi | D | Cagliari
- 6464 | Wieteska | D | Cagliari
- 1939 | Lapadula | A | Cagliari
- 134 | Barba | D | Como
- 376 | Verdi | C | Como
- 556 | Baselli | C | Como
- 6162 | Abildgaard | C | Como

### Esempi quotazioni senza voti

- 2297 | Rossi F. | P | Atalanta
- 5822 | Bagnolini | P | Bologna
- 2809 | Vigorito | P | Como
- 6184 | Martinelli T. | P | Fiorentina
- 1926 | Di Gennaro | P | Inter
- 1930 | Pinsoglio | P | Juventus
- 6417 | Furlanetto | P | Lazio
- 2401 | Fruchtl | P | Lecce
- 6523 | Samooja | P | Lecce
- 6505 | Nava | P | Milan

### Esempi mismatch ruolo

Nessun mismatch ruolo rilevato sui match diretti.

### Esempi mismatch nome

Nessun mismatch nome rilevato sui match diretti.

## 2025/26

| Metrica | Valore |
|---------|--------|
| Stato | in_progress |
| Match rate | 87.96% |
| Match diretto playerId/Cod | 497 |
| Match fallback season+nome+ruolo | 0 |
| Giocatori quotazioni senza voti | 34 |
| Giocatori voti senza quotazione | 68 |
| Mismatch ruolo | 0 |
| Mismatch nome | 0 |
| Duplicati voti season+round+playerId | 0 |
| Duplicati quotazioni season+playerId | 0 |
| Duplicati voti season+nome+ruolo | 0 |
| Duplicati quotazioni season+nome+ruolo | 0 |

### Esempi voti senza quotazione

- 785 | Immobile | A | Bologna
- 5297 | Luvumbo | A | Cagliari
- 5512 | De Luca | A | Cremonese
- 4904 | Marì | D | Fiorentina
- 5718 | Viti | D | Fiorentina
- 6106 | Carboni V. | C | Genoa
- 6722 | Gronbaek | C | Genoa
- 7135 | Stanciu | C | Genoa
- 4177 | Pavard | D | Inter
- 4179 | Gonzalez N. | A | Juventus

### Esempi quotazioni senza voti

- 2297 | Rossi F. | P | Atalanta
- 4 | Sportiello | P | Atalanta
- 4929 | Ciocci | P | Cagliari
- 2809 | Vigorito | P | Como
- 6505 | Nava | P | Cremonese
- 6403 | Christensen O. | P | Fiorentina
- 6991 | Siegrist | P | Genoa
- 1926 | Di Gennaro | P | Inter
- 1930 | Pinsoglio | P | Juventus
- 6417 | Furlanetto | P | Lazio

### Esempi mismatch ruolo

Nessun mismatch ruolo rilevato sui match diretti.

### Esempi mismatch nome

Nessun mismatch nome rilevato sui match diretti.

## Raccomandazione Tecnica

Per il backtest completo usare `season + round + playerId` come chiave primaria voto-giornata e `season + playerId` come collegamento alle quotazioni. Per i giocatori in rosa non presenti nel file voti della giornata, generare internamente una riga SV derivata senza inventare voto o fantavoto. Il fallback per nome normalizzato e ruolo deve restare limitato a reportistica o migrazioni dati, per evitare collisioni tra omonimi e cambi ruolo.

## Rischi Residui

- Le quotazioni contengono anche giocatori mai apparsi nei voti: sono compatibili con rose/backtest, ma produrranno SV nei round in cui non compaiono.
- Alcuni nomi possono differire pur condividendo lo stesso Id: il backtest deve fidarsi dell Id, non del nome visuale.
- I cambi squadra durante la stagione sono visibili nei voti giornata per giornata, mentre le quotazioni hanno una sola squadra normalizzata: non usare la squadra come chiave primaria.
- Il fallback nome+ruolo puo collidere in presenza di omonimi; usarlo solo quando il codice Id manca o per audit.
