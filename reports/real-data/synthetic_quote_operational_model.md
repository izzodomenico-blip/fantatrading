# Modello Sintetico Operativo Quotazioni

## Decisione

Il modello operativo sintetico consigliato per future simulazioni intra-stagione esplorative e **ROLE_BONUS_SENSITIVE**.

Questo modello e stimato e non ufficiale Fantacalcio. Non replica e non sostituisce l algoritmo proprietario Fantacalcio e non sostituisce quotazioni ufficiali giornata per giornata.

## Scopo

Purpose: `exploratory_intraseason_trading_simulation`

Il modello puo essere usato come base per simulazioni esplorative di trading intra-stagione, finche non sono disponibili quotazioni ufficiali giornata per giornata.

## Fonte della scelta

Studio sorgente: reports/real-data/synthetic_quote_deep_optimizer.md

La deep optimization ha confrontato modelli operativi e benchmark teorici. `ORACLE_FINAL_ANCHOR` e escluso dai modelli operativi perche usa Qt.A finale ed e solo un limite teorico.

## Metriche principali

| Metrica | Valore |
|---------|--------|
| MAE | 1.46 |
| RMSE | 2.05 |
| Entro 1 punto | 62.16% |
| Entro 2 punti | 82.34% |
| Entro 3 punti | 92.47% |
| MAE attaccanti | 1.67 |

## Perche ROLE_BONUS_SENSITIVE

- Ha il miglior equilibrio operativo tra MAE, RMSE, bias e stabilita.
- Riduce in modo marcato l errore sugli attaccanti rispetto ai modelli precedenti.
- Usa segnali coerenti con i dati disponibili: voto/fantavoto, presenze, gol, assist, bonus recenti e dry spell.
- Non usa Qt.A finale nel calcolo giornaliero operativo.

## Differenza rispetto ad altri modelli

| Modello | Lettura |
|---------|---------|
| BASELINE | Prima baseline sintetica, piu semplice e meno precisa. |
| AGGRESSIVE | Migliorava la reattivita ma lasciava piu errore sugli attaccanti. |
| ROBUST_MODEL | Miglior errore puro nello studio, ma con maggiore bias sugli attaccanti rispetto alla scelta operativa. |
| ROLE_BONUS_SENSITIVE | Miglior compromesso operativo, soprattutto per ruoli offensivi e attaccanti. |

## Rischi residui

- Il modello resta stimato e non ufficiale.
- Le traiettorie giornaliere sono sintetiche, non osservate.
- Mancano quotazioni ufficiali giornata per giornata.
- Mancano dati completi su minuti, titolarita, infortuni, squalifiche, rigori segnati/subiti e data ingresso lista.
- Il futuro backtest intra-stagione dovra essere marcato come esplorativo.