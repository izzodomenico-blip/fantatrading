# FantaTrading - Requisiti Dati Voti Reali

## Stato attuale

Il progetto contiene quotazioni reali normalizzate, ma non contiene ancora voti reali giornata per giornata.

La struttura di import e validazione e stata predisposta per file CSV in:

- `data/real/raw/votes/`
- `data/real/processed/votes/`

## File richiesto

Preparare uno o piu CSV voti seguendo:

- `data/templates/votes_template.csv`

Colonne obbligatorie:

```text
season,round,playerId,playerName,club,role,vote,fantasyVote,minutesPlayed,played,starter,goals,assists,yellowCards,redCards,penaltiesMissed,ownGoals
```

## Significato colonne

| Colonna | Descrizione |
|---------|-------------|
| season | Stagione, es. `2024/25` |
| round | Giornata di campionato, intero positivo |
| playerId | Identificativo stabile del giocatore |
| playerName | Nome giocatore come nella fonte voti |
| club | Club del giocatore in quella giornata |
| role | Ruolo FantaTrading: `P`, `D`, `C`, `A` |
| vote | Voto puro, numerico se `played=true` |
| fantasyVote | Fantavoto, numerico se `played=true` |
| minutesPlayed | Minuti giocati, se disponibili |
| played | `true` se il giocatore ha voto valido, `false` altrimenti |
| starter | `true` se titolare |
| goals | Gol segnati |
| assists | Assist |
| yellowCards | Ammonizioni |
| redCards | Espulsioni |
| penaltiesMissed | Rigori sbagliati |
| ownGoals | Autogol |

## Quotazioni giornata per giornata

Per un backtest completo con trading intra-stagione servira anche:

- `data/templates/round_quotes_template.csv`

Colonne:

```text
season,round,playerId,playerName,club,role,quote
```

## Tabella bonus/malus

La tabella ufficiale del regolamento deve essere fornita seguendo:

- `data/templates/team_bonus_table_template.csv`

Colonne:

```text
teamBand,minTeamVoteSum,maxTeamVoteSum,individualVote,bonusMalusPct
```

Il codice contiene una tabella provvisoria documentata solo per rendere testabile il motore. Non va usata per decisioni economiche finche non viene sostituita dalla tabella ufficiale.

