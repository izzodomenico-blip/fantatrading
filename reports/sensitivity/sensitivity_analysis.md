# FantaTrading — Analisi di Sensibilità

**Generato il:** 11/05/2026, 22:04:11
**Baseline:** N=50, buy=2.00%, sell=1.250%, platform=10%, ops/round=3, fee=50, rounds=38

## Risultati chiave

- SENSIBILITÀ MARGINE: "Margine Piattaforma" è il parametro con maggiore impatto sul margine organizzatore (range 30.0pp), seguito da "Operazioni/Squadra/Giornata" (0.0pp).
- SENSIBILITÀ ROI VINCITORE: "Quota Iscrizione" ha l'impatto maggiore sul ROI del vincitore (range 92466pp).
- VOLUME OPERAZIONI: Da 0.5 a 8 ops/squadra/giornata il montepremi cresce di 3.1x. Più giocatori attivi = montepremi proporzionalmente più ricco.
- QUOTA ISCRIZIONE: Senza quota la piattaforma si affida solo alle commissioni (margine 10.0%); con quota=200 il ricavo sale a 1263 crediti/stagione (+380%).
- SCALA PARTECIPANTI: Il ricavo organizzatore scala di 49.9x tra N=10 e N=500 — quasi lineare, il modello non presenta economie di scala.
- LUNGHEZZA STAGIONE: Con 10 giornate il montepremi è 2750 crediti; con 60 giornate sale a 6163 (2.2x). Stagioni più lunghe aumentano montepremi e premi.

## Sweep: Commissione Acquisto (%)

*Valore baseline: 0.02*

| Commissione Acquisto | Margine % | Profitto/Part. | Montepremi | Premio 1° | ROI Vincitore | Break-even % | Rischio Piatt. |
|----------------------|-----------|---------------|------------|-----------|---------------|--------------|----------------|
| **0.005** | 10.0% | 7.7 | 3467 | 1387 | 2673% | 12.0% | 0% |
| **0.01** | 10.0% | 8.6 | 3862 | 1545 | 2990% | 12.0% | 0% |
| **0.02** ← baseline | 10.0% | 10.3 | 4616 | 1846 | 3593% | 12.0% | 0% |
| **0.03** | 10.0% | 12.0 | 5381 | 2153 | 4205% | 12.0% | 0% |
| **0.05** | 10.0% | 15.4 | 6909 | 2764 | 5427% | 12.0% | 0% |
| **0.1** | 10.0% | 23.2 | 10454 | 4182 | 8263% | 12.0% | 0% |

## Sweep: Commissione Vendita (%)

*Valore baseline: 0.0125*

| Commissione Vendita | Margine % | Profitto/Part. | Montepremi | Premio 1° | ROI Vincitore | Break-even % | Rischio Piatt. |
|---------------------|-----------|---------------|------------|-----------|---------------|--------------|----------------|
| **0.005** | 10.0% | 9.2 | 4130 | 1652 | 3204% | 12.0% | 0% |
| **0.0075** | 10.0% | 9.6 | 4304 | 1721 | 3343% | 12.0% | 0% |
| **0.0125** ← baseline | 10.0% | 10.3 | 4616 | 1846 | 3593% | 12.0% | 0% |
| **0.02** | 10.0% | 11.4 | 5124 | 2050 | 3999% | 12.0% | 0% |
| **0.05** | 10.0% | 15.7 | 7058 | 2823 | 5547% | 12.0% | 0% |
| **0.1** | 10.0% | 22.8 | 10278 | 4111 | 8122% | 12.0% | 0% |

## Sweep: Margine Piattaforma (%)

*Valore baseline: 0.1*

| Margine Piattaforma | Margine % | Profitto/Part. | Montepremi | Premio 1° | ROI Vincitore | Break-even % | Rischio Piatt. |
|---------------------|-----------|---------------|------------|-----------|---------------|--------------|----------------|
| **0** | 0.0% | 0.0 | 5129 | 2052 | 4003% | 12.0% | 100% |
| **0.05** | 5.0% | 5.1 | 4872 | 1949 | 3798% | 12.0% | 0% |
| **0.1** ← baseline | 10.0% | 10.3 | 4616 | 1846 | 3593% | 12.0% | 0% |
| **0.15** | 15.0% | 15.4 | 4360 | 1744 | 3388% | 12.0% | 0% |
| **0.2** | 20.0% | 20.5 | 4103 | 1641 | 3182% | 12.0% | 0% |
| **0.3** | 30.0% | 30.8 | 3590 | 1436 | 2772% | 12.0% | 0% |

## Sweep: Operazioni/Squadra/Giornata (ops)

*Valore baseline: 3*

| Operazioni/Squadra/Giornata | Margine % | Profitto/Part. | Montepremi | Premio 1° | ROI Vincitore | Break-even % | Rischio Piatt. |
|-----------------------------|-----------|---------------|------------|-----------|---------------|--------------|----------------|
| **0.5** | 10.0% | 5.9 | 2648 | 1059 | 2018% | 12.0% | 0% |
| **1** | 10.0% | 6.8 | 3073 | 1229 | 2358% | 12.0% | 0% |
| **2** | 10.0% | 8.6 | 3868 | 1547 | 2994% | 12.0% | 0% |
| **3** ← baseline | 10.0% | 10.3 | 4616 | 1846 | 3593% | 12.0% | 0% |
| **5** | 10.0% | 13.6 | 6108 | 2443 | 4786% | 12.0% | 0% |
| **8** | 10.0% | 18.3 | 8247 | 3299 | 6497% | 12.0% | 0% |

## Sweep: Numero Partecipanti (N)

*Valore baseline: 50*

| Numero Partecipanti | Margine % | Profitto/Part. | Montepremi | Premio 1° | ROI Vincitore | Break-even % | Rischio Piatt. |
|---------------------|-----------|---------------|------------|-----------|---------------|--------------|----------------|
| **10** | 10.0% | 10.3 | 926 | 370 | 641% | 50.0% | 0% |
| **20** | 10.0% | 10.3 | 1852 | 741 | 1382% | 30.0% | 0% |
| **50** ← baseline | 10.0% | 10.3 | 4616 | 1846 | 3593% | 12.0% | 0% |
| **100** | 10.0% | 10.3 | 9248 | 3699 | 7298% | 6.0% | 0% |
| **250** | 10.0% | 10.3 | 23106 | 9242 | 18385% | 2.4% | 0% |
| **500** | 10.0% | 10.3 | 46253 | 18501 | 36902% | 1.2% | 0% |

## Sweep: Quota Iscrizione (crediti)

*Valore baseline: 50*

| Quota Iscrizione | Margine % | Profitto/Part. | Montepremi | Premio 1° | ROI Vincitore | Break-even % | Rischio Piatt. |
|------------------|-----------|---------------|------------|-----------|---------------|--------------|----------------|
| **0** | 10.0% | 5.3 | 2366 | 946 | 94639% | 100.0% | 0% |
| **10** | 10.0% | 6.3 | 2816 | 1126 | 11164% | 12.0% | 0% |
| **25** | 10.0% | 7.8 | 3491 | 1396 | 5486% | 12.0% | 0% |
| **50** ← baseline | 10.0% | 10.3 | 4616 | 1846 | 3593% | 12.0% | 0% |
| **100** | 10.0% | 15.3 | 6866 | 2746 | 2646% | 12.0% | 0% |
| **200** | 10.0% | 25.3 | 11366 | 4546 | 2173% | 12.0% | 0% |

## Sweep: Giornate Stagione (giornate)

*Valore baseline: 38*

| Giornate Stagione | Margine % | Profitto/Part. | Montepremi | Premio 1° | ROI Vincitore | Break-even % | Rischio Piatt. |
|-------------------|-----------|---------------|------------|-----------|---------------|--------------|----------------|
| **10** | 10.0% | 6.1 | 2750 | 1100 | 2100% | 12.0% | 0% |
| **20** | 10.0% | 7.5 | 3393 | 1357 | 2614% | 12.0% | 0% |
| **30** | 10.0% | 9.0 | 4068 | 1627 | 3154% | 12.0% | 0% |
| **38** ← baseline | 10.0% | 10.3 | 4616 | 1846 | 3593% | 12.0% | 0% |
| **46** | 10.0% | 11.5 | 5188 | 2075 | 4051% | 12.0% | 0% |
| **60** | 10.0% | 13.7 | 6163 | 2465 | 4831% | 12.0% | 0% |

---
*Simulazione Monte Carlo — dati generati automaticamente dal motore FantaTrading.*