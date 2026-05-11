# Analisi Storica Quotazioni Fantacalcio

*Generato: 2026-05-11T15:28:59.968Z*
*Stagioni: 2019/20, 2020/21, 2021/22, 2022/23, 2023/24, 2024/25, 2025/26*
*Giocatori-stagione totali: 3818*

## Nota sulle Metriche di Rendimento

Questo report distingue **due metriche di rendimento** con scopi diversi:

### Rendimento Statistico Grezzo (RSG)
Formula classica: `(Qt.A − Qt.I) / Qt.I × 100`

Misura la variazione percentuale della quotazione rispetto al valore iniziale.
Utile per confronti statistici ma **non usata nel gioco FantaTrading**.

Esempi:
- Qt.I 20 → Qt.A 25: RSG = (25−20)/20×100 = **+25%**
- Qt.I 1 → Qt.A 2:   RSG = (2−1)/1×100 = **+100%** ← distorto per quotazioni basse

### Rendimento FantaTrading (RFT)
Formula FantaTrading: `(Qt.A − Qt.I) × 5`

**Ogni variazione di 1 punto quotazione = 5% del valore dell'azione.**
Questo è il rendimento che conta per il gioco FantaTrading.

Esempi:
- Qt.I 34 → Qt.A 35: RFT = (35−34)×5 = **+5%**
- Qt.I 34 → Qt.A 33: RFT = (33−34)×5 = **−5%**
- Qt.I 1  → Qt.A 2:  RFT = (2−1)×5 = **+5%** ← corretto, non +100%
- Qt.I 1  → Qt.A 3:  RFT = (3−1)×5 = **+10%**
- Qt.I 20 → Qt.A 25: RFT = (25−20)×5 = **+25%**

## Sintesi Globale

| Metrica | Statistico Grezzo | FantaTrading |
|---------|-------------------|--------------|
| Rendimento medio storico | 45.4% | 1.8% |
| % giocatori rivalutati (Δ > 0) | 43.3% | 43.3% |
| % giocatori rivalutati > 5% | 43.0% | 34.2% |

## Rendimento Statistico Grezzo per Stagione

| Stagione | Status | N | Rend.Medio | Mediana | % Pos. | % >5% | % <0% |
|----------|--------|---|-----------|---------|--------|-------|-------|
| 2019/20 | completed | 529 | 10.4% | -11.1% | 30.1% | 29.7% | 52.9% |
| 2020/21 | completed | 564 | 37.9% | 0.0% | 42.0% | 41.5% | 39.2% |
| 2021/22 | completed | 550 | 43.2% | 0.0% | 43.5% | 43.1% | 42.5% |
| 2022/23 | completed | 545 | 50.2% | 0.0% | 40.9% | 40.6% | 41.5% |
| 2023/24 | completed | 539 | 59.7% | 0.0% | 48.4% | 48.4% | 36.4% |
| 2024/25 | completed | 560 | 65.6% | 10.0% | 51.2% | 51.1% | 32.5% |
| 2025/26 | in_progress | 531 | 49.4% | 0.0% | 46.7% | 46.1% | 34.8% |

## Rendimento FantaTrading per Stagione

> Formula: (Qt.A − Qt.I) × 5 — ogni punto quotazione = 5%

| Stagione | Status | N | Rend.Medio | Mediana | % Pos. | % >5% | % <0% |
|----------|--------|---|-----------|---------|--------|-------|-------|
| 2019/20 | completed | 529 | -4.0% | -5.0% | 30.1% | 22.9% | 52.9% |
| 2020/21 | completed | 564 | 1.8% | 0.0% | 42.0% | 31.0% | 39.2% |
| 2021/22 | completed | 550 | 2.3% | 0.0% | 43.5% | 34.2% | 42.5% |
| 2022/23 | completed | 545 | 0.6% | 0.0% | 40.9% | 33.2% | 41.5% |
| 2023/24 | completed | 539 | 3.2% | 0.0% | 48.4% | 39.9% | 36.4% |
| 2024/25 | completed | 560 | 5.1% | 5.0% | 51.2% | 41.4% | 32.5% |
| 2025/26 | in_progress | 531 | 3.1% | 0.0% | 46.7% | 36.7% | 34.8% |

## Rendimento Statistico Grezzo per Stagione e per Ruolo

| Stagione | P | D | C | A |
|----------|---|---|---|---|
| 2019/20 | 22.9% | 1.0% | 7.1% | 26.5% |
| 2020/21 | 91.1% | 13.7% | 37.2% | 48.7% |
| 2021/22 | 123.8% | 30.4% | 43.9% | 17.7% |
| 2022/23 | 155.6% | 16.1% | 63.8% | 24.2% |
| 2023/24 | 128.7% | 39.5% | 61.0% | 52.7% |
| 2024/25 | 89.9% | 43.5% | 81.6% | 62.0% |
| 2025/26 | 65.2% | 36.7% | 39.3% | 80.2% |

## Rendimento FantaTrading per Stagione e per Ruolo

| Stagione | P | D | C | A |
|----------|---|---|---|---|
| 2019/20 | -2.5% | -6.6% | -3.4% | -1.0% |
| 2020/21 | 3.0% | -1.6% | 4.0% | 3.9% |
| 2021/22 | 3.9% | 0.5% | 4.1% | 1.5% |
| 2022/23 | 6.1% | -1.3% | 5.6% | -8.3% |
| 2023/24 | 6.8% | 0.6% | 5.8% | 1.2% |
| 2024/25 | 5.5% | 2.9% | 7.9% | 3.8% |
| 2025/26 | 6.1% | 3.3% | 3.2% | 0.5% |

## Rendimento Aggregato per Ruolo (tutte le stagioni)

| Ruolo | N | Grezzo Medio | Grezzo % Pos. | FT Medio | FT % Pos. | Qt.I Media | Qt.A Media |
|-------|---|-------------|--------------|---------|----------|-----------|-----------|
| P | 460 | 96.9% | 36.3% | 4.2% | 36.3% | 4.1 | 4.9 |
| D | 1355 | 25.8% | 40.4% | -0.3% | 40.4% | 5.9 | 5.9 |
| C | 1262 | 48.0% | 48.5% | 3.9% | 48.5% | 7.9 | 8.7 |
| A | 741 | 44.5% | 44.1% | 0.4% | 44.1% | 12.6 | 12.7 |

## Top 20 Rivalutazioni (Rendimento Statistico Grezzo)

> Ordinato per RSG = (Qt.A−Qt.I)/Qt.I×100. Attenzione: valori estremi per quotazioni basse.

| # | Giocatore | R | Club | Stagione | Qt.I | Qt.A | RSG | RFT |
|---|-----------|---|------|----------|------|------|-----|-----|
| 1 | Scamacca | A | Genoa | 2020/21 | 1 | 20 | +1900.0% | +95.0% |
| 2 | Bonazzoli | A | Cremonese | 2025/26 | 1 | 20 | +1900.0% | +95.0% |
| 3 | Ciofani D. | A | Cremonese | 2022/23 | 1 | 19 | +1800.0% | +90.0% |
| 4 | Baldanzi | C | Empoli | 2022/23 | 1 | 17 | +1600.0% | +80.0% |
| 5 | Nicolussi Caviglia | C | Venezia | 2024/25 | 1 | 17 | +1600.0% | +80.0% |
| 6 | Ospina | P | Napoli | 2021/22 | 1 | 16 | +1500.0% | +75.0% |
| 7 | Svilar | P | Roma | 2023/24 | 1 | 16 | +1500.0% | +75.0% |
| 8 | Berisha | P | Torino | 2021/22 | 1 | 14 | +1300.0% | +65.0% |
| 9 | Ekuban | A | Genoa | 2023/24 | 1 | 14 | +1300.0% | +65.0% |
| 10 | Giovane | A | Napoli | 2025/26 | 1 | 14 | +1300.0% | +65.0% |
| 11 | Pobega | C | Spezia | 2020/21 | 1 | 13 | +1200.0% | +60.0% |
| 12 | Piccoli | A | Spezia | 2020/21 | 1 | 13 | +1200.0% | +60.0% |
| 13 | Di Gregorio | P | Monza | 2022/23 | 1 | 13 | +1200.0% | +60.0% |
| 14 | Leali | P | Genoa | 2024/25 | 1 | 13 | +1200.0% | +60.0% |
| 15 | Bruno Peres | D | Roma | 2019/20 | 1 | 12 | +1100.0% | +55.0% |
| 16 | Raspadori | A | Sassuolo | 2019/20 | 1 | 12 | +1100.0% | +55.0% |
| 17 | Milinkovic-Savic V. | P | Torino | 2022/23 | 1 | 12 | +1100.0% | +55.0% |
| 18 | Onana | P | Inter | 2022/23 | 1 | 12 | +1100.0% | +55.0% |
| 19 | Okoye | P | Udinese | 2023/24 | 1 | 12 | +1100.0% | +55.0% |
| 20 | Yildiz | A | Juventus | 2023/24 | 1 | 12 | +1100.0% | +55.0% |

## Top 20 Svalutazioni (Rendimento Statistico Grezzo)

| # | Giocatore | R | Club | Stagione | Qt.I | Qt.A | RSG | RFT |
|---|-----------|---|------|----------|------|------|-----|-----|
| 1 | Pavoletti | A | Cagliari | 2019/20 | 26 | 1 | -96.2% | -125.0% |
| 2 | Destro | A | Genoa | 2019/20 | 19 | 1 | -94.7% | -90.0% |
| 3 | Deulofeu | A | Udinese | 2023/24 | 14 | 1 | -92.9% | -65.0% |
| 4 | Krunic | C | Milan | 2019/20 | 13 | 1 | -92.3% | -60.0% |
| 5 | Milik | A | Juventus | 2024/25 | 12 | 1 | -91.7% | -55.0% |
| 6 | Pogba | C | Juventus | 2023/24 | 12 | 1 | -91.7% | -55.0% |
| 7 | Gomez | C | Monza | 2023/24 | 12 | 1 | -91.7% | -55.0% |
| 8 | Luis Maximiano | P | Lazio | 2022/23 | 12 | 1 | -91.7% | -55.0% |
| 9 | Karamoh | A | Parma | 2019/20 | 12 | 1 | -91.7% | -55.0% |
| 10 | Stengs | C | Pisa | 2025/26 | 11 | 1 | -90.9% | -50.0% |
| 11 | Cragno | P | Monza | 2022/23 | 11 | 1 | -90.9% | -50.0% |
| 12 | Berisha | P | Torino | 2022/23 | 11 | 1 | -90.9% | -50.0% |
| 13 | Strootman | C | Cagliari | 2021/22 | 11 | 1 | -90.9% | -50.0% |
| 14 | Pastore | C | Roma | 2019/20 | 11 | 1 | -90.9% | -50.0% |
| 15 | Gollini | P | Roma | 2024/25 | 10 | 1 | -90.0% | -45.0% |
| 16 | Khedira | C | Juventus | 2019/20 | 10 | 1 | -90.0% | -45.0% |
| 17 | Asamoah | D | Inter | 2019/20 | 10 | 1 | -90.0% | -45.0% |
| 18 | Aboukhlal | A | Torino | 2025/26 | 9 | 1 | -88.9% | -40.0% |
| 19 | Morata | A | Como | 2025/26 | 18 | 2 | -88.9% | -80.0% |
| 20 | Israel | P | Torino | 2025/26 | 9 | 1 | -88.9% | -40.0% |
