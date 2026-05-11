# FantaTrading - Tabella Bonus/Malus Fasce Voti

## Stato ufficialita

`docs/regolamento_originale.md` e presente ma non contiene la tabella numerica originale del regolamento.

Per rendere il motore configurabile e testabile e stata creata una tabella completa interpretata in `src/config/teamBandBonusTables.ts`.

Questa tabella **non va considerata ufficiale per simulazioni economiche** finche i valori del regolamento originale non vengono inseriti in forma strutturata.

## Fasce squadra

Le fasce sono calcolate sulla media dei 25 giocatori:

| Fascia | Media minima | Media massima | Somma minima | Somma massima |
|--------|--------------|---------------|--------------|---------------|
| FASCIA_0 | -inf | < 5 | -inf | 124.99 |
| FASCIA_1 | 5 | < 5.5 | 125 | 137.49 |
| FASCIA_2 | 5.5 | < 6 | 137.5 | 149.99 |
| FASCIA_3 | 6 | < 6.5 | 150 | 162.49 |
| FASCIA_4 | 6.5 | +inf | 162.5 | +inf |

## Voti individuali supportati

La tabella include almeno:

```text
3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9
```

## Assunzioni interpretative

- Il voto 6 e neutro in tutte le fasce.
- I voti sotto 6 generano malus percentuale.
- I voti sopra 6 generano bonus percentuale.
- Le fasce peggiori amplificano il malus tramite moltiplicatore.
- La fascia migliore amplifica il bonus/malus tramite moltiplicatore dedicato.
- I voti fuori range sono gestiti con clamp al voto piu vicino presente in tabella.

## Valori chiave testati

| Fascia | Voto | Bonus/Malus |
|--------|------|-------------|
| FASCIA_3 | 7 | +4% |
| FASCIA_2 | 5 | -4% |
| Tutte | 6 | 0% |

## Prossima azione richiesta

Sostituire `DEFAULT_TEAM_BAND_BONUS_TABLE_CONFIG` con la tabella ufficiale appena disponibile.

