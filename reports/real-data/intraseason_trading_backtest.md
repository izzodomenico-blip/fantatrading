# FantaTrading - Backtest Intra-stagione con Quotazioni Sintetiche

## 1. Avvertenza

Le quotazioni giornata per giornata usate in questo report sono sintetiche, stimate e non ufficiali Fantacalcio. Il risultato non e ufficiale e serve solo per analisi esplorativa del trading intra-stagione.

## 2. Modello operativo quotazioni

Modello: **ROLE_BONUS_SENSITIVE**

| Metrica | Valore |
|---------|--------|
| MAE | 1.46 |
| RMSE | 2.05 |
| Entro 1 punto | 62.16% |
| Entro 2 punti | 82.34% |
| Entro 3 punti | 92.47% |
| MAE attaccanti | 1.67 |

## 3. Confronto strategie

| Strategia | ROI medio | ROI mediano | Best | Worst | Volatilita | >0% | >7% | >10% | Cambi medi | Commissioni | Delta vs HOLD | Rischio overtrading |
|-----------|-----------|-------------|------|-------|------------|-----|-----|------|------------|-------------|---------------|--------------------|
| HOLD | 217.20% | 217.20% | 241.31% | 193.09% | 24.11 | 100.00% | 100.00% | 100.00% | 0.00 | 2.19 | 0.00pp | LOW |
| VALUE_ROTATION | 166.60% | 166.60% | 168.31% | 164.90% | 1.70 | 100.00% | 100.00% | 100.00% | 5.00 | 2.96 | -50.59pp | LOW |
| MOMENTUM | -19.42% | -19.42% | -16.19% | -22.64% | 3.23 | 0.00% | 0.00% | 0.00% | 5.00 | 23.43 | -236.61pp | LOW |
| STOP_LOSS | 217.20% | 217.20% | 241.31% | 193.09% | 24.11 | 100.00% | 100.00% | 100.00% | 0.00 | 2.19 | 0.00pp | LOW |
| TAKE_PROFIT | -22.58% | -22.58% | -18.87% | -26.28% | 3.70 | 0.00% | 0.00% | 0.00% | 2.00 | 22.62 | -239.77pp | LOW |
| HYBRID_VALUE_MOMENTUM | 172.74% | 172.74% | 208.65% | 136.83% | 35.91 | 100.00% | 100.00% | 100.00% | 3.00 | 2.96 | -44.46pp | LOW |

## 4. Confronto frequenza cambi

| Frequenza | ROI medio | Cambi medi | Commissioni medie | % >7 |
|-----------|-----------|------------|-------------------|------|
| ogni 3 giornate | 58.81% | 18.56 | 13.77 | 60.00% |
| ogni 5 giornate | 81.89% | 11.01 | 12.68 | 60.00% |
| ogni 7 giornate | 83.68% | 7.70 | 11.70 | 60.00% |

## 5. Confronto numero massimo cambi

| Max cambi | ROI medio | Cambi medi | Commissioni medie | % >7 |
|-----------|-----------|------------|-------------------|------|
| 1 | 92.59% | 5.32 | 11.18 | 60.00% |
| 3 | 69.12% | 12.77 | 12.77 | 60.00% |
| 5 | 62.69% | 19.18 | 14.20 | 60.00% |

## 6. Impatto commissioni

Ogni cambio genera commissione vendita 2% e commissione acquisto 2%. La platform fee simulata e il 10% delle commissioni, non del montepremi totale.

## 7. Cambi illimitati e limite cambi

I cambi illimitati sono rischiosi perche aumentano commissioni e overtrading. Il test mostra che il limite per finestra va mantenuto e confrontato con la frequenza di mercato.

## 8. Soglia premio

La soglia 7% resta la soglia V1 di riferimento. Con alcune strategie la quota sopra 7% e alta: la soglia 10% va monitorata.

## 9. Raccomandazione preliminare

Strategia piu forte completed: **HOLD** con frequenza 3, max cambi 1, ROI medio 217.20%.
Il trading intra-stagione va considerato esplorativo finche le quotazioni giornata per giornata restano sintetiche. La regola V1 dovrebbe introdurre un limite cambi per finestra e mantenere commissioni 2%/2% per contenere overtrading.

## 10. Sezione 2025/26 in_progress

La stagione 2025/26 e separata e non usata per raccomandazioni definitive.

| Strategia | ROI medio best setup | % >7 | Cambi medi |
|-----------|----------------------|------|------------|
| HOLD | 220.08% | 100.00% | 0.00 |
| VALUE_ROTATION | 208.86% | 100.00% | 7.00 |
| MOMENTUM | -23.06% | 0.00% | 5.00 |
| STOP_LOSS | 220.08% | 100.00% | 0.00 |
| TAKE_PROFIT | -24.46% | 0.00% | 4.00 |
| HYBRID_VALUE_MOMENTUM | 157.17% | 100.00% | 4.00 |