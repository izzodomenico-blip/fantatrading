# FantaTrading — Report Master
## Validazione Matematica del Regolamento

*Generato il 11/05/2026, 16:44:09 · Fasi 1–4 completate · 199 test verdi*

---

## 1. Executive Summary

FantaTrading è un gioco di trading fantasy su calciatori Serie A. Questo documento consolida l'analisi matematica completa del modello economico, validando la sostenibilità per l'organizzatore e l'attrattività per i partecipanti.

**Conclusione principale:** il modello è economicamente solido. L'organizzatore genera margine positivo in tutti gli scenari testati (tranne il modello senza margine per design). Il sistema funziona come una lotteria skill-based: pochi vincitori con ROI elevato, maggioranza perde la quota di iscrizione.

### Metriche chiave a N=100 partecipanti (modello bilanciato M2)

| Metrica | Valore |
|---------|--------|
| Montepremi medio | 9248 crediti |
| Ricavo piattaforma | 1028 crediti/stagione |
| Margine organizzatore | 10.0% |
| ROI vincitore | 7298% |
| Break-even partecipanti | 6.0% |
| Sostenibile | ✓ SÌ |

## 2. Configurazione Raccomandata

Basata sull'ottimizzazione congiunta di tutti i parametri nelle Fasi 3–4:

### Parametri di trading

| Parametro | Valore | Fonte |
|-----------|--------|-------|
| Commissione acquisto | 10.0% | Fase 3: grid search bilanciato |
| Commissione vendita | 8.00% | Fase 3: grid search bilanciato |
| Margine piattaforma | 25% | Fase 3: modello M2 sostenibile |
| Mean reversion rate | 0.05 | Fase 4: analisi modello prezzo |
| Budget iniziale | 500 crediti | Default consolidato |
| Giornate stagione | 38 | Serie A standard |
| Valore min calciatore | 1 credito | Default |
| Valore max calciatore | 200 crediti | Default |

### Prize table raccomandata

| Parametro | Valore | Fonte |
|-----------|--------|-------|
| N. premi (N=50) | 10 | Fase 3: prize table optimizer |
| % primo posto | 30% | Fase 3: bilanciato |
| Break-even garantito | 20.0% dei partecipanti | — |
| Ultimo premio copre quota | SÌ | — |
| Gini coefficient | 0.90 | — |

*Nota: la prize table ottimale varia con N. Per leghe più grandi, aumentare i premi proporzionalmente.*

## 3. Analisi Economica per Scala (Fase 2)

| N. Partecipanti | Montepremi | Ricavo Piatt. | Margine % | Premio 1° | ROI Vincitore | Break-even |
|----------------|-----------|--------------|-----------|-----------|---------------|------------|
| 20 | 2058 | 0 | 0.0% | 823 | 1546% | 30.0% |
| 50 | 5133 | 0 | 0.0% | 2053 | 4007% | 12.0% |
| 100 | 10276 | 0 | 0.0% | 4110 | 8120% | 6.0% |
| 250 | 25620 | 0 | 0.0% | 10248 | 20396% | 2.4% |
| 500 | 51213 | 0 | 0.0% | 20485 | 40870% | 1.2% |

**Insight chiave:** il montepremi scala di 24.9× tra N=20 e N=500. Il ricavo organizzatore è linearmente proporzionale a N.

## 4. Confronto Modelli Regolamento (Fase 3)

Cinque modelli confrontati a N=100:

| Modello | Descrizione | Margine % | Break-even | ROI Vincitore | Sostenibile |
|---------|-------------|-----------|------------|---------------|-------------|
| M1 | Originale Puro | 0.0% | 6.0% | 8120% | ✗ |
| M2 ← **REC** | Originale + 10% Margine | 10.0% | 6.0% | 7298% | ✓ |
| M3 | Originale + 20% Margine | 20.0% | 6.0% | 6476% | ✓ |
| M4 | Quota 10 + Commissioni | 15.9% | 6.0% | 21002% | ✓ |
| M5 | Quota 10 + 10% Margine | 24.3% | 6.0% | 18892% | ✓ |

**M1** (puro, 0% margine) non è sostenibile — la piattaforma non incassa nulla. **M2** (+10% margine) è raccomandato: equilibrio tra sostenibilità organizzatore e attrattività per i partecipanti.

> ATTENZIONE: I modelli M1 presentano scenari con ricavo piattaforma ≤ 0.

> MARGINE (N=100): Il modello con margine % più alto è M5 (24.3%); il più basso è M1 (0.0%).

> ATTRATTIVITÀ VINCITORE (N=500): ROI vincitore più alto con M4 (104751%), quota d'iscrizione 10 crediti.

## 5. Analisi di Sensibilità (Fase 3)

Parametri variati one-at-a-time rispetto alla baseline (N=50, buy=2%, sell=1.25%, platform=10%):

| Parametro | Impatto sul Margine (range) | Impatto ROI Vincitore (range) |
|-----------|----------------------------|-------------------------------|
| Commissione Acquisto | 0.0pp | 5590pp |
| Commissione Vendita | 0.0pp | 4918pp |
| Margine Piattaforma | 30.0pp | 1231pp |
| Operazioni/Squadra/Giornata | 0.0pp | 4479pp |
| Numero Partecipanti | 0.0pp | 36261pp |
| Quota Iscrizione | 0.0pp | 92466pp |
| Giornate Stagione | 0.0pp | 2730pp |

- SENSIBILITÀ MARGINE: "Margine Piattaforma" è il parametro con maggiore impatto sul margine organizzatore (range 30.0pp), seguito da "Operazioni/Squadra/Giornata" (0.0pp).
- SENSIBILITÀ ROI VINCITORE: "Quota Iscrizione" ha l'impatto maggiore sul ROI del vincitore (range 92466pp).
- VOLUME OPERAZIONI: Da 0.5 a 8 ops/squadra/giornata il montepremi cresce di 3.1x. Più giocatori attivi = montepremi proporzionalmente più ricco.
- QUOTA ISCRIZIONE: Senza quota la piattaforma si affida solo alle commissioni (margine 10.0%); con quota=200 il ricavo sale a 1263 crediti/stagione (+380%).
- SCALA PARTECIPANTI: Il ricavo organizzatore scala di 49.9x tra N=10 e N=500 — quasi lineare, il modello non presenta economie di scala.
- LUNGHEZZA STAGIONE: Con 10 giornate il montepremi è 2750 crediti; con 60 giornate sale a 6163 (2.2x). Stagioni più lunghe aumentano montepremi e premi.

## 6. Ottimizzazione Commissioni (Fase 3)

Grid search su 150 combinazioni (buy × sell × platform):

| Obiettivo | Buy | Sell | Platform | Margine | Break-even | ROI Vincitore |
|-----------|-----|------|----------|---------|------------|---------------|
| Max Ricavo Org. | 10.0% | 8.00% | 25% | 25.0% | 12.0% | 9564% |
| Max Break-even | 1.0% | 0.50% | 5% | 5.0% | 12.0% | 2746% |
| Max ROI Vincitore | 10.0% | 8.00% | 5% | 5.0% | 12.0% | 12142% |
| Bilanciato ← REC | 10.0% | 8.00% | 25% | 25.0% | 12.0% | 9564% |

- OTTIMALE BILANCIATO: buy=10.0%, sell=8.00%, platform=25% → margine 25.0%, break-even 12.0%, ROI vincitore 9564%.
- MASSIMO RICAVO ORGANIZZATORE: buy=10.0%, sell=8.00%, platform=25% → ricavo 4027 crediti/stagione (margine 25.0%).
- MASSIMO WELFARE PARTECIPANTI: buy=1.0%, sell=0.50%, platform=5% → break-even 12.0% dei partecipanti recupera la quota.

## 7. Ottimizzazione Prize Table (Fase 3)

Analisi su 42 candidati — Pareto frontier (11 soluzioni non dominate):

| Configurazione | N. Premi | Top % | Break-even | ROI Vincitore | Ultimo Premio | Copre Quota |
|----------------|----------|-------|------------|---------------|---------------|-------------|
| Massimo ROI Vincitore | 1 | 30% | 2.0% | 9140% | 4620 cr | ✓ |
| Massimo Break-even | 10 | 30% | 20.0% | 2672% | 63 cr | ✓ |
| Bilanciato ← REC | 10 | 30% | 20.0% | 2672% | 63 cr | ✓ |

**Trade-off fondamentale:** ogni premio aggiunto sposta ~2% di partecipanti verso il break-even ma comprime i singoli premi. Con n=10/top=30%, tutti i 10 vincitori coprono la quota di iscrizione.

## 8. Modello di Prezzo Calciatori (Fase 4)

Confronto random walk vs mean-reverting (`meanReversionRate`):

| Rate | Drift Medio | Std Dev Prezzi | Montepremi | Δ vs RW |
|------|------------|---------------|-----------|---------|
| 0 | 48.9 cr | — | 5250 | baseline |
| 0.02 | 34.3 cr | — | 4940 | -5.9% |
| 0.05 ← **REC** | 22.3 cr | — | 4616 | -12.1% |
| 0.1 | 13.6 cr | — | 4322 | -17.7% |
| 0.15 | 9.8 cr | — | 4162 | -20.7% |
| 0.2 | 7.7 cr | — | 4068 | -22.5% |

**Raccomandazione:** `meanReversionRate = 0.05`

> Riduce il drift prezzi del 54% (da 48.9 a 22.3 crediti) con variazione montepremi di -12.1% — rapporto ottimale realismo/invarianza economica.

**Invarianza economica:** le conclusioni delle Fasi 1-3 restano valide indipendentemente dal modello di prezzo scelto. Il montepremi varia al massimo del ~22% tra il random walk e il modello più aggressivo.

## 9. Conclusioni

### Risposte alle domande fondamentali

**Il modello è sostenibile per l'organizzatore?**
Sì. Con qualsiasi configurazione che includa un `platformFeeRate > 0`, l'organizzatore genera margine positivo proporzionale al numero di partecipanti e al volume di trading. Il margine è strutturalmente fisso e non dipende dalla fortuna delle singole stagioni.

**Il gioco è attrattivo per i partecipanti?**
Dipende dalla prospettiva. La maggioranza (80-90%) perde la quota di iscrizione, rendendolo funzionalmente una lotteria skill-based. I top player hanno ROI estremamente elevato. L'attrattività aumenta con N (più partecipanti = premi più grandi).

**Qual è il parametro più sensibile?**
Il `platformFeeRate` ha l'impatto diretto maggiore sul margine organizzatore. Il volume di operazioni (`operationsPerTeamPerRound`) determina la dimensione del montepremi. La prize table determina la percentuale di vincitori.

### Prossimi passi

1. **Aggiornare DEFAULT_RULES** con i parametri raccomandati (`meanReversionRate=0.05`) e rigenerare i report Fase 2-3 per confronto
2. **Sviluppare UI** per visualizzare i report e configurare scenari in modo interattivo
3. **Alpha test** con utenti reali per validare le ipotesi comportamentali (gli utenti tradano davvero λ=3 ops/round?)
4. **Estendere la prize table** per adattarla dinamicamente a diversi N di partecipanti

---

*Report generato automaticamente dal motore FantaTrading v0.1.0*
*11/05/2026, 16:44:09 · 199 test unitari · 13 suite · Fasi 1-4 complete*
