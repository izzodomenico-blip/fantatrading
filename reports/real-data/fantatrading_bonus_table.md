# FantaTrading - Tabella Bonus/Malus Ufficiale

## Stato ufficialita

La configurazione in `src/config/teamBandBonusTables.ts` usa la tabella del **Regolamento FantaTrading originale**.

- `isOfficial`: `true`
- `source`: `Regolamento FantaTrading originale`

La gestione dei senza voto resta separata e configurabile tramite `NoVotePolicy`; non e dichiarata ufficiale.

## Fasce squadra

| Fascia | Media squadra | Somma voti squadra |
|--------|---------------|--------------------|
| FASCIA_0 | < 5 | < 125 |
| FASCIA_1 | >= 5 e < 5.5 | >= 125 e < 137.5 |
| FASCIA_2 | >= 5.5 e < 6 | >= 137.5 e < 150 |
| FASCIA_3 | >= 6 e < 6.5 | >= 150 e < 162.5 |
| FASCIA_4 | >= 6.5 | >= 162.5 |

## FASCIA_0

Bonus/malus generale: **-2.50%** a tutti i giocatori.

## FASCIA_1

| Voto | Bonus/Malus |
|------|-------------|
| 3 | -1.75% |
| 3.5 | -1.50% |
| 4 | -1.25% |
| 4.5 | -1.00% |
| 5 | -0.75% |
| 5.5 | -0.50% |
| 6 | 0.00% |
| 6.5 | 0.50% |
| 7 | 0.75% |
| 7.5 | 1.00% |
| 8 | 1.25% |
| 8.5 | 1.50% |
| 9 | 1.75% |

## FASCIA_2

| Voto | Bonus/Malus |
|------|-------------|
| 3 | -2.63% |
| 3.5 | -2.25% |
| 4 | -1.88% |
| 4.5 | -1.50% |
| 5 | -1.13% |
| 5.5 | -0.75% |
| 6 | 0.00% |
| 6.5 | 0.75% |
| 7 | 1.13% |
| 7.5 | 1.50% |
| 8 | 1.88% |
| 8.5 | 2.25% |
| 9 | 2.63% |

## FASCIA_3

| Voto | Bonus/Malus |
|------|-------------|
| 3 | -3.50% |
| 3.5 | -3.00% |
| 4 | -2.50% |
| 4.5 | -2.00% |
| 5 | -1.50% |
| 5.5 | -1.00% |
| 6 | 0.00% |
| 6.5 | 1.00% |
| 7 | 1.50% |
| 7.5 | 2.00% |
| 8 | 2.50% |
| 8.5 | 3.00% |
| 9 | 3.50% |

## FASCIA_4

| Voto | Bonus/Malus |
|------|-------------|
| 3 | -4.38% |
| 3.5 | -3.75% |
| 4 | -3.13% |
| 4.5 | -2.50% |
| 5 | -1.88% |
| 5.5 | -1.25% |
| 6 | 0.00% |
| 6.5 | 1.25% |
| 7 | 1.88% |
| 7.5 | 2.50% |
| 8 | 3.13% |
| 8.5 | 3.75% |
| 9 | 4.38% |

## Gestione voti intermedi

Per voti intermedi non presenti, il motore arrotonda al valore tabellare piu vicino.

Per voti sotto 3 o sopra 9, il motore applica clamp controllato al valore tabellare piu vicino.
