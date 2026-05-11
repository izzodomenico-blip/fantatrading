# FantaTrading — Analisi Modello di Prezzo Calciatori

**Generato il:** 11/05/2026, 22:05:43
**Config:** N=50, 100 run/punto, 38 giornate

## Confronto Random Walk vs Mean-Reverting

| Rate | Drift Medio | Drift % | Std Dev Prezzi | Montepremi | Ricavo Piatt. | Break-even | ROI Vincitore | Capitale Finale |
|------|------------|---------|---------------|-----------|--------------|------------|---------------|-----------------|
| **0** ← RW | 48.9 | 338.9% | 33.3 | 5250 | 583 | 12.0% | 4100% | 717 |
| **0.02** | 34.3 | 236.1% | 24.6 | 4940 | 549 | 12.0% | 3852% | 626 |
| **0.05** ← REC | 22.3 | 151.7% | 18.7 | 4616 | 513 | 12.0% | 3593% | 549 |
| **0.1** | 13.6 | 90.2% | 15.1 | 4322 | 480 | 12.0% | 3358% | 496 |
| **0.15** | 9.8 | 62.7% | 13.5 | 4162 | 462 | 12.0% | 3229% | 479 |
| **0.2** | 7.7 | 47.1% | 12.6 | 4068 | 452 | 12.0% | 3154% | 471 |

## Raccomandazione

**Tasso consigliato: `meanReversionRate = 0.05`**

Riduce il drift prezzi del 54% (da 48.9 a 22.3 crediti) con variazione montepremi di -12.1% — rapporto ottimale realismo/invarianza economica.

## Risultati chiave

- DRIFT PREZZI: Con random walk (rate=0) i prezzi deviano in media di 48.9 crediti dal valore base a fine stagione (338.9%). Con rate=0.2 il drift scende a 7.7 crediti (47.1%).
- DISPERSIONE PREZZI: La deviazione standard dei valori a fine stagione va da 33.3 crediti (rate=0) a 12.6 crediti (rate=0.2). La mean reversion comprime la dispersione, rendendo i valori più prevedibili.
- INVARIANZA ECONOMICA: Il montepremi varia al massimo del 22.5% tra tutti i modelli di prezzo testati. La scelta del meanReversionRate non altera le conclusioni economiche della Fase 3.
- CAPITALE FINALE: Il capitale medio delle squadre a fine stagione cambia del 34.4% tra rate=0 e rate=0.2. La mean reversion riduce le posizioni "estrema fortuna/sfortuna" nel portafoglio.

## Interpretazione economica

Con il **random walk puro** (rate=0):
- I valori dei calciatori possono derivare lontano dal loro valore di mercato reale.
- Squadre fortunate accumulano asset sopravvalutati; squadre sfortunate si trovano con asset svalutati.
- Il capital gain/loss da variazione prezzi diventa componente rilevante della ricchezza finale.

Con la **mean reversion** (rate>0):
- I prezzi oscillano attorno al baseValue, rappresentando meglio un mercato efficiente.
- Il vantaggio competitivo viene dall'**abilità di trading** (timing, scelta calciatori), non dalla fortuna nei prezzi.
- Le conclusioni economiche della Fase 3 restano valide: il montepremi e il margine organizzatore sono robusti al modello di prezzo.

---
*Dati generati automaticamente dal motore FantaTrading.*