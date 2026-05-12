# Synthetic Quote Model Improvement Study

Generato: 2026-05-12T08:29:02.884Z

## Avvertenza

Questo e un modello stimato, non ufficiale Fantacalcio. Lo studio non replica e non dichiara di replicare l algoritmo proprietario Fantacalcio. Qt.A finale e usata solo per misurare errore e scegliere parametri dopo la simulazione, mai dentro il calcolo giornaliero dei modelli operativi.

## Confronto modelli

| Modello | Operativo | MAE | RMSE | Mediana | Entro 1 | Entro 2 | Bias | MAE A |
|---------|-----------|-----|------|---------|---------|---------|------|-------|
| BASELINE | si | 2.63 | 3.78 | 2.00 | 44.40% | 62.26% | -1.20 | 4.06 |
| ROLE_SPECIFIC | si | 2.46 | 3.49 | 2.00 | 45.37% | 63.22% | -0.93 | 3.25 |
| QUOTE_BANDS | si | 2.57 | 3.71 | 2.00 | 45.46% | 62.55% | -1.18 | 4.04 |
| APPEARANCE_ADJUSTED | si | 2.55 | 3.63 | 2.00 | 44.69% | 61.58% | -0.90 | 3.73 |
| ATTACKER_TUNED | si | 2.68 | 3.89 | 2.00 | 44.11% | 61.87% | -1.40 | 4.35 |
| ATTACKER_BONUS_SENSITIVE | si | 2.37 | 3.37 | 2.00 | 46.81% | 64.77% | -1.12 | 2.76 |
| ROLE_BONUS_SENSITIVE | si | 2.20 | 3.09 | 2.00 | 48.36% | 66.41% | -0.57 | 2.68 |
| HYBRID_ROLE_QUOTE_APPEARANCE | si | 2.47 | 3.57 | 2.00 | 46.24% | 62.93% | -0.87 | 3.87 |
| HYBRID_ROLE_QUOTE_BONUS | si | 2.21 | 3.09 | 2.00 | 48.17% | 66.41% | -0.86 | 2.92 |
| CONSERVATIVE | si | 3.18 | 4.40 | 2.00 | 36.00% | 53.76% | -1.03 | 4.49 |
| AGGRESSIVE | si | 2.04 | 3.05 | 1.00 | 54.54% | 71.72% | -0.82 | 3.41 |
| ORACLE_FINAL_ANCHOR | no, benchmark teorico | 0.00 | 0.00 | 0.00 | 100.00% | 100.00% | 0.00 | 0.00 |

Modello operativo raccomandato: **AGGRESSIVE**.
Baseline MAE 2.63, modello raccomandato MAE 2.04.

## Cross-validation

| Modello | Train | Validation | MAE train | MAE validation | RMSE validation | Entro 2 validation |
|---------|-------|------------|-----------|----------------|-----------------|--------------------|
| BASELINE | 2023/24 | 2024/25 | 2.64 | 2.61 | 3.80 | 62.98% |
| BASELINE | 2024/25 | 2023/24 | 2.61 | 2.64 | 3.76 | 61.52% |
| ROLE_SPECIFIC | 2023/24 | 2024/25 | 2.48 | 2.44 | 3.50 | 64.31% |
| ROLE_SPECIFIC | 2024/25 | 2023/24 | 2.44 | 2.48 | 3.48 | 62.11% |
| QUOTE_BANDS | 2023/24 | 2024/25 | 2.59 | 2.54 | 3.72 | 62.98% |
| QUOTE_BANDS | 2024/25 | 2023/24 | 2.54 | 2.59 | 3.70 | 62.11% |
| APPEARANCE_ADJUSTED | 2023/24 | 2024/25 | 2.60 | 2.49 | 3.60 | 62.02% |
| APPEARANCE_ADJUSTED | 2024/25 | 2023/24 | 2.49 | 2.60 | 3.65 | 61.13% |
| ATTACKER_TUNED | 2023/24 | 2024/25 | 2.70 | 2.67 | 3.89 | 62.79% |
| ATTACKER_TUNED | 2024/25 | 2023/24 | 2.67 | 2.70 | 3.90 | 60.94% |
| ATTACKER_BONUS_SENSITIVE | 2023/24 | 2024/25 | 2.39 | 2.35 | 3.32 | 65.46% |
| ATTACKER_BONUS_SENSITIVE | 2024/25 | 2023/24 | 2.35 | 2.39 | 3.42 | 64.06% |
| ROLE_BONUS_SENSITIVE | 2023/24 | 2024/25 | 2.22 | 2.17 | 3.07 | 67.56% |
| ROLE_BONUS_SENSITIVE | 2024/25 | 2023/24 | 2.17 | 2.22 | 3.10 | 65.23% |
| HYBRID_ROLE_QUOTE_APPEARANCE | 2023/24 | 2024/25 | 2.52 | 2.43 | 3.55 | 63.36% |
| HYBRID_ROLE_QUOTE_APPEARANCE | 2024/25 | 2023/24 | 2.43 | 2.52 | 3.59 | 62.50% |
| HYBRID_ROLE_QUOTE_BONUS | 2023/24 | 2024/25 | 2.24 | 2.18 | 3.05 | 67.56% |
| HYBRID_ROLE_QUOTE_BONUS | 2024/25 | 2023/24 | 2.18 | 2.24 | 3.13 | 65.23% |
| CONSERVATIVE | 2023/24 | 2024/25 | 3.23 | 3.13 | 4.40 | 54.96% |
| CONSERVATIVE | 2024/25 | 2023/24 | 3.13 | 3.23 | 4.40 | 52.54% |
| AGGRESSIVE | 2023/24 | 2024/25 | 2.07 | 2.01 | 3.03 | 71.76% |
| AGGRESSIVE | 2024/25 | 2023/24 | 2.01 | 2.07 | 3.08 | 71.68% |
| ORACLE_FINAL_ANCHOR | 2023/24 | 2024/25 | 0.00 | 0.00 | 0.00 | 100.00% |
| ORACLE_FINAL_ANCHOR | 2024/25 | 2023/24 | 0.00 | 0.00 | 0.00 | 100.00% |

## Breakdown modello raccomandato

### Per stagione
| Segmento | N | MAE | Mediana | RMSE | Bias | Entro 1 | Entro 2 | Entro 3 |
|----------|---|-----|---------|------|------|---------|---------|---------|
| 2023/24 | 512 | 2.07 | 1.00 | 3.08 | -0.77 | 54.69% | 71.68% | 81.84% |
| 2024/25 | 524 | 2.01 | 1.00 | 3.03 | -0.87 | 54.39% | 71.76% | 83.40% |

### Per ruolo
| Segmento | N | MAE | Mediana | RMSE | Bias | Entro 1 | Entro 2 | Entro 3 |
|----------|---|-----|---------|------|------|---------|---------|---------|
| P | 95 | 2.09 | 1.00 | 3.00 | -0.26 | 51.58% | 65.26% | 77.89% |
| D | 375 | 1.25 | 1.00 | 1.74 | -0.06 | 68.53% | 85.33% | 94.67% |
| C | 362 | 2.07 | 1.00 | 3.06 | -0.98 | 51.93% | 71.82% | 83.98% |
| A | 204 | 3.41 | 3.00 | 4.59 | -2.21 | 34.80% | 49.51% | 60.29% |

### Per fascia quotazione iniziale
| Segmento | N | MAE | Mediana | RMSE | Bias | Entro 1 | Entro 2 | Entro 3 |
|----------|---|-----|---------|------|------|---------|---------|---------|
| 1-5 | 494 | 1.55 | 1.00 | 2.36 | -1.02 | 64.57% | 79.76% | 90.08% |
| 6-10 | 301 | 1.73 | 1.00 | 2.31 | 0.05 | 54.49% | 75.75% | 88.04% |
| 11-20 | 190 | 3.10 | 2.00 | 4.25 | -0.98 | 36.32% | 54.21% | 65.79% |
| 21-35 | 47 | 4.64 | 4.00 | 6.11 | -3.32 | 27.66% | 36.17% | 42.55% |
| 36+ | 4 | 5.00 | 4.00 | 5.83 | -5.00 | 0.00% | 25.00% | 25.00% |

### Per presenze
| Segmento | N | MAE | Mediana | RMSE | Bias | Entro 1 | Entro 2 | Entro 3 |
|----------|---|-----|---------|------|------|---------|---------|---------|
| poche presenze | 238 | 1.39 | 1.00 | 2.39 | -0.04 | 70.59% | 85.71% | 90.76% |
| presenze medie | 316 | 1.96 | 2.00 | 2.56 | -0.54 | 48.73% | 68.67% | 84.49% |
| alta continuita | 482 | 2.42 | 1.00 | 3.60 | -1.39 | 50.41% | 66.80% | 77.39% |

### Per crescita/calo reale
| Segmento | N | MAE | Mediana | RMSE | Bias | Entro 1 | Entro 2 | Entro 3 |
|----------|---|-----|---------|------|------|---------|---------|---------|
| forte crescita | 222 | 4.00 | 3.00 | 5.08 | -3.92 | 22.52% | 36.49% | 54.50% |
| stabile/moderato | 679 | 1.29 | 1.00 | 1.86 | -0.37 | 68.92% | 86.01% | 94.55% |
| forte calo | 135 | 2.62 | 2.00 | 3.43 | 1.99 | 34.81% | 57.78% | 68.89% |

## Perche gli attaccanti sono piu difficili da stimare

| Modello | MAE attaccanti | Bias attaccanti | Miglioramento vs baseline |
|---------|----------------|-----------------|---------------------------|
| BASELINE | 4.06 | -2.25 | 0.00 |
| ATTACKER_TUNED | 4.35 | -3.27 | -0.29 |
| ATTACKER_BONUS_SENSITIVE | 2.76 | -1.88 | 1.30 |
| ROLE_BONUS_SENSITIVE | 2.68 | -0.53 | 1.38 |

Gli attaccanti hanno dinamiche piu legate a eventi discreti: gol, assist, rigori sbagliati, periodi senza bonus e aspettative piu alte per i top player. Un 6 senza bonus puo essere neutro per molti ruoli ma negativo per un attaccante costoso. Il modello puo ancora sbagliare quando il prezzo reale incorpora infortuni, mercato, status da titolare o hype non osservabili nei dati disponibili.

### Attaccanti dove il modello migliora
| Giocatore | Club | Stagione | Errore baseline | Errore miglior modello A | Delta |
|-----------|------|----------|-----------------|--------------------------|-------|
| Retegui | Atalanta | 2024/25 | 19.00 | 9.00 | 10.00 |
| Martinez L. | Inter | 2023/24 | 9.00 | 1.00 | 8.00 |
| Kean | Fiorentina | 2024/25 | 14.00 | 7.00 | 7.00 |
| Lookman | Atalanta | 2024/25 | 9.00 | 3.00 | 6.00 |
| Vlahovic | Juventus | 2023/24 | 6.00 | 0.00 | 6.00 |
| Thuram | Inter | 2023/24 | 8.00 | 2.00 | 6.00 |
| Lukaku | Napoli | 2024/25 | 5.00 | 0.00 | 5.00 |
| Dia | Lazio | 2024/25 | 8.00 | 3.00 | 5.00 |
| Castro S. | Bologna | 2024/25 | 7.00 | 2.00 | 5.00 |
| Adams C. | Torino | 2024/25 | 8.00 | 3.00 | 5.00 |

### Attaccanti dove il modello peggiora
| Giocatore | Club | Stagione | Errore baseline | Errore miglior modello A | Delta |
|-----------|------|----------|-----------------|--------------------------|-------|
| Martinez L. | Inter | 2024/25 | 2.00 | 6.00 | -4.00 |
| Osimhen | Napoli | 2023/24 | 0.00 | 4.00 | -4.00 |
| Lukaku | Roma | 2023/24 | 1.00 | 4.00 | -3.00 |
| Kvaratskhelia | Napoli | 2023/24 | 1.00 | 3.00 | -2.00 |
| Rebic | Lecce | 2024/25 | 0.00 | 1.00 | -1.00 |
| Sanabria | Torino | 2024/25 | 2.00 | 3.00 | -1.00 |
| Simeone | Napoli | 2024/25 | 2.00 | 3.00 | -1.00 |
| Abraham | Milan | 2024/25 | 1.00 | 2.00 | -1.00 |
| Vlahovic | Juventus | 2024/25 | 1.00 | 2.00 | -1.00 |
| Luvumbo | Cagliari | 2024/25 | 0.00 | 1.00 | -1.00 |

## Impatto di gol e assist sulla quotazione stimata

| Ruolo | N | Corr gol-DeltaQt reale | Corr assist-DeltaQt reale | Corr bonus offensivo-DeltaQt reale | Corr bonus recente-DeltaQt reale |
|-------|---|------------------------|----------------------------|------------------------------------|----------------------------------|
| ALL | 1036 | 0.33 | 0.24 | 0.34 | 0.28 |
| P | 95 | 0.00 | -0.20 | -0.20 | 0.00 |
| D | 375 | 0.37 | 0.26 | 0.42 | 0.34 |
| C | 362 | 0.50 | 0.32 | 0.50 | 0.38 |
| A | 204 | 0.34 | 0.21 | 0.33 | 0.26 |

## Migliori 20 stime del modello raccomandato
| # | Giocatore | R | Club | Stagione | Qt.I | QAA stimata | Qt.A reale | Errore |
|---|-----------|---|------|----------|------|-------------|-----------|--------|
| 1 | Grassi | C | Empoli | 2024/25 | 3 | 6 | 6 | 0.00 |
| 2 | Masina | D | Torino | 2024/25 | 6 | 8 | 8 | 0.00 |
| 3 | Zielinski | C | Inter | 2024/25 | 11 | 9 | 9 | 0.00 |
| 4 | Pavoletti | A | Cagliari | 2024/25 | 3 | 6 | 6 | 0.00 |
| 5 | D'Ambrosio | D | Monza | 2024/25 | 3 | 1 | 1 | 0.00 |
| 6 | De Vrij | D | Inter | 2024/25 | 8 | 11 | 11 | 0.00 |
| 7 | Patric | D | Lazio | 2024/25 | 5 | 1 | 1 | 0.00 |
| 8 | Petagna | A | Monza | 2024/25 | 5 | 1 | 1 | 0.00 |
| 9 | Luperto | D | Cagliari | 2024/25 | 8 | 11 | 11 | 0.00 |
| 10 | Goldaniga | D | Como | 2024/25 | 3 | 6 | 6 | 0.00 |
| 11 | Romagnoli | D | Lazio | 2024/25 | 10 | 8 | 8 | 0.00 |
| 12 | Florenzi | D | Milan | 2024/25 | 1 | 1 | 1 | 0.00 |
| 13 | Pellegrini Lo. | C | Roma | 2024/25 | 22 | 11 | 11 | 0.00 |
| 14 | Sansone | A | Lecce | 2024/25 | 1 | 1 | 1 | 0.00 |
| 15 | Padelli | P | Udinese | 2024/25 | 1 | 1 | 1 | 0.00 |
| 16 | Faraoni | D | Verona | 2024/25 | 3 | 1 | 1 | 0.00 |
| 17 | Pezzella Giu. | D | Empoli | 2024/25 | 5 | 10 | 10 | 0.00 |
| 18 | Gagliardini | C | Monza | 2024/25 | 5 | 2 | 2 | 0.00 |
| 19 | Locatelli | C | Juventus | 2024/25 | 8 | 13 | 13 | 0.00 |
| 20 | Pellegri | A | Empoli | 2024/25 | 3 | 4 | 4 | 0.00 |

## Peggiori 20 errori del modello raccomandato
| # | Giocatore | R | Club | Stagione | Qt.I | QAA stimata | Qt.A reale | Errore |
|---|-----------|---|------|----------|------|-------------|-----------|--------|
| 1 | Retegui | A | Atalanta | 2024/25 | 20 | 23 | 40 | 17.00 |
| 2 | Orsolini | C | Bologna | 2024/25 | 21 | 20 | 36 | 16.00 |
| 3 | Kean | A | Fiorentina | 2024/25 | 21 | 21 | 34 | 13.00 |
| 4 | Pedro | A | Lazio | 2024/25 | 3 | 12 | 25 | 13.00 |
| 5 | Scamacca | A | Atalanta | 2024/25 | 28 | 26 | 14 | 12.00 |
| 6 | Dybala | A | Roma | 2023/24 | 30 | 23 | 35 | 12.00 |
| 7 | Scamacca | A | Atalanta | 2023/24 | 25 | 21 | 32 | 11.00 |
| 8 | Calhanoglu | C | Inter | 2023/24 | 16 | 19 | 30 | 11.00 |
| 9 | Pulisic | C | Milan | 2023/24 | 18 | 18 | 29 | 11.00 |
| 10 | Giroud | A | Milan | 2023/24 | 24 | 20 | 31 | 11.00 |
| 11 | Gudmundsson A. | C | Genoa | 2023/24 | 14 | 19 | 30 | 11.00 |
| 12 | McTominay | C | Napoli | 2024/25 | 16 | 20 | 30 | 10.00 |
| 13 | Shomurodov | A | Roma | 2024/25 | 3 | 9 | 19 | 10.00 |
| 14 | Gomez | C | Monza | 2023/24 | 12 | 11 | 1 | 10.00 |
| 15 | Martinez L. | A | Inter | 2023/24 | 37 | 31 | 41 | 10.00 |
| 16 | Gonzalez N. | A | Fiorentina | 2023/24 | 15 | 16 | 26 | 10.00 |
| 17 | Raspadori | A | Napoli | 2024/25 | 11 | 10 | 19 | 9.00 |
| 18 | Lookman | A | Atalanta | 2024/25 | 28 | 24 | 33 | 9.00 |
| 19 | Reijnders | C | Milan | 2024/25 | 12 | 16 | 25 | 9.00 |
| 20 | Pogba | C | Juventus | 2023/24 | 12 | 10 | 1 | 9.00 |

## Target indicativi

- MAE sotto 2.00: non raggiunto.
- RMSE sotto 3.00: non raggiunto.
- Entro 2 punti almeno 70%: raggiunto.
- MAE attaccanti sotto 3.00: raggiunto.

## Raccomandazione finale

1. Miglior modello operativo: **AGGRESSIVE**.
2. Miglior modello per ruolo: P=AGGRESSIVE, D=AGGRESSIVE, C=AGGRESSIVE, A=ROLE_BONUS_SENSITIVE.
3. Conviene usare parametri diversi per attaccanti se migliorano il MAE validation senza peggiorare troppo il bias.
4. I bonus offensivi espliciti sono utili come segnale, ma non eliminano l errore degli attaccanti perche mancano prezzo reale intermedio, minuti, infortuni e status di titolarita.
5. Il trading intra-stagione basato su questo modello deve essere marcato come esplorativo.
6. Servono quotazioni reali giornata per giornata, minuti giocati, rigori segnati/subiti, titolarita, infortuni/squalifiche e data ingresso lista per migliorare ancora.

## Limite recuperi

La logica recuperi complessa non e implementata in questo studio.