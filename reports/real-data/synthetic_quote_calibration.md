# Calibrazione Modello Sintetico Quotazioni

Generato: 2026-05-12T08:06:17.204Z

## Avvertenza

Il modello e sintetico e non ufficiale Fantacalcio. Non inventa quotazioni reali giornata per giornata: genera stime coerenti con la logica descritta e le calibra sui soli valori reali Qt.I e Qt.A.

## Dati usati

- Stagioni completed per calibrazione: 2023/24, 2024/25
- Stagioni in_progress generate separatamente: 2025/26
- Candidati parametrici testati: 324

## Miglior configurazione

peso ultima prestazione=0.46, peso fantamedia=0.38, peso presenza=0.45, velocita adeguamento=0.56, forza rendimento atteso=1.25, penalita assenza=-0.05

| Metrica | Valore |
|---------|--------|
| Giocatori matched completed | 1036 |
| Errore assoluto medio | 2.63 punti quota |
| Errore assoluto mediano | 2.00 punti quota |
| RMSE | 3.78 punti quota |
| Errore medio firmato | -1.20 punti quota |
| Stime esatte | 17.95% |
| Entro 1 punto | 44.40% |
| Entro 2 punti | 62.26% |

## Distribuzione errori

| Errore assoluto | Record | % |
|-----------------|--------|---|
| 0 | 186 | 17.95% |
| 0-1 | 274 | 26.45% |
| 1-2 | 185 | 17.86% |
| 2-5 | 259 | 25.00% |
| >5 | 132 | 12.74% |

## Difficolta per ruolo

| Ruolo | N | MAE | Mediana | RMSE | Bias |
|-------|---|-----|---------|------|------|
| A | 204 | 4.06 | 3.00 | 5.37 | -2.25 |
| C | 362 | 2.87 | 2.00 | 4.06 | -1.51 |
| P | 95 | 2.27 | 1.00 | 3.25 | -0.69 |
| D | 375 | 1.70 | 1.00 | 2.29 | -0.44 |

I ruoli con MAE piu alto sono i piu difficili da stimare con soli Qt.I, Qt.A, voti e presenze.

## Top 20 migliori stime

| # | Giocatore | R | Club | Stagione | Qt.I | QAA stimata | Qt.A reale | Errore |
|---|-----------|---|------|----------|------|-------------|-----------|--------|
| 1 | Adzic | C | Juventus | 2024/25 | 1 | 1 | 1 | 0.00 |
| 2 | Alberto Costa | D | Juventus | 2024/25 | 5 | 5 | 5 | 0.00 |
| 3 | Ankeye | A | Genoa | 2023/24 | 2 | 1 | 1 | 0.00 |
| 4 | Aouar | C | Roma | 2023/24 | 15 | 10 | 10 | 0.00 |
| 5 | Bagnolini | P | Bologna | 2023/24 | 1 | 1 | 1 | 0.00 |
| 6 | Balogh | D | Parma | 2024/25 | 1 | 4 | 4 | 0.00 |
| 7 | Bani | D | Genoa | 2024/25 | 7 | 5 | 5 | 0.00 |
| 8 | Barrenechea | C | Frosinone | 2023/24 | 2 | 5 | 5 | 0.00 |
| 9 | Basic | C | Salernitana | 2023/24 | 4 | 2 | 2 | 0.00 |
| 10 | Bastoni | D | Inter | 2023/24 | 13 | 14 | 14 | 0.00 |
| 11 | Bastoni S. | D | Empoli | 2023/24 | 8 | 5 | 5 | 0.00 |
| 12 | Belahyane | C | Lazio | 2024/25 | 1 | 3 | 3 | 0.00 |
| 13 | Bellanova | D | Atalanta | 2024/25 | 13 | 12 | 12 | 0.00 |
| 14 | Bettella | D | Monza | 2023/24 | 1 | 1 | 1 | 0.00 |
| 15 | Beukema | D | Bologna | 2023/24 | 6 | 8 | 8 | 0.00 |
| 16 | Beukema | D | Bologna | 2024/25 | 7 | 8 | 8 | 0.00 |
| 17 | Biraghi | D | Fiorentina | 2023/24 | 10 | 9 | 9 | 0.00 |
| 18 | Birindelli | D | Monza | 2023/24 | 5 | 8 | 8 | 0.00 |
| 19 | Blin | C | Lecce | 2023/24 | 6 | 6 | 6 | 0.00 |
| 20 | Bohinen | C | Genoa | 2023/24 | 4 | 3 | 3 | 0.00 |

## Top 20 peggiori stime

| # | Giocatore | R | Club | Stagione | Qt.I | QAA stimata | Qt.A reale | Errore |
|---|-----------|---|------|----------|------|-------------|-----------|--------|
| 1 | Retegui | A | Atalanta | 2024/25 | 20 | 21 | 40 | 19.00 |
| 2 | Pedro | A | Lazio | 2024/25 | 3 | 7 | 25 | 18.00 |
| 3 | Orsolini | C | Bologna | 2024/25 | 21 | 20 | 36 | 16.00 |
| 4 | De Ketelaere | C | Atalanta | 2023/24 | 7 | 12 | 26 | 14.00 |
| 5 | Kean | A | Fiorentina | 2024/25 | 21 | 20 | 34 | 14.00 |
| 6 | Esposito Se. | A | Empoli | 2024/25 | 3 | 8 | 21 | 13.00 |
| 7 | Saelemaekers | C | Roma | 2024/25 | 5 | 9 | 22 | 13.00 |
| 8 | Scamacca | A | Atalanta | 2024/25 | 28 | 27 | 14 | 13.00 |
| 9 | Shomurodov | A | Roma | 2024/25 | 3 | 6 | 19 | 13.00 |
| 10 | Soule' | A | Frosinone | 2023/24 | 4 | 11 | 24 | 13.00 |
| 11 | Calhanoglu | C | Inter | 2023/24 | 16 | 18 | 30 | 12.00 |
| 12 | Gudmundsson A. | C | Genoa | 2023/24 | 14 | 18 | 30 | 12.00 |
| 13 | Ndoye | C | Bologna | 2024/25 | 10 | 14 | 26 | 12.00 |
| 14 | Dominguez B. | A | Bologna | 2024/25 | 5 | 8 | 19 | 11.00 |
| 15 | Dybala | A | Roma | 2023/24 | 30 | 24 | 35 | 11.00 |
| 16 | Fabbian | C | Bologna | 2023/24 | 5 | 8 | 19 | 11.00 |
| 17 | Gaetano | C | Cagliari | 2023/24 | 3 | 5 | 16 | 11.00 |
| 18 | Gonzalez N. | A | Fiorentina | 2023/24 | 15 | 15 | 26 | 11.00 |
| 19 | McTominay | C | Napoli | 2024/25 | 16 | 19 | 30 | 11.00 |
| 20 | Pulisic | C | Milan | 2023/24 | 18 | 18 | 29 | 11.00 |

## Rischi per trading intra-stagione

- La traiettoria giornaliera e stimata, non osservata.
- Errori piccoli a fine stagione non garantiscono prezzi intermedi corretti.
- Il modello puo sottostimare effetti di mercato non presenti nei voti, come hype, infortuni lunghi, trasferimenti e cambio titolarita.
- I recuperi non sono modellati in modo complesso.
- Va usato per scenari e sensibilita, non per dichiarare prezzi ufficiali.