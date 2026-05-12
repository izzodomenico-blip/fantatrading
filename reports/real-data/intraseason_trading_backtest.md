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
| HOLD | 5.30% | 5.30% | 8.54% | 2.05% | 3.24 | 100.00% | 50.00% | 0.00% | 0.00 | 0.86 | 0.00pp | LOW |
| VALUE_ROTATION | -1.86% | -1.86% | 4.02% | -7.74% | 5.88 | 50.00% | 0.00% | 0.00% | 5.00 | 1.36 | -7.16pp | LOW |
| MOMENTUM | -24.34% | -24.34% | -18.99% | -29.69% | 5.35 | 0.00% | 0.00% | 0.00% | 5.00 | 18.55 | -29.63pp | LOW |
| STOP_LOSS | 5.30% | 5.30% | 8.54% | 2.05% | 3.24 | 100.00% | 50.00% | 0.00% | 0.00 | 0.86 | 0.00pp | LOW |
| TAKE_PROFIT | -29.29% | -29.29% | -22.41% | -36.17% | 6.88 | 0.00% | 0.00% | 0.00% | 2.00 | 18.09 | -34.59pp | LOW |
| HYBRID_VALUE_MOMENTUM | -0.24% | -0.24% | 2.66% | -3.15% | 2.90 | 50.00% | 0.00% | 0.00% | 3.00 | 1.07 | -5.54pp | LOW |

## 4. Confronto frequenza cambi

| Frequenza | ROI medio | Cambi medi | Commissioni medie | % >7 |
|-----------|-----------|------------|-------------------|------|
| ogni 3 giornate | -32.81% | 18.56 | 9.95 | 10.00% |
| ogni 5 giornate | -25.44% | 11.01 | 9.18 | 10.00% |
| ogni 7 giornate | -19.72% | 7.70 | 8.60 | 10.00% |

## 5. Confronto numero massimo cambi

| Max cambi | ROI medio | Cambi medi | Commissioni medie | % >7 |
|-----------|-----------|------------|-------------------|------|
| 1 | -15.93% | 5.32 | 8.24 | 10.00% |
| 3 | -28.28% | 12.77 | 9.26 | 10.00% |
| 5 | -33.77% | 19.18 | 10.23 | 10.00% |

## 6. Impatto commissioni

Ogni cambio genera commissione vendita 1.25% e commissione acquisto 2%. La platform fee simulata e il 10% delle commissioni, non del montepremi totale.

## 7. Cambi illimitati e limite cambi

I cambi illimitati sono rischiosi perche aumentano commissioni e overtrading. Il test mostra che il limite per finestra va mantenuto e confrontato con la frequenza di mercato.

## 8. Soglia premio

La soglia 7% resta la soglia V1 di riferimento. Con alcune strategie la quota sopra 7% e alta: la soglia 10% va monitorata.

## 9. Raccomandazione preliminare

Strategia piu forte completed: **HOLD** con frequenza 3, max cambi 1, ROI medio 5.30%.
Il trading intra-stagione va considerato esplorativo finche le quotazioni giornata per giornata restano sintetiche. La regola V1 dovrebbe introdurre un limite cambi per finestra e mantenere commissioni 2%/2% per contenere overtrading.

## 10. Sezione 2025/26 in_progress

La stagione 2025/26 e separata e non usata per raccomandazioni definitive.

| Strategia | ROI medio best setup | % >7 | Cambi medi |
|-----------|----------------------|------|------------|
| HOLD | 3.63% | 0.00% | 0.00 |
| VALUE_ROTATION | 10.85% | 100.00% | 7.00 |
| MOMENTUM | -27.56% | 0.00% | 5.00 |
| STOP_LOSS | 3.63% | 0.00% | 0.00 |
| TAKE_PROFIT | -28.24% | 0.00% | 2.00 |
| HYBRID_VALUE_MOMENTUM | -1.09% | 0.00% | 4.00 |