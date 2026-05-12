# Synthetic Quote Deep Optimization Study

## Executive summary

Questo e un modello stimato, non ufficiale Fantacalcio. Qt.A finale non e usata nel calcolo giornaliero operativo: serve solo per valutazione e calibrazione dopo la simulazione. ORACLE_FINAL_ANCHOR e solo benchmark teorico non utilizzabile live.

Miglior modello robusto e raccomandato: **ROLE_BONUS_SENSITIVE**. Miglior errore puro: **ROBUST_MODEL**. Miglior modello attaccanti: **ROLE_BONUS_SENSITIVE**.

## Precedente vs nuovo migliore

| Modello | MAE | RMSE | Entro 2 | MAE attaccanti |
|---------|-----|------|---------|----------------|
| Precedente AGGRESSIVE | 2.04 | 3.05 | 71.72% | 2.68 |
| Nuovo raccomandato ROLE_BONUS_SENSITIVE | 1.46 | 2.05 | 82.34% | 1.67 |
| Miglior errore puro ROBUST_MODEL | 1.45 | 2.07 | 83.01% | 1.86 |

## Tabella modelli

| Modello | Operativo | Score | MAE | RMSE | Mediana | Entro 1 | Entro 2 | Entro 3 | Bias | Instabilita | MAE A |
|---------|-----------|-------|-----|------|---------|---------|---------|---------|------|-------------|-------|
| AGGRESSIVE | si | 0.26 | 1.77 | 2.49 | 1.00 | 53.47% | 75.68% | 87.84% | 0.09 | 0.16 | 2.24 |
| ROLE_BONUS_SENSITIVE | si | -0.10 | 1.46 | 2.05 | 1.00 | 62.16% | 82.34% | 92.47% | -0.13 | 0.10 | 1.67 |
| HYBRID_AGGRESSIVE_ATTACKER_BONUS | si | 0.14 | 1.66 | 2.35 | 1.00 | 56.18% | 78.28% | 88.13% | 0.14 | 0.20 | 1.90 |
| ROLE_SPECIFIC_OPTIMIZED | si | 0.15 | 1.67 | 2.30 | 1.00 | 55.12% | 76.74% | 89.48% | 0.18 | 0.16 | 1.79 |
| QUOTE_BAND_OPTIMIZED | si | 0.29 | 1.80 | 2.51 | 1.00 | 53.86% | 75.10% | 86.78% | -0.08 | 0.23 | 2.29 |
| ROLE_AND_QUOTE_BAND_OPTIMIZED | si | 0.10 | 1.64 | 2.35 | 1.00 | 58.40% | 79.83% | 88.90% | -0.03 | 0.11 | 1.99 |
| BONUS_FEATURE_OPTIMIZED | si | 0.02 | 1.56 | 2.19 | 1.00 | 58.98% | 81.08% | 90.83% | 0.23 | 0.15 | 1.97 |
| ENSEMBLE_AVERAGE | si | 0.42 | 1.86 | 2.68 | 1.00 | 55.21% | 73.07% | 85.42% | -0.45 | 0.05 | 2.63 |
| ENSEMBLE_ROLE_WEIGHTED | si | 0.40 | 1.84 | 2.66 | 1.00 | 55.98% | 73.07% | 85.33% | -0.41 | 0.07 | 2.57 |
| ROBUST_MODEL | si | -0.09 | 1.45 | 2.07 | 1.00 | 62.93% | 83.01% | 92.47% | -0.26 | 0.03 | 1.86 |
| ORACLE_FINAL_ANCHOR | no | -1.50 | 0.00 | 0.00 | 0.00 | 100.00% | 100.00% | 100.00% | 0.00 | 0.00 | 0.00 |

Score usato: MAE*0.40 + RMSE*0.25 - entro2punti*0.015 + |bias|*0.10 + instabilita*0.10 + outlier>5*0.01. Lo score penalizza outlier, bias e instabilita tra fold.

## Tabella modelli per ruolo

| Modello | P MAE | D MAE | C MAE | A MAE |
|---------|-------|-------|-------|-------|
| AGGRESSIVE | 2.15 | 1.37 | 1.83 | 2.24 |
| ROLE_BONUS_SENSITIVE | 2.04 | 1.15 | 1.52 | 1.67 |
| HYBRID_AGGRESSIVE_ATTACKER_BONUS | 2.06 | 1.32 | 1.77 | 1.90 |
| ROLE_SPECIFIC_OPTIMIZED | 2.13 | 1.47 | 1.70 | 1.79 |
| QUOTE_BAND_OPTIMIZED | 2.14 | 1.36 | 1.87 | 2.29 |
| ROLE_AND_QUOTE_BAND_OPTIMIZED | 2.08 | 1.20 | 1.77 | 1.99 |
| BONUS_FEATURE_OPTIMIZED | 2.14 | 1.22 | 1.52 | 1.97 |
| ENSEMBLE_AVERAGE | 2.09 | 1.28 | 1.97 | 2.63 |
| ENSEMBLE_ROLE_WEIGHTED | 2.09 | 1.25 | 1.98 | 2.57 |
| ROBUST_MODEL | 2.06 | 1.08 | 1.45 | 1.86 |
| ORACLE_FINAL_ANCHOR | 0.00 | 0.00 | 0.00 | 0.00 |

## Tabella modelli per fascia prezzo

| Cluster | N | MAE | RMSE | Mediana | Bias | Entro 1 | Entro 2 | Entro 3 |
|---------|---|-----|------|---------|------|---------|---------|---------|
| 1-5 | 494 | 1.33 | 1.94 | 1.00 | -0.77 | 67.61% | 85.43% | 93.12% |
| 6-10 | 301 | 1.36 | 1.78 | 1.00 | 0.45 | 63.79% | 84.72% | 94.35% |
| 11-20 | 190 | 1.81 | 2.41 | 1.00 | 0.53 | 51.58% | 74.74% | 88.95% |
| 21-35 | 47 | 2.11 | 2.95 | 2.00 | 0.23 | 42.55% | 65.96% | 87.23% |
| 36+ | 4 | 2.25 | 2.29 | 2.00 | 1.25 | 0.00% | 75.00% | 100.00% |

## Error analysis modello raccomandato

### Per stagione
| Cluster | N | MAE | RMSE | Mediana | Bias | Entro 1 | Entro 2 | Entro 3 |
|---------|---|-----|------|---------|------|---------|---------|---------|
| 2023/24 | 512 | 1.51 | 2.10 | 1.00 | -0.03 | 59.96% | 82.23% | 91.99% |
| 2024/25 | 524 | 1.41 | 2.00 | 1.00 | -0.22 | 64.31% | 82.44% | 92.94% |

### Per ruolo
| Cluster | N | MAE | RMSE | Mediana | Bias | Entro 1 | Entro 2 | Entro 3 |
|---------|---|-----|------|---------|------|---------|---------|---------|
| P | 95 | 2.04 | 2.89 | 1.00 | -0.32 | 51.58% | 67.37% | 78.95% |
| D | 375 | 1.15 | 1.55 | 1.00 | -0.02 | 70.67% | 89.33% | 97.07% |
| C | 362 | 1.52 | 2.09 | 1.00 | -0.23 | 60.22% | 81.77% | 93.09% |
| A | 204 | 1.67 | 2.30 | 1.00 | -0.05 | 54.90% | 77.45% | 89.22% |

### Per crescita/calo
| Cluster | N | MAE | RMSE | Mediana | Bias | Entro 1 | Entro 2 | Entro 3 |
|---------|---|-----|------|---------|------|---------|---------|---------|
| forte crescita | 222 | 2.22 | 2.90 | 2.00 | -1.88 | 40.54% | 64.41% | 80.18% |
| stabile | 679 | 1.06 | 1.41 | 1.00 | 0.01 | 74.37% | 92.05% | 98.82% |
| forte calo | 135 | 2.25 | 2.89 | 2.00 | 2.06 | 36.30% | 62.96% | 80.74% |

### Per presenze
| Cluster | N | MAE | RMSE | Mediana | Bias | Entro 1 | Entro 2 | Entro 3 |
|---------|---|-----|------|---------|------|---------|---------|---------|
| poche presenze | 238 | 1.25 | 2.11 | 1.00 | -0.35 | 74.37% | 87.82% | 91.60% |
| presenze medie | 316 | 1.62 | 2.11 | 1.00 | -0.19 | 56.33% | 76.90% | 91.14% |
| alta continuita | 482 | 1.46 | 1.97 | 1.00 | 0.03 | 59.96% | 83.20% | 93.78% |

## Analisi profonda attaccanti

Il miglior modello attaccanti e **ROLE_BONUS_SENSITIVE** con MAE 1.67. Gli attaccanti restano il cluster piu delicato perche gol, assist e dry spell spostano le aspettative piu rapidamente del voto medio. I top player senza bonus tendono a essere sovrastimati; i low-cost in breakout tendono a essere sottostimati se i bonus arrivano concentrati.

## Analisi bonus gol/assist

Lo studio usa gol, assist, bonus offensivi recenti last5/last10 e dry spell solo come feature operative derivate dai voti gia disponibili. Non usa rigori segnati o minuti se non presenti nei dati importati.

## Analisi outlier

### Top 30 peggiori errori
| Stagione | Id | Nome | R | Squadra | QI | Qt.A | QAA | Err | Pres | FM | G | A | Causa |
|----------|----|------|---|---------|----|------|-----|-----|------|----|---|---|-------|
| 2024/25 | 2137 | Scamacca | A | Atalanta | 28 | 14 | 24 | 10.00 | 1 | 6.00 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2024/25 | 2167 | Orsolini | C | Bologna | 21 | 36 | 27 | 9.00 | 30 | 6.52 | 12 | 4 | sottostima probabile: bonus offensivi/breakout forti |
| 2023/24 | 2194 | Calhanoglu | C | Inter | 16 | 30 | 21 | 9.00 | 32 | 6.47 | 3 | 3 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2489 | Pedro | A | Lazio | 3 | 25 | 17 | 8.00 | 30 | 6.20 | 8 | 1 | sottostima probabile: bonus offensivi/breakout forti |
| 2024/25 | 6482 | Mandas | P | Lazio | 1 | 12 | 4 | 8.00 | 9 | 6.28 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 26 | Gomez | C | Monza | 12 | 1 | 9 | 8.00 | 2 | 6.25 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2023/24 | 303 | Pogba | C | Juventus | 12 | 1 | 9 | 8.00 | 2 | 6.00 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2023/24 | 2722 | Ravaglia F. | P | Bologna | 1 | 9 | 1 | 8.00 | 6 | 6.33 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2024/25 | 5116 | Martinez Jo. | P | Inter | 2 | 8 | 1 | 7.00 | 5 | 6.30 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2024/25 | 6024 | Sulemana I. | C | Atalanta | 2 | 9 | 2 | 7.00 | 9 | 6.11 | 2 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 1958 | Caprari | A | Monza | 14 | 2 | 9 | 7.00 | 6 | 5.92 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2023/24 | 4364 | Gaetano | C | Cagliari | 3 | 16 | 9 | 7.00 | 20 | 6.10 | 4 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 5841 | Svilar | P | Roma | 1 | 16 | 9 | 7.00 | 15 | 6.47 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 6120 | Ochoa | P | Salernitana | 9 | 4 | 11 | 7.00 | 21 | 6.31 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2023/24 | 6482 | Mandas | P | Lazio | 1 | 11 | 4 | 7.00 | 9 | 6.22 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2024/25 | 2815 | Terracciano | P | Fiorentina | 11 | 2 | 8 | 6.00 | 3 | 6.17 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2024/25 | 5311 | Shomurodov | A | Roma | 3 | 19 | 13 | 6.00 | 27 | 6.07 | 4 | 2 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 309 | Dybala | A | Roma | 30 | 35 | 29 | 6.00 | 28 | 6.46 | 6 | 9 | sottostima probabile: bonus offensivi/breakout forti |
| 2023/24 | 4433 | Zortea | D | Frosinone | 3 | 16 | 10 | 6.00 | 19 | 6.16 | 2 | 5 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 5529 | Henry | A | Verona | 12 | 5 | 11 | 6.00 | 18 | 6.00 | 3 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 2475 | Sanchez | A | Udinese | 16 | 3 | 8 | 5.00 | 13 | 5.88 | 0 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 2741 | Pessina | C | Monza | 12 | 2 | 7 | 5.00 | 11 | 6.09 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 4360 | Caprile | P | Cagliari | 2 | 14 | 9 | 5.00 | 22 | 6.21 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 4463 | Esposito Se. | A | Empoli | 3 | 21 | 16 | 5.00 | 33 | 6.17 | 7 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 4662 | Weah | C | Juventus | 5 | 18 | 13 | 5.00 | 30 | 6.12 | 5 | 1 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 4892 | Saelemaekers | C | Roma | 5 | 22 | 17 | 5.00 | 23 | 6.37 | 7 | 3 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 4957 | Montipo' | P | Verona | 7 | 8 | 13 | 5.00 | 36 | 6.19 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 5564 | Ndoye | C | Bologna | 10 | 26 | 21 | 5.00 | 30 | 6.45 | 6 | 4 | pattern non spiegato dai soli dati disponibili |
| 2023/24 | 509 | Consigli | P | Sassuolo | 5 | 7 | 12 | 5.00 | 35 | 6.14 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2023/24 | 761 | Audero | P | Inter | 1 | 6 | 1 | 5.00 | 4 | 6.00 | 0 | 0 | pattern non spiegato dai soli dati disponibili |

### Top 30 migliori stime
| Stagione | Id | Nome | R | Squadra | QI | Qt.A | QAA | Err | Pres | FM | G | A | Causa |
|----------|----|------|---|---------|----|------|-----|-----|------|----|---|---|-------|
| 2024/25 | 22 | De Roon | C | Atalanta | 8 | 16 | 16 | 0.00 | 36 | 6.15 | 4 | 4 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 152 | Zielinski | C | Inter | 11 | 9 | 9 | 0.00 | 26 | 5.98 | 0 | 1 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 236 | Lazovic | C | Verona | 10 | 9 | 9 | 0.00 | 27 | 5.94 | 1 | 3 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 253 | D'Ambrosio | D | Monza | 3 | 1 | 1 | 0.00 | 20 | 5.65 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 322 | De Vrij | D | Inter | 8 | 11 | 11 | 0.00 | 26 | 6.15 | 3 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 327 | Patric | D | Lazio | 5 | 1 | 1 | 0.00 | 10 | 5.70 | 1 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 383 | Petagna | A | Monza | 5 | 1 | 1 | 0.00 | 13 | 5.65 | 0 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 393 | Luperto | D | Cagliari | 8 | 11 | 11 | 0.00 | 36 | 6.00 | 1 | 2 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 440 | Viola | C | Cagliari | 6 | 9 | 9 | 0.00 | 27 | 5.94 | 3 | 1 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 460 | Romagnoli | D | Lazio | 10 | 8 | 8 | 0.00 | 32 | 5.84 | 2 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 464 | Florenzi | D | Milan | 1 | 1 | 1 | 0.00 | 1 | 6.00 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 530 | Pellegrini Lo. | C | Roma | 22 | 11 | 11 | 0.00 | 25 | 5.68 | 1 | 1 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 537 | Sansone | A | Lecce | 1 | 1 | 1 | 0.00 | 5 | 6.10 | 0 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 543 | Padelli | P | Udinese | 1 | 1 | 1 | 0.00 | 1 | 6.50 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 581 | Faraoni | D | Verona | 3 | 1 | 1 | 0.00 | 8 | 5.75 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 632 | Zaccagni | C | Lazio | 27 | 23 | 23 | 0.00 | 34 | 6.28 | 6 | 6 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 695 | Toloi | D | Atalanta | 4 | 3 | 3 | 0.00 | 11 | 5.96 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 697 | Cuadrado | D | Atalanta | 4 | 8 | 8 | 0.00 | 23 | 6.07 | 0 | 2 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 779 | Cristante | C | Roma | 9 | 15 | 15 | 0.00 | 30 | 6.18 | 4 | 3 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 1870 | Barella | C | Inter | 20 | 19 | 19 | 0.00 | 33 | 6.26 | 3 | 6 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 1871 | Deiola | C | Cagliari | 4 | 8 | 8 | 0.00 | 29 | 5.98 | 2 | 1 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2155 | Cutrone | A | Como | 9 | 17 | 17 | 0.00 | 33 | 6.01 | 7 | 4 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 2161 | Haas | C | Empoli | 2 | 2 | 2 | 0.00 | 10 | 6.05 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2211 | Silvestri | P | Empoli | 1 | 1 | 1 | 0.00 | 5 | 5.70 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2285 | Bani | D | Genoa | 7 | 5 | 5 | 0.00 | 20 | 5.92 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2296 | Mancini | D | Roma | 10 | 14 | 14 | 0.00 | 37 | 6.18 | 2 | 1 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2325 | Karamoh | A | Torino | 1 | 6 | 6 | 0.00 | 29 | 5.93 | 0 | 1 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 2428 | Sommer | P | Inter | 18 | 15 | 15 | 0.00 | 33 | 6.18 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2515 | Walker | D | Milan | 10 | 8 | 8 | 0.00 | 11 | 5.96 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2521 | De Gea | P | Fiorentina | 11 | 16 | 16 | 0.00 | 35 | 6.34 | 0 | 0 | pattern non spiegato dai soli dati disponibili |

### Top 20 sovrastime
| Stagione | Id | Nome | R | Squadra | QI | Qt.A | QAA | Err | Pres | FM | G | A | Causa |
|----------|----|------|---|---------|----|------|-----|-----|------|----|---|---|-------|
| 2024/25 | 2137 | Scamacca | A | Atalanta | 28 | 14 | 24 | 10.00 | 1 | 6.00 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2023/24 | 26 | Gomez | C | Monza | 12 | 1 | 9 | 8.00 | 2 | 6.25 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2023/24 | 303 | Pogba | C | Juventus | 12 | 1 | 9 | 8.00 | 2 | 6.00 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2023/24 | 1958 | Caprari | A | Monza | 14 | 2 | 9 | 7.00 | 6 | 5.92 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2023/24 | 6120 | Ochoa | P | Salernitana | 9 | 4 | 11 | 7.00 | 21 | 6.31 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2815 | Terracciano | P | Fiorentina | 11 | 2 | 8 | 6.00 | 3 | 6.17 | 0 | 0 | sovrastima probabile: poche presenze/infortunio |
| 2023/24 | 5529 | Henry | A | Verona | 12 | 5 | 11 | 6.00 | 18 | 6.00 | 3 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 2475 | Sanchez | A | Udinese | 16 | 3 | 8 | 5.00 | 13 | 5.88 | 0 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 2741 | Pessina | C | Monza | 12 | 2 | 7 | 5.00 | 11 | 6.09 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 4957 | Montipo' | P | Verona | 7 | 8 | 13 | 5.00 | 36 | 6.19 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2023/24 | 509 | Consigli | P | Sassuolo | 5 | 7 | 12 | 5.00 | 35 | 6.14 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2023/24 | 4867 | Turati | P | Frosinone | 5 | 7 | 12 | 5.00 | 31 | 6.19 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2023/24 | 5949 | Lindstrom | C | Napoli | 15 | 3 | 8 | 5.00 | 22 | 5.93 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2023/24 | 6205 | Mulattieri | A | Sassuolo | 11 | 2 | 7 | 5.00 | 27 | 5.94 | 0 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 608 | Zapata D. | A | Torino | 25 | 13 | 17 | 4.00 | 7 | 6.57 | 3 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 2134 | Falcone | P | Lecce | 9 | 11 | 15 | 4.00 | 38 | 6.26 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2406 | Hummels | D | Roma | 8 | 3 | 7 | 4.00 | 14 | 6.11 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2640 | Kolasinac | D | Atalanta | 9 | 6 | 10 | 4.00 | 23 | 6.13 | 0 | 2 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2724 | Buongiorno | D | Napoli | 16 | 11 | 15 | 4.00 | 22 | 6.36 | 1 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2766 | Zaniolo | C | Fiorentina | 13 | 7 | 11 | 4.00 | 23 | 6.02 | 2 | 1 | pattern non spiegato dai soli dati disponibili |

### Top 20 sottostime
| Stagione | Id | Nome | R | Squadra | QI | Qt.A | QAA | Err | Pres | FM | G | A | Causa |
|----------|----|------|---|---------|----|------|-----|-----|------|----|---|---|-------|
| 2024/25 | 2167 | Orsolini | C | Bologna | 21 | 36 | 27 | 9.00 | 30 | 6.52 | 12 | 4 | sottostima probabile: bonus offensivi/breakout forti |
| 2023/24 | 2194 | Calhanoglu | C | Inter | 16 | 30 | 21 | 9.00 | 32 | 6.47 | 3 | 3 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 2489 | Pedro | A | Lazio | 3 | 25 | 17 | 8.00 | 30 | 6.20 | 8 | 1 | sottostima probabile: bonus offensivi/breakout forti |
| 2024/25 | 6482 | Mandas | P | Lazio | 1 | 12 | 4 | 8.00 | 9 | 6.28 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 2722 | Ravaglia F. | P | Bologna | 1 | 9 | 1 | 8.00 | 6 | 6.33 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2024/25 | 5116 | Martinez Jo. | P | Inter | 2 | 8 | 1 | 7.00 | 5 | 6.30 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2024/25 | 6024 | Sulemana I. | C | Atalanta | 2 | 9 | 2 | 7.00 | 9 | 6.11 | 2 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 4364 | Gaetano | C | Cagliari | 3 | 16 | 9 | 7.00 | 20 | 6.10 | 4 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 5841 | Svilar | P | Roma | 1 | 16 | 9 | 7.00 | 15 | 6.47 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 6482 | Mandas | P | Lazio | 1 | 11 | 4 | 7.00 | 9 | 6.22 | 0 | 0 | sottostima probabile: low-cost cresciuto rapidamente |
| 2024/25 | 5311 | Shomurodov | A | Roma | 3 | 19 | 13 | 6.00 | 27 | 6.07 | 4 | 2 | sottostima probabile: low-cost cresciuto rapidamente |
| 2023/24 | 309 | Dybala | A | Roma | 30 | 35 | 29 | 6.00 | 28 | 6.46 | 6 | 9 | sottostima probabile: bonus offensivi/breakout forti |
| 2023/24 | 4433 | Zortea | D | Frosinone | 3 | 16 | 10 | 6.00 | 19 | 6.16 | 2 | 5 | sottostima probabile: low-cost cresciuto rapidamente |
| 2024/25 | 4360 | Caprile | P | Cagliari | 2 | 14 | 9 | 5.00 | 22 | 6.21 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 4463 | Esposito Se. | A | Empoli | 3 | 21 | 16 | 5.00 | 33 | 6.17 | 7 | 0 | attaccante: prezzo molto sensibile a bonus e aspettative |
| 2024/25 | 4662 | Weah | C | Juventus | 5 | 18 | 13 | 5.00 | 30 | 6.12 | 5 | 1 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 4892 | Saelemaekers | C | Roma | 5 | 22 | 17 | 5.00 | 23 | 6.37 | 7 | 3 | pattern non spiegato dai soli dati disponibili |
| 2024/25 | 5564 | Ndoye | C | Bologna | 10 | 26 | 21 | 5.00 | 30 | 6.45 | 6 | 4 | pattern non spiegato dai soli dati disponibili |
| 2023/24 | 761 | Audero | P | Inter | 1 | 6 | 1 | 5.00 | 4 | 6.00 | 0 | 0 | pattern non spiegato dai soli dati disponibili |
| 2023/24 | 5734 | Soule' | A | Frosinone | 4 | 24 | 19 | 5.00 | 36 | 6.29 | 6 | 2 | attaccante: prezzo molto sensibile a bonus e aspettative |

## Rischio overfitting

Instabilita del modello raccomandato tra fold: 0.10 punti MAE. 2025/26 resta solo preview in_progress e non entra nella raccomandazione definitiva.
Preview 2025/26 con ROLE_BONUS_SENSITIVE: MAE 1.38, RMSE 1.93, entro2 83.10%.

## Target

- MAE totale < 2.00: raggiunto.
- RMSE < 3.00: raggiunto.
- Entro 2 punti >= 75%: raggiunto.
- MAE attaccanti < 2.50: raggiunto.

## Modello operativo raccomandato

Raccomandazione: **ROLE_BONUS_SENSITIVE**. Il backtest intra-stagione deve restare esplorativo: l errore e migliorato, ma mancano quotazioni ufficiali giornata per giornata e molte feature operative reali.

## Prossimi dati necessari

- quotazioni reali giornata per giornata;
- minuti giocati;
- rigori segnati/subiti;
- titolarita;
- infortuni/squalifiche;
- data ingresso lista.