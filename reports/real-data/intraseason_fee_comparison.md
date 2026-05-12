# FantaTrading — Confronto Commissione Vendita: 1.25% vs 2%

## 1. Avvertenza

Quotazioni sintetiche, risultati esplorativi. La commissione vendita 2% e 1.25% influisce sul ROI netto del partecipante e sul ricavo piattaforma.

**Modello quotazioni sintetiche:** ROLE_BONUS_SENSITIVE
**Stagioni completed:** 2023/24, 2024/25
**Acquisto:** 2% (fisso) — **Vendita scenario A:** 1.25% — **Vendita scenario B:** 2.00%

## 2. Scenario A — Commissione Vendita 1.25% (Regolamento Originale)

| Strategia | ROI medio | ROI mediano | Best | Worst | >0% | >7% | >10% | Cambi medi | Commissioni | Rev. piattaforma | Delta vs HOLD |
|-----------|-----------|-------------|------|-------|-----|-----|------|------------|-------------|-----------------|---------------|
| HOLD | 5.30% | 5.30% | 8.54% | 2.05% | 100.00% | 50.00% | 0.00% | 0.00 | 0.856 | 0.086 | 0.00pp |
| VALUE_ROTATION | -24.63% | -24.63% | 4.02% | -57.14% | 11.11% | 0.00% | 0.00% | 24.00 | 4.103 | 0.410 | -29.93pp |
| MOMENTUM | -57.48% | -57.48% | -18.99% | -89.80% | 0.00% | 0.00% | 0.00% | 24.00 | 21.041 | 2.104 | -62.77pp |
| STOP_LOSS | 4.59% | 4.59% | 8.54% | -2.22% | 83.33% | 50.00% | 0.00% | 0.17 | 0.865 | 0.087 | -0.71pp |
| TAKE_PROFIT | -37.40% | -37.40% | -22.41% | -50.90% | 0.00% | 0.00% | 0.00% | 8.11 | 18.745 | 1.874 | -42.69pp |
| HYBRID_VALUE_MOMENTUM | -15.04% | -15.04% | 2.66% | -28.89% | 22.22% | 0.00% | 0.00% | 5.83 | 1.471 | 0.147 | -20.34pp |

## 3. Scenario B — Commissione Vendita 2% (Regolamento V1 Proposto)

| Strategia | ROI medio | ROI mediano | Best | Worst | >0% | >7% | >10% | Cambi medi | Commissioni | Rev. piattaforma | Delta vs HOLD |
|-----------|-----------|-------------|------|-------|-----|-----|------|------------|-------------|-----------------|---------------|
| HOLD | 4.50% | 4.50% | 7.72% | 1.28% | 100.00% | 50.00% | 0.00% | 0.00 | 1.064 | 0.106 | 0.00pp |
| VALUE_ROTATION | -25.34% | -25.34% | 3.14% | -57.64% | 11.11% | 0.00% | 0.00% | 24.00 | 4.980 | 0.498 | -29.84pp |
| MOMENTUM | -57.80% | -57.80% | -19.60% | -89.88% | 0.00% | 0.00% | 0.00% | 24.00 | 25.592 | 2.559 | -62.30pp |
| STOP_LOSS | 3.79% | 3.79% | 7.72% | -2.98% | 83.33% | 50.00% | 0.00% | 0.17 | 1.074 | 0.107 | -0.71pp |
| TAKE_PROFIT | -37.88% | -37.88% | -23.00% | -51.28% | 0.00% | 0.00% | 0.00% | 8.11 | 22.622 | 2.262 | -42.37pp |
| HYBRID_VALUE_MOMENTUM | -15.78% | -15.78% | 1.75% | -29.50% | 22.22% | 0.00% | 0.00% | 5.83 | 1.785 | 0.179 | -20.28pp |

## 4. Delta scenario B − A (impatto del +0.75% commissione vendita)

| Strategia | ΔROI | ΔCommissioni | ΔRicavo piattaforma | ΔDelta vs HOLD |
|-----------|------|-------------|--------------------|--------------  |
| HOLD | -0.80pp | +0.208 | +0.0208 | +0.00pp |
| VALUE_ROTATION | -0.71pp | +0.878 | +0.0878 | +0.09pp |
| MOMENTUM | -0.33pp | +4.551 | +0.4551 | +0.47pp |
| STOP_LOSS | -0.80pp | +0.209 | +0.0209 | +0.00pp |
| TAKE_PROFIT | -0.48pp | +3.878 | +0.3878 | +0.32pp |
| HYBRID_VALUE_MOMENTUM | -0.74pp | +0.314 | +0.0314 | +0.06pp |

## 5. Analisi e Conclusioni

- 1. Con commissione vendita 1.25% (scenario A), il trading attivo NON BATTE HOLD. Miglior ROI attivo: -15.04% vs HOLD: 5.30%.

- 2. Con commissione vendita 2.00% (scenario B), il trading attivo NON BATTE HOLD. Miglior ROI attivo: -15.78% vs HOLD: 4.50%.

- 3. Passando da 1.25% a 2.00% di commissione vendita, il ricavo medio piattaforma aumenta del 21.3%.

- 4. La commissione vendita 2% NON e ancora chiaramente consigliata: migliora la sostenibilita piattaforma del 21.3% ma penalizza HOLD di 0.80 pp. Con dati sintetici la decisione e ancora esplorativa.

- 5. I cambi illimitati (MOMENTUM/TAKE_PROFIT) SEMBRANO PERICOLOSI: MOMENTUM (-57.5%) e TAKE_PROFIT (-37.4%) hanno ROI significativamente inferiore a HOLD (5.3%). Il trading frequente e penalizzato dalle commissioni.

## 6. Dettaglio per ogni domanda regolamentare

**1. Con vendita 1.25%, il trading attivo batte HOLD?**
No. Margine miglior strategia attiva vs HOLD: -20.34pp. Con questo modello sintetico il trading attivo non produce un vantaggio strutturale rispetto a HOLD.

**2. Con vendita 2%, il trading attivo batte HOLD?**
No. Margine: -20.28pp. La commissione piu alta rende il trading attivo ancora meno attraente.

**3. Quanto migliora la sostenibilita piattaforma con vendita 2%?**
Ricavo medio piattaforma aumenta del **21.3%** passando da 1.25% a 2% di commissione vendita. Ogni unita di trade aggiuntiva frutta di piu alla piattaforma.

**4. La commissione vendita 2% e consigliata?**
Con dati sintetici la risposta e incerta. L aumento del 21.3% del ricavo piattaforma giustifica il costo per il partecipante (-0.80pp su HOLD). La decisione definitiva richiede dati di quotazione ufficiali giornata per giornata.

**5. I cambi illimitati sembrano pericolosi?**
Si. MOMENTUM (-57.5%) e TAKE_PROFIT (-37.4%) hanno ROI significativamente inferiore a HOLD (5.3%). Il trading frequente e penalizzato dalle commissioni. Il regolamento V1 dovrebbe mantenere un limite di cambi per finestra per contenere il rischio overtrading.

## 7. Limiti del modello

- Le quotazioni sintetiche round-by-round hanno MAE 1.46 punti: il confronto e esplorativo.
- I risultati non includono montepremi, liquidita e vincoli reali di mercato.
- STOP_LOSS con soglia -5%/-10% su quotazioni sintetiche non scatta mai in stagioni con qaa stabile: equivale a HOLD.
- Ogni stagione ha un solo portfolio (nessuna randomizzazione), quindi varianza basata sulle 2 stagioni completed.