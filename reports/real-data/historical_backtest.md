# FantaTrading — Backtest Storico Buy-and-Hold

**Generato il:** 11/05/2026, 22:17:42
**Config:** N=20 partecipanti, 200 simulazioni/stagione, seed=42
**Composizione rosa:** P=3, D=8, C=8, A=6
**Modelli:** M1, M2, M3, M4, M5

---

## Premessa metodologica

Il backtest simula una strategia **buy-and-hold pura**: ogni partecipante acquista 25 calciatori
a inizio stagione (con commissione 2%) e li vende a fine stagione (con commissione 1.25%),
usando le quotazioni Fantacalcio reali (Qt.I e Qt.A). La rosa è selezionata casualmente
rispettando la composizione 3P+8D+8C+6A.

La variazione quotazione usa la regola FantaTrading: ogni punto quotazione vale 5% del valore dell'azione.
Il rendimento applicato al valore di vendita ha floor a -100%, quindi `sellValue` non puo essere negativo.
Il rendimento statistico grezzo `(Qt.A - Qt.I) / Qt.I` non e usato per ROI, soglie o ranking del backtest.

I portfolio sono costruiti **una sola volta per stagione** e applicati a tutti e 5 i modelli
di regolamento, che differiscono solo nella distribuzione del montepremi e nella quota d'iscrizione.

## Risultati per stagione — Trading ROI (indipendente dal modello)

> Il ROI di trading è identico per tutti i modelli (stesse commissioni 2%/1.25%).

| Stagione | ROI medio | ROI mediano | % positivo | % > 5% |
|----------|-----------|-------------|------------|--------|
| 2019/20 | -10.3% | -10.3% | 13% | 5% |
| 2020/21 | -5.7% | -5.4% | 26% | 11% |
| 2021/22 | -6.2% | -6.1% | 21% | 8% |
| 2022/23 | -12.7% | -12.9% | 8% | 3% |
| 2023/24 | -7.5% | -7.3% | 18% | 6% |
| 2024/25 | -6.6% | -6.4% | 25% | 11% |

## Confronto modelli — Media su tutte le stagioni completate

| Modello | Montepremi | Ricavo Piatt. | Top Premio | ROI Vincitore | ROI Medio | % > 0 |
|---------|-----------|--------------|-----------|--------------|-----------|-------|
| **M1** Originale Puro | 1127 | 0 | — | 174% | -3.0% | 25% |
| **M2** Originale + 10% Margine | 1015 | 113 | — | 155% | -5.4% | 24% |
| **M3** Originale + 20% Margine | 902 | 225 | — | 136% | -7.8% | 23% |
| **M4** Quota 10 + Commissioni | 127 | 200 | — | 28% | -9.4% | 19% |
| **M5** Quota 10 + 10% Margine | 115 | 213 | — | 26% | -9.7% | 19% |

## Dettaglio per modello

### M1 — Originale Puro

*2%/1.25%, tutto al montepremi, quota 50 crediti*

| Stagione | Montepremi | Ricavo Piatt. | Top Premio | ROI Vincitore | ROI Medio | % > 0 |
|----------|-----------|--------------|-----------|--------------|-----------|-------|
| 2019/20 | 1135 | 0 | 454 | 162% | -5.3% | 25% |
| 2020/21 | 1126 | 0 | 450 | 176% | -1.3% | 26% |
| 2021/22 | 1131 | 0 | 452 | 170% | -1.6% | 25% |
| 2022/23 | 1132 | 0 | 453 | 168% | -6.4% | 24% |
| 2023/24 | 1124 | 0 | 450 | 175% | -2.5% | 25% |
| 2024/25 | 1114 | 0 | 446 | 191% | -1.1% | 25% |

### M2 — Originale + 10% Margine

*2%/1.25%, 10% commissioni alla piattaforma, quota 50 crediti*

| Stagione | Montepremi | Ricavo Piatt. | Top Premio | ROI Vincitore | ROI Medio | % > 0 |
|----------|-----------|--------------|-----------|--------------|-----------|-------|
| 2019/20 | 1022 | 114 | 409 | 145% | -7.5% | 24% |
| 2020/21 | 1014 | 113 | 405 | 157% | -3.7% | 25% |
| 2021/22 | 1018 | 113 | 407 | 151% | -3.9% | 25% |
| 2022/23 | 1019 | 113 | 408 | 149% | -8.7% | 22% |
| 2023/24 | 1012 | 112 | 405 | 156% | -4.9% | 25% |
| 2024/25 | 1003 | 111 | 401 | 170% | -3.7% | 25% |

### M3 — Originale + 20% Margine

*2%/1.25%, 20% commissioni alla piattaforma, quota 50 crediti*

| Stagione | Montepremi | Ricavo Piatt. | Top Premio | ROI Vincitore | ROI Medio | % > 0 |
|----------|-----------|--------------|-----------|--------------|-----------|-------|
| 2019/20 | 908 | 227 | 363 | 127% | -9.7% | 22% |
| 2020/21 | 901 | 225 | 360 | 138% | -6.0% | 24% |
| 2021/22 | 905 | 226 | 362 | 133% | -6.2% | 24% |
| 2022/23 | 906 | 226 | 362 | 131% | -11.0% | 21% |
| 2023/24 | 899 | 225 | 360 | 137% | -7.3% | 23% |
| 2024/25 | 892 | 223 | 357 | 150% | -6.3% | 24% |

### M4 — Quota 10 + Commissioni

*2%/1.25%, tutto al montepremi, quota 10 crediti (100% alla piattaforma)*

| Stagione | Montepremi | Ricavo Piatt. | Top Premio | ROI Vincitore | ROI Medio | % > 0 |
|----------|-----------|--------------|-----------|--------------|-----------|-------|
| 2019/20 | 135 | 200 | 54 | 27% | -11.2% | 17% |
| 2020/21 | 126 | 200 | 50 | 30% | -7.1% | 22% |
| 2021/22 | 131 | 200 | 52 | 29% | -7.4% | 21% |
| 2022/23 | 132 | 200 | 53 | 25% | -13.5% | 15% |
| 2023/24 | 124 | 200 | 50 | 27% | -8.9% | 19% |
| 2024/25 | 114 | 200 | 46 | 31% | -8.3% | 21% |

### M5 — Quota 10 + 10% Margine

*2%/1.25%, 10% commissioni alla piattaforma, quota 10 crediti (100% alla piattaforma)*

| Stagione | Montepremi | Ricavo Piatt. | Top Premio | ROI Vincitore | ROI Medio | % > 0 |
|----------|-----------|--------------|-----------|--------------|-----------|-------|
| 2019/20 | 122 | 214 | 49 | 24% | -11.5% | 17% |
| 2020/21 | 114 | 213 | 45 | 28% | -7.5% | 22% |
| 2021/22 | 118 | 213 | 47 | 26% | -7.7% | 20% |
| 2022/23 | 119 | 213 | 48 | 22% | -13.8% | 14% |
| 2023/24 | 112 | 212 | 45 | 25% | -9.2% | 18% |
| 2024/25 | 103 | 211 | 41 | 28% | -8.6% | 21% |

## Stagione in corso (dati parziali)

> I risultati seguenti si basano su quotazioni parziali della stagione in corso.
> Le stime sono indicative e cambieranno con l'avanzare della stagione.

**2025/26** — ROI trading medio: -8.6%, % positivo: 17%

## Conclusioni

- **ROI di trading medio storico (M1):** -8.2% — questo è il rendimento puro del buy-and-hold sulle quotazioni reali.
- **% di portafogli con ROI positivo:** 25% su tutte le simulazioni/stagioni.
- **ROI vincitore (M5 raccomandato):** 26% in media — il vincitore recupera ampiamente la quota.
- **Ricavo piattaforma (M5):** 213 crediti in media per lega — sostenibilità confermata anche con dati reali.
- Le commissioni 2%/1.25% sono identiche per tutti i modelli: il ROI di trading è una caratteristica
  del mercato Fantacalcio reale, non del regolamento scelto.

---
*Dati generati automaticamente dal motore FantaTrading usando quotazioni reali Fantacalcio.*