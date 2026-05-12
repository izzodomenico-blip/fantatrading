# FantaTrading - Commission Revenue Model Simulation

## 1. Executive summary

La simulazione consiglia per V1 **buy 1.50% / sell 3.00% / soglia premio 5%** con modello **100% commissioni trattenute dal sistema**.
Il punteggio finale migliore e 77.42/100. Le raccomandazioni definitive usano solo le stagioni completed 2023/24, 2024/25; 2025/26 resta separata.

## 2. Vecchio modello 10% vs nuovo modello 100% commissioni

A parita di fee 2%/2% e soglia 7%, il vecchio modello genera revenue media per partecipante 0.76, mentre il nuovo modello genera 7.57. Il ROI utente resta identico perche la commissione pagata e la stessa; cambia la destinazione economica della commissione.

## 3. Perche le commissioni possono essere ricavo del sistema

Le commissioni sono costi di operazione: riducono il rendimento netto del partecipante quando compra o vende. Se il regolamento dichiara che sono trattenute dal sistema, esse finanziano gestione, organizzazione, premi operativi e sostenibilita senza applicare una trattenuta diretta sul capitale rosa.

## 4. Esempi pratici

| Operazione | Fee | Commissione | Incasso/costo utente | Ricavo sistema 100% |
|---|---:|---:|---:|---:|
| Acquisto a 100 | 1.00% | 1.00 | costo 101.00 | 1.00 |
| Acquisto a 100 | 2.00% | 2.00 | costo 102.00 | 2.00 |
| Acquisto a 100 | 3.00% | 3.00 | costo 103.00 | 3.00 |
| Vendita a 120 | 1.00% | 1.20 | incasso 118.80 | 1.20 |
| Vendita a 120 | 2.00% | 2.40 | incasso 117.60 | 2.40 |
| Vendita a 120 | 3.00% | 3.60 | incasso 116.40 | 3.60 |

Esempio plusvalenza netta: acquisto 100 con fee 2%, vendita 120 con fee 2% = utile netto 15.60; ricavo sistema 4.40.

## 5. Tabella confronto modelli A-J

| Configurazione | Buy | Sell | Soglia | Modello ricavo | ROI medio | > soglia | Revenue/utente | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| MODEL_A_PREVIOUS_PLATFORM_10 | 2.00% | 2.00% | 7% | PLATFORM_10_OF_COMMISSIONS | -2.45% | 14.60% | 0.76 | 48.82 |
| MODEL_B_COMMISSION_100_BASE | 2.00% | 2.00% | 7% | COMMISSION_100_TO_PLATFORM | -2.45% | 14.60% | 7.57 | 74.36 |
| MODEL_C_LOW_FEES | 1.00% | 1.00% | 7% | COMMISSION_100_TO_PLATFORM | -0.48% | 20.39% | 3.78 | 60.01 |
| MODEL_D_ASYMMETRIC_ORIGINAL_BUY | 2.00% | 1.25% | 7% | COMMISSION_100_TO_PLATFORM | -1.71% | 16.77% | 6.15 | 67.70 |
| MODEL_E_ASYMMETRIC_SELL_HIGHER | 1.50% | 2.00% | 7% | COMMISSION_100_TO_PLATFORM | -1.97% | 15.86% | 6.62 | 71.95 |
| MODEL_F_BALANCED_MEDIUM | 1.50% | 1.50% | 7% | COMMISSION_100_TO_PLATFORM | -1.47% | 17.43% | 5.68 | 69.53 |
| MODEL_G_HIGHER_FEES | 2.50% | 2.50% | 7% | COMMISSION_100_TO_PLATFORM | -3.42% | 12.02% | 9.46 | 72.94 |
| MODEL_H_TRADING_BRAKE | 1.50% | 3.00% | 7% | COMMISSION_100_TO_PLATFORM | -2.97% | 13.07% | 8.51 | 73.85 |
| MODEL_I_USER_FRIENDLY | 1.00% | 2.00% | 7% | COMMISSION_100_TO_PLATFORM | -1.49% | 17.20% | 5.67 | 70.47 |
| MODEL_J_PLATFORM_STRONG | 3.00% | 3.00% | 7% | COMMISSION_100_TO_PLATFORM | -4.38% | 9.98% | 11.35 | 69.38 |

## 6. Risultati matrice buy/sell/prizeThreshold

### Top 10 equilibrio generale
| Configurazione | Buy | Sell | Soglia | Modello ricavo | ROI medio | > soglia | Revenue/utente | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| MATRIX_BUY_1.50_SELL_3.00_PRIZE_5 | 1.50% | 3.00% | 5% | COMMISSION_100_TO_PLATFORM | -2.97% | 18.46% | 8.51 | 77.42 |
| MATRIX_BUY_2.00_SELL_2.50_PRIZE_5 | 2.00% | 2.50% | 5% | COMMISSION_100_TO_PLATFORM | -2.95% | 18.53% | 8.51 | 77.42 |
| MATRIX_BUY_2.50_SELL_2.50_PRIZE_5 | 2.50% | 2.50% | 5% | COMMISSION_100_TO_PLATFORM | -3.42% | 17.14% | 9.46 | 77.04 |
| MATRIX_BUY_2.50_SELL_2.00_PRIZE_5 | 2.50% | 2.00% | 5% | COMMISSION_100_TO_PLATFORM | -2.93% | 18.84% | 8.51 | 76.22 |
| MATRIX_BUY_2.00_SELL_3.00_PRIZE_5 | 2.00% | 3.00% | 5% | COMMISSION_100_TO_PLATFORM | -3.45% | 17.07% | 9.46 | 76.08 |
| MATRIX_BUY_1.00_SELL_3.00_PRIZE_5 | 1.00% | 3.00% | 5% | COMMISSION_100_TO_PLATFORM | -2.49% | 19.94% | 7.57 | 75.59 |
| MATRIX_BUY_1.50_SELL_2.50_PRIZE_5 | 1.50% | 2.50% | 5% | COMMISSION_100_TO_PLATFORM | -2.47% | 20.00% | 7.57 | 75.58 |
| MATRIX_BUY_3.00_SELL_2.00_PRIZE_5 | 3.00% | 2.00% | 5% | COMMISSION_100_TO_PLATFORM | -3.40% | 17.45% | 9.46 | 75.50 |
| MATRIX_BUY_2.00_SELL_2.00_PRIZE_5 | 2.00% | 2.00% | 5% | COMMISSION_100_TO_PLATFORM | -2.45% | 20.30% | 7.57 | 75.24 |
| MODEL_B_COMMISSION_100_BASE | 2.00% | 2.00% | 7% | COMMISSION_100_TO_PLATFORM | -2.45% | 14.60% | 7.57 | 74.36 |

### Top 10 sostenibilita piattaforma
| Configurazione | Buy | Sell | Soglia | Modello ricavo | ROI medio | > soglia | Revenue/utente | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| MATRIX_BUY_1.50_SELL_3.00_PRIZE_5 | 1.50% | 3.00% | 5% | COMMISSION_100_TO_PLATFORM | -2.97% | 18.46% | 8.51 | 77.42 |
| MATRIX_BUY_2.00_SELL_2.50_PRIZE_5 | 2.00% | 2.50% | 5% | COMMISSION_100_TO_PLATFORM | -2.95% | 18.53% | 8.51 | 77.42 |
| MATRIX_BUY_2.50_SELL_2.50_PRIZE_5 | 2.50% | 2.50% | 5% | COMMISSION_100_TO_PLATFORM | -3.42% | 17.14% | 9.46 | 77.04 |
| MATRIX_BUY_2.50_SELL_2.00_PRIZE_5 | 2.50% | 2.00% | 5% | COMMISSION_100_TO_PLATFORM | -2.93% | 18.84% | 8.51 | 76.22 |
| MATRIX_BUY_2.00_SELL_3.00_PRIZE_5 | 2.00% | 3.00% | 5% | COMMISSION_100_TO_PLATFORM | -3.45% | 17.07% | 9.46 | 76.08 |
| MATRIX_BUY_3.00_SELL_2.00_PRIZE_5 | 3.00% | 2.00% | 5% | COMMISSION_100_TO_PLATFORM | -3.40% | 17.45% | 9.46 | 75.50 |
| MATRIX_BUY_3.00_SELL_2.50_PRIZE_5 | 3.00% | 2.50% | 5% | COMMISSION_100_TO_PLATFORM | -3.89% | 15.83% | 10.40 | 74.19 |
| MATRIX_BUY_2.50_SELL_3.00_PRIZE_5 | 2.50% | 3.00% | 5% | COMMISSION_100_TO_PLATFORM | -3.92% | 15.75% | 10.40 | 74.08 |
| MATRIX_BUY_3.00_SELL_1.50_PRIZE_5 | 3.00% | 1.50% | 5% | COMMISSION_100_TO_PLATFORM | -2.91% | 19.08% | 8.51 | 74.08 |
| MATRIX_BUY_2.00_SELL_2.50_PRIZE_7 | 2.00% | 2.50% | 7% | COMMISSION_100_TO_PLATFORM | -2.95% | 13.12% | 8.51 | 73.93 |

### Top 10 attrattivita utenti
| Configurazione | Buy | Sell | Soglia | Modello ricavo | ROI medio | > soglia | Revenue/utente | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| MATRIX_BUY_0.50_SELL_0.50_PRIZE_10 | 0.50% | 0.50% | 10% | COMMISSION_100_TO_PLATFORM | 0.52% | 14.71% | 1.89 | 50.49 |
| MATRIX_BUY_0.50_SELL_0.50_PRIZE_7 | 0.50% | 0.50% | 7% | COMMISSION_100_TO_PLATFORM | 0.52% | 23.67% | 1.89 | 48.59 |
| MATRIX_BUY_0.50_SELL_0.50_PRIZE_12 | 0.50% | 0.50% | 12% | COMMISSION_100_TO_PLATFORM | 0.52% | 10.20% | 1.89 | 46.89 |
| MATRIX_BUY_0.50_SELL_0.50_PRIZE_5 | 0.50% | 0.50% | 5% | COMMISSION_100_TO_PLATFORM | 0.52% | 31.00% | 1.89 | 42.72 |
| MATRIX_BUY_1.00_SELL_0.50_PRIZE_7 | 1.00% | 0.50% | 7% | COMMISSION_100_TO_PLATFORM | 0.02% | 22.00% | 2.84 | 52.10 |
| MATRIX_BUY_1.00_SELL_0.50_PRIZE_10 | 1.00% | 0.50% | 10% | COMMISSION_100_TO_PLATFORM | 0.02% | 13.48% | 2.84 | 51.69 |
| MATRIX_BUY_1.00_SELL_0.50_PRIZE_12 | 1.00% | 0.50% | 12% | COMMISSION_100_TO_PLATFORM | 0.02% | 9.25% | 2.84 | 48.31 |
| MATRIX_BUY_1.00_SELL_0.50_PRIZE_5 | 1.00% | 0.50% | 5% | COMMISSION_100_TO_PLATFORM | 0.02% | 29.09% | 2.84 | 46.43 |
| MATRIX_BUY_0.50_SELL_1.00_PRIZE_7 | 0.50% | 1.00% | 7% | COMMISSION_100_TO_PLATFORM | 0.01% | 21.98% | 2.84 | 54.11 |
| MATRIX_BUY_0.50_SELL_1.00_PRIZE_10 | 0.50% | 1.00% | 10% | COMMISSION_100_TO_PLATFORM | 0.01% | 13.46% | 2.84 | 53.66 |

## 7. Analisi per numero partecipanti

| Partecipanti | Revenue stimata modello consigliato |
|---:|---:|
| 20 | 170.25 |
| 50 | 425.62 |
| 100 | 851.23 |
| 250 | 2128.09 |
| 500 | 4256.17 |
| 1000 | 8512.34 |

## 8. Analisi HOLD vs trading attivo

Il delta medio trading attivo vs HOLD nel segnale intra-stagione sintetico e -31.29 punti percentuali. Il dato e esplorativo e non ufficiale, ma indica che i cambi liberi non sono automaticamente dominanti quando le commissioni vengono applicate a ogni operazione.

## 9. Analisi strategia VALUE

Rischio dominanza VALUE nella configurazione consigliata: **MEDIUM**. Il controllo VALUE pesa il 10% dello score e penalizza configurazioni in cui VALUE supera troppo il gruppo di strategie completed.

## 10. Analisi overtrading

Rischio overtrading: **LOW**. I cambi restano liberi, ma il costo operativo cresce con ogni vendita e riacquisto. La sell fee e il principale freno comportamentale al cambio compulsivo.

## 11. Impatto soglia premio 5/7/10/12

| Soglia | Score medio | Vincitori stimati | Lettura |
|---:|---:|---:|---|
| 5% | 65.83 | 22.35% | molto attrattiva ma poco selettiva |
| 7% | 67.26 | 16.33% | compromesso V1 |
| 10% | 62.89 | 9.48% | piu sostenibile ma selettiva |
| 12% | 60.32 | 6.27% | piu sostenibile ma selettiva |

## 12. Raccomandazione commissione acquisto

Buy fee consigliata: **1.50%**. Una fee di acquisto troppo alta penalizza anche HOLD e riduce l attrattivita iniziale; tra 1.5% e 2% il modello resta leggibile e sostenibile.

## 13. Raccomandazione commissione vendita

Sell fee consigliata: **3.00%**. La vendita influenza piu direttamente il comportamento di trading; analisi sensibilita: buy 9.43 punti score, sell 15.40 punti score, impatto prevalente: sell.

## 14. Raccomandazione soglia premio

Soglia premio consigliata: **5%**. Mantiene selettivita senza azzerare la percezione di raggiungibilita.

## 15. Raccomandazione finale modello economico

Il modello consigliato e `COMMISSION_REVENUE_MODEL`: 100% delle commissioni di acquisto e vendita e trattenuto dal sistema/piattaforma; le commissioni non rientrano nel montepremi e non sono una percentuale diretta sul capitale rosa.

## 16. Proposta regolamento aggiornata

- Commissione acquisto: 1.50%.
- Commissione vendita: 3.00%.
- Cambi liberi, senza limite massimo.
- Le commissioni sono trattenute dal sistema a copertura dei costi di gestione e organizzazione.
- Soglia premio: 5%.
- NoVotePolicy principale: PLAYER_ZERO_TEAM_EXCLUDE.

## 17. Limiti

- Quotazioni intra-stagione sintetiche: non dichiarare risultati intra-stagione come ufficiali.
- Raccomandazioni definitive basate solo su 2023/24 e 2024/25 completed.
- Algoritmo Fantacalcio non ufficiale e non replicato.
- Comportamento utenti reale non ancora osservato.
- Le percentuali sopra soglia nella matrice sono stimate da media e volatilita aggregate, non da distribuzioni rieseguite per ogni fee.

## 18. Prossimi passi

- Raccogliere quotazioni ufficiali giornata per giornata.
- Simulare utenti reali con frequenze di cambio osservate.
- Validare il costo operativo minimo della piattaforma per definire break-even monetario reale.
- Ripetere la matrice dopo la prima stagione pilota.

## Classificazioni richieste

Configurazione consigliata V1: **MATRIX_BUY_1.50_SELL_3.00_PRIZE_5**.
Alternativa conservativa: **MATRIX_BUY_2.00_SELL_2.00_PRIZE_10**.
Alternativa user-friendly: **MODEL_I_USER_FRIENDLY**.
Migliore con pochi utenti: **MATRIX_BUY_1.50_SELL_3.00_PRIZE_5**.
Migliore con molti utenti: **MODEL_I_USER_FRIENDLY**.

### Configurazioni da evitare
| Configurazione | Buy | Sell | Soglia | Modello ricavo | ROI medio | > soglia | Revenue/utente | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| MATRIX_BUY_3.00_SELL_3.00_PRIZE_12 | 3.00% | 3.00% | 12% | COMMISSION_100_TO_PLATFORM | -4.38% | 3.25% | 11.35 | 63.99 |
| MATRIX_BUY_2.50_SELL_3.00_PRIZE_12 | 2.50% | 3.00% | 12% | COMMISSION_100_TO_PLATFORM | -3.92% | 3.65% | 10.40 | 64.40 |
| MATRIX_BUY_3.00_SELL_3.00_PRIZE_10 | 3.00% | 3.00% | 10% | COMMISSION_100_TO_PLATFORM | -4.38% | 5.26% | 11.35 | 65.60 |
| MATRIX_BUY_2.50_SELL_3.00_PRIZE_10 | 2.50% | 3.00% | 10% | COMMISSION_100_TO_PLATFORM | -3.92% | 5.85% | 10.40 | 66.16 |
| MODEL_J_PLATFORM_STRONG | 3.00% | 3.00% | 7% | COMMISSION_100_TO_PLATFORM | -4.38% | 9.98% | 11.35 | 69.38 |
| MATRIX_BUY_3.00_SELL_3.00_PRIZE_7 | 3.00% | 3.00% | 7% | COMMISSION_100_TO_PLATFORM | -4.38% | 9.98% | 11.35 | 69.38 |
| MATRIX_BUY_2.50_SELL_3.00_PRIZE_7 | 2.50% | 3.00% | 7% | COMMISSION_100_TO_PLATFORM | -3.92% | 10.94% | 10.40 | 70.23 |
| MATRIX_BUY_3.00_SELL_3.00_PRIZE_5 | 3.00% | 3.00% | 5% | COMMISSION_100_TO_PLATFORM | -4.38% | 14.52% | 11.35 | 73.01 |
| MATRIX_BUY_2.50_SELL_3.00_PRIZE_5 | 2.50% | 3.00% | 5% | COMMISSION_100_TO_PLATFORM | -3.92% | 15.75% | 10.40 | 74.08 |

## Analisi specifica buy fee / sell fee

Score medio simmetriche: 64.27. Score medio vendita piu alta: 65.43. Score medio acquisto piu alto: 63.45. Forma preferita: **vendita piu alta**.
Una struttura simmetrica e piu semplice da spiegare; una vendita piu alta frena meglio l overtrading; un acquisto piu alto pesa subito anche sugli utenti HOLD. Nel modello attuale, evitare buy fee eccessiva e piu importante per mantenere attrattivita.

## Copertura strategie

| Strategia | Full-rules completed | Intra-stagione sintetico | Uso nel report |
|---|---|---|---|
| HOLD | no | si | exploratory |
| RANDOM | si | no | definitive |
| LOW_COST | si | no | definitive |
| TOP_PLAYER | si | no | definitive |
| BALANCED | si | no | definitive |
| VALUE | si | no | definitive |
| VALUE_ROTATION | no | si | exploratory |
| MOMENTUM | no | si | exploratory |
| STOP_LOSS | no | si | exploratory |
| TAKE_PROFIT | no | si | exploratory |
| HYBRID_VALUE_MOMENTUM | no | si | exploratory |