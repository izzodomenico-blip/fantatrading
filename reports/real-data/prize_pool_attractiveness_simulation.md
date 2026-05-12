# Prize Pool and Economic Attractiveness Simulation

## 1. Executive summary

Modello V1 consigliato: **entry fee 30.00 euro, 80% al montepremi, 20% al sistema, tabella PRIZE_TABLE_TOP_10_PERCENT**.
La simulazione migliore per V1 usa 100 utenti di riferimento, pool netto 2400.00 euro, probabilita premio 10.00%, profitto sistema 1356.68 euro e score 94.56/100.

## 2. Perche il montepremi e fondamentale

Le plusvalenze rendono il gioco tecnico, ma il montepremi rende il gioco percepito come competitivo. Senza premi, il partecipante valuta solo il ROI virtuale; con premi, la classifica crea un obiettivo economico esplicito.

## 3. Trading, premio e ricavo sistema

- Guadagno da trading: variazione netta del valore rosa dopo commissioni.
- Premio da classifica: quota del montepremi assegnata in base alla tabella premi.
- Ricavo sistema: commissioni operative trattenute e quota iscrizione destinata al sistema.

## 4. Esempi pratici con 50 utenti

| Entry fee | Pool 100% premio | Pool 80% premio | Sistema 20% |
|---:|---:|---:|---:|
| 10 euro | 500.00 | 400.00 | 100.00 |
| 20 euro | 1000.00 | 800.00 | 200.00 |
| 50 euro | 2500.00 | 2000.00 | 500.00 |

## 5. Confronto modelli A-F
| Scenario | Utenti | Entry | Split premio | Premi | Pool | Rev sistema | Profitto | Prob win | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| MODEL_A_ENTRY_FEE_100_TO_PRIZE_U50_E20_P100_G0_S0_B2.00_V2.00_T7_PRIZE_TABLE_TOP_5 | 50 | 20.00 | 100% | PRIZE_TABLE_TOP_5 | 1000.00 | 378.34 | 378.34 | 10.00% | 90.16 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U250_E30_P80_G0_S0_B2.00_V2.00_T7_PRIZE_TABLE_TOP_10_PERCENT | 250 | 30.00 | 80% | PRIZE_TABLE_TOP_10_PERCENT | 6000.00 | 3391.70 | 3391.70 | 10.00% | 94.56 |
| MODEL_C_ENTRY_FEE_70_PRIZE_30_SYSTEM_U250_E30_P70_G0_S0_B2.00_V2.00_T7_PRIZE_TABLE_HYBRID | 250 | 30.00 | 70% | PRIZE_TABLE_HYBRID | 5250.00 | 4141.70 | 4141.70 | 16.40% | 92.78 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U100_E0_P0_G2500_S0_B2.00_V2.00_T7_PRIZE_TABLE_TOP_5 | 100 | 0.00 | 0% | PRIZE_TABLE_TOP_5 | 2500.00 | 756.68 | -1743.32 | 5.00% | 47.23 |
| MODEL_E_MIXED_COMMISSION_SPLIT_U100_E20_P80_G0_S0_B2.00_V2.00_T7_PRIZE_TABLE_THRESHOLD_POOL | 100 | 20.00 | 80% | PRIZE_TABLE_THRESHOLD_POOL | 1827.00 | 929.68 | 929.68 | 15.00% | 87.39 |
| MODEL_F_SPONSOR_BOOST_U50_E20_P80_G0_S1000_B2.00_V2.00_T7_PRIZE_TABLE_TOP_5 | 50 | 20.00 | 80% | PRIZE_TABLE_TOP_5 | 1800.00 | 578.34 | 578.34 | 10.00% | 90.26 |

## 6. Confronto distribuzione premi

| Tabella | Score medio | Probabilita media win | Primo premio medio |
|---|---:|---:|---:|
| PRIZE_TABLE_TOP_3 | 80.84 | 4.10% | 4250.76 |
| PRIZE_TABLE_TOP_5 | 80.14 | 6.83% | 3400.61 |
| PRIZE_TABLE_TOP_10_PERCENT | 85.36 | 9.42% | 525.13 |
| PRIZE_TABLE_THRESHOLD_POOL | 82.38 | 14.15% | 226.03 |
| PRIZE_TABLE_HYBRID | 76.73 | 20.98% | 2040.37 |

## 7. Analisi per numero partecipanti

### Pochi utenti 20-50
| Scenario | Utenti | Entry | Split premio | Premi | Pool | Rev sistema | Profitto | Prob win | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T5_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T7_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T10_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T5_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T7_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |

### Community media 100-250
| Scenario | Utenti | Entry | Split premio | Premi | Pool | Rev sistema | Profitto | Prob win | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U100_E50_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_HYBRID | 100 | 50.00 | 80% | PRIZE_TABLE_HYBRID | 4000.00 | 1851.23 | 1851.23 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U100_E100_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_HYBRID | 100 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 8000.00 | 2851.23 | 2851.23 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U250_E100_P80_G0_S0_B1.00_V2.00_T10_PRIZE_TABLE_HYBRID | 250 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 20000.00 | 6418.72 | 6418.72 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U250_E100_P80_G0_S0_B1.50_V2.00_T10_PRIZE_TABLE_HYBRID | 250 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 20000.00 | 6655.21 | 6655.21 | 11.20% | 98.34 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U250_E50_P80_G0_S0_B1.50_V2.00_T10_PRIZE_TABLE_HYBRID | 250 | 50.00 | 80% | PRIZE_TABLE_HYBRID | 10000.00 | 4155.21 | 4155.21 | 11.20% | 98.30 |

### Scala 500-1000
| Scenario | Utenti | Entry | Split premio | Premi | Pool | Rev sistema | Profitto | Prob win | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U500_E50_P80_G0_S0_B1.50_V3.00_T7_PRIZE_TABLE_THRESHOLD_POOL | 500 | 50.00 | 80% | PRIZE_TABLE_THRESHOLD_POOL | 20000.00 | 9256.17 | 9256.17 | 13.00% | 98.17 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U500_E100_P80_G0_S0_B1.50_V3.00_T7_PRIZE_TABLE_THRESHOLD_POOL | 500 | 100.00 | 80% | PRIZE_TABLE_THRESHOLD_POOL | 40000.00 | 14256.17 | 14256.17 | 13.00% | 98.17 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U500_E100_P80_G0_S0_B1.00_V2.00_T10_PRIZE_TABLE_HYBRID | 500 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 40000.00 | 12837.45 | 12837.45 | 11.00% | 98.17 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U1000_E50_P80_G0_S0_B1.50_V3.00_T7_PRIZE_TABLE_THRESHOLD_POOL | 1000 | 50.00 | 80% | PRIZE_TABLE_THRESHOLD_POOL | 40000.00 | 18512.34 | 18512.34 | 13.10% | 98.09 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U1000_E100_P80_G0_S0_B1.50_V3.00_T7_PRIZE_TABLE_THRESHOLD_POOL | 1000 | 100.00 | 80% | PRIZE_TABLE_THRESHOLD_POOL | 80000.00 | 28512.34 | 28512.34 | 13.10% | 98.09 |

## 8. Analisi quota iscrizione

| Entry fee | Score medio | Pool medio | Profitto sistema medio |
|---:|---:|---:|---:|
| 0.00 | 60.44 | 1006.37 | 1263.62 |
| 5.00 | 81.72 | 1737.71 | 2132.28 |
| 10.00 | 82.77 | 3331.23 | 2484.92 |
| 20.00 | 84.16 | 6002.00 | 3014.15 |
| 30.00 | 85.59 | 8672.77 | 3543.38 |
| 50.00 | 87.44 | 14014.31 | 4601.84 |
| 100.00 | 87.69 | 27360.57 | 6909.42 |

## 9. Analisi sostenibilita piattaforma

I modelli con split 80/20 o 70/30 sulla quota iscrizione sono piu sostenibili del 100% premio, perche affiancano alle commissioni trading una fonte stabile di ricavo. I garantiti fissi sono rischiosi sotto 100 utenti se non coperti da sponsor.

## 10. Analisi attrattivita utente

L attrattivita cresce con entry fee e sponsor boost, ma solo finche la probabilita di vincere resta comprensibile. Top 10% e hybrid sono piu adatti a community grandi; top 3/top 5 sono piu chiari per pilot piccoli.

## 11. Analisi VALUE e utenti sopra soglia

La componente VALUE resta da monitorare: il montepremi non deve premiare troppi utenti sopra soglia in modo automatico. Le tabelle top classifica e hybrid mitigano il rischio rispetto a una distribuzione puramente proporzionale a tutti sopra soglia.

## 12. Raccomandazione quota iscrizione

Quota V1 consigliata: **30.00 euro**. Pilot consigliato: **20.00 euro**.

## 13. Raccomandazione split quota iscrizione

Split consigliato: **80% al montepremi / 20% al sistema**.

## 14. Raccomandazione struttura premi

Struttura V1 consigliata: **PRIZE_TABLE_TOP_10_PERCENT**. Pilot: **PRIZE_TABLE_TOP_5**. Scala: **PRIZE_TABLE_TOP_10_PERCENT**.

## 15. Raccomandazione montepremi garantito

Per V1 e pilot: evitare montepremi garantito non coperto. Usare eventualmente sponsor boost esplicito. Il garantito fisso diventa sostenibile solo quando il break-even partecipanti e sotto la dimensione community prevista.

## 16. Proposta regolamento economico aggiornato

- La quota di iscrizione alimenta il montepremi secondo la percentuale indicata.
- Le commissioni di acquisto e vendita sono costi operativi trattenuti dal sistema.
- Il premio finale dipende dalla classifica e dalla tabella premi.
- V1: entry fee 30.00 euro, split 80%/20%, struttura PRIZE_TABLE_TOP_10_PERCENT.

## 17. Limiti dell analisi

- Dati definitivi solo 2023/24 e 2024/25 completed.
- 2025/26 esclusa dalle raccomandazioni definitive.
- Comportamento utenti reale non ancora osservato.
- I premi sono in euro, mentre ROI e commissioni derivano da simulazioni in crediti equivalenti: il confronto e direzionale.
- Le quotazioni intra-stagione restano sintetiche e non ufficiali.

## 18. Prossimi passi

- Definire costo operativo reale minimo della piattaforma.
- Testare pilot 20-50 utenti con entry 10/20 euro.
- Validare disponibilita sponsor boost.
- Ricalibrare tabella premi dopo osservazione comportamento reale.

## Classifiche richieste

### Top 10 assoluto
| Scenario | Utenti | Entry | Split premio | Premi | Pool | Rev sistema | Profitto | Prob win | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U100_E50_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_HYBRID | 100 | 50.00 | 80% | PRIZE_TABLE_HYBRID | 4000.00 | 1851.23 | 1851.23 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U100_E100_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_HYBRID | 100 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 8000.00 | 2851.23 | 2851.23 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U250_E100_P80_G0_S0_B1.00_V2.00_T10_PRIZE_TABLE_HYBRID | 250 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 20000.00 | 6418.72 | 6418.72 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T5_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T7_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T10_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T5_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T7_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E100_P80_G0_S0_B1.50_V2.00_T5_PRIZE_TABLE_TOP_5 | 50 | 100.00 | 80% | PRIZE_TABLE_TOP_5 | 4000.00 | 1331.04 | 1331.04 | 10.00% | 98.35 |

### Top 10 attrattivita utenti
| Scenario | Utenti | Entry | Split premio | Premi | Pool | Rev sistema | Profitto | Prob win | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U100_E50_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_HYBRID | 100 | 50.00 | 80% | PRIZE_TABLE_HYBRID | 4000.00 | 1851.23 | 1851.23 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U100_E100_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_HYBRID | 100 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 8000.00 | 2851.23 | 2851.23 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U250_E100_P80_G0_S0_B1.00_V2.00_T10_PRIZE_TABLE_HYBRID | 250 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 20000.00 | 6418.72 | 6418.72 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T5_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T7_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T10_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T5_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T7_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E100_P80_G0_S0_B1.50_V2.00_T5_PRIZE_TABLE_TOP_5 | 50 | 100.00 | 80% | PRIZE_TABLE_TOP_5 | 4000.00 | 1331.04 | 1331.04 | 10.00% | 98.35 |

### Top 10 sostenibilita sistema
| Scenario | Utenti | Entry | Split premio | Premi | Pool | Rev sistema | Profitto | Prob win | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U100_E50_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_HYBRID | 100 | 50.00 | 80% | PRIZE_TABLE_HYBRID | 4000.00 | 1851.23 | 1851.23 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U100_E100_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_HYBRID | 100 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 8000.00 | 2851.23 | 2851.23 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U250_E100_P80_G0_S0_B1.00_V2.00_T10_PRIZE_TABLE_HYBRID | 250 | 100.00 | 80% | PRIZE_TABLE_HYBRID | 20000.00 | 6418.72 | 6418.72 | 12.00% | 99.00 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T5_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T7_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B2.00_V2.00_T10_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 878.34 | 878.34 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T5_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T7_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E50_P80_G0_S0_B1.50_V3.00_T10_PRIZE_TABLE_TOP_5 | 50 | 50.00 | 80% | PRIZE_TABLE_TOP_5 | 2000.00 | 925.62 | 925.62 | 10.00% | 98.35 |
| MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E100_P80_G0_S0_B1.50_V2.00_T5_PRIZE_TABLE_TOP_5 | 50 | 100.00 | 80% | PRIZE_TABLE_TOP_5 | 4000.00 | 1331.04 | 1331.04 | 10.00% | 98.35 |

### Configurazioni da evitare
| Scenario | Utenti | Entry | Split premio | Premi | Pool | Rev sistema | Profitto | Prob win | Score |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G500_S0_B1.50_V2.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 500.00 | 132.42 | -367.58 | 40.00% | 28.15 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G500_S0_B2.00_V2.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 500.00 | 151.34 | -348.66 | 40.00% | 28.15 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G500_S0_B1.00_V2.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 500.00 | 113.50 | -386.50 | 40.00% | 28.15 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G1000_S0_B1.50_V2.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 1000.00 | 132.42 | -867.58 | 40.00% | 28.15 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G1000_S0_B2.00_V2.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 1000.00 | 151.34 | -848.66 | 40.00% | 28.15 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G1000_S0_B1.50_V3.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 1000.00 | 170.25 | -829.75 | 40.00% | 28.15 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G1000_S0_B1.00_V2.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 1000.00 | 113.50 | -886.50 | 40.00% | 28.15 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G2500_S0_B1.50_V2.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 2500.00 | 132.42 | -2367.58 | 40.00% | 28.15 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G2500_S0_B2.00_V2.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 2500.00 | 151.34 | -2348.66 | 40.00% | 28.15 |
| MODEL_D_GUARANTEED_PRIZE_POOL_U20_E0_P0_G2500_S0_B1.50_V3.00_T7_PRIZE_TABLE_HYBRID | 20 | 0.00 | 0% | PRIZE_TABLE_HYBRID | 2500.00 | 170.25 | -2329.75 | 40.00% | 28.15 |

Modello consigliato V1: **MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U100_E30_P80_G0_S0_B2.00_V2.00_T7_PRIZE_TABLE_TOP_10_PERCENT**.
Modello consigliato pilot: **MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U50_E20_P80_G0_S0_B1.50_V3.00_T5_PRIZE_TABLE_TOP_5**.
Modello consigliato scala: **MODEL_B_ENTRY_FEE_80_PRIZE_20_SYSTEM_U500_E50_P80_G0_S0_B2.00_V2.00_T5_PRIZE_TABLE_TOP_10_PERCENT**.