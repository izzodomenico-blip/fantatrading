# FantaTrading — Ottimizzazione Prize Table

**Generato il:** 11/05/2026, 22:05:31
**Config:** N=50, quota=50, 80 run/candidato
**Candidati valutati:** 42

## Migliori soluzioni per obiettivo

| Obiettivo | N. Premi | Top % | Break-even % | ROI Vincitore | Premio 1° | Premio Ultimo | Gini |
|-----------|----------|-------|-------------|---------------|-----------|---------------|------|
| Bilanciato | 10 | 30% | 20.0% | 2672% | 1386 | 63 | 0.90 |
| Massimo ROI Vincitore | 1 | 30% | 2.0% | 9140% | 4620 | 4620 | 0.98 |
| Massimo Break-even | 10 | 30% | 20.0% | 2672% | 1386 | 63 | 0.90 |

## Frontiera di Pareto (break-even % vs premio 1°)

| N. Premi | Top % | Distribuzione | Break-even % | ROI Vincitore | Premio 1° | Gini | Copre Quota |
|----------|-------|--------------|-------------|---------------|-----------|------|-------------|
| 10 | 30% | 30%/21%/15%/11%/… | 20.0% | 2672% | 1386 | 0.90 | SI |
| 10 | 40% | 40%/24%/15%/9%/… | 16.0% | 3596% | 1848 | 0.92 | NO |
| 15 | 40% | 40%/24%/14%/9%/… | 16.0% | 3596% | 1848 | 0.92 | NO |
| 8 | 50% | 50%/25%/13%/6%/… | 12.0% | 4520% | 2310 | 0.94 | NO |
| 8 | 60% | 60%/24%/10%/4%/… | 10.0% | 5444% | 2772 | 0.95 | NO |
| 6 | 70% | 70%/21%/6%/2%/… | 8.0% | 6368% | 3234 | 0.96 | NO |
| 1 | 30% | 100% | 2.0% | 9140% | 4620 | 0.98 | SI |
| 1 | 40% | 100% | 2.0% | 9140% | 4620 | 0.98 | SI |
| 1 | 50% | 100% | 2.0% | 9140% | 4620 | 0.98 | SI |
| 1 | 60% | 100% | 2.0% | 9140% | 4620 | 0.98 | SI |
| 1 | 70% | 100% | 2.0% | 9140% | 4620 | 0.98 | SI |

## Analisi per numero di premi (primo posto fisso al 40%)

| N. Premi | Break-even % | ROI Vincitore | Premio 1° | Premio Ultimo | Gini |
|----------|-------------|---------------|-----------|---------------|------|
| 1 | 2.0% | 9140% | 4620 | 4620 | 0.98 |
| 3 | 6.0% | 3596% | 1848 | 1251 | 0.95 |
| 4 | 8.0% | 3596% | 1848 | 611 | 0.94 |
| 5 | 10.0% | 3596% | 1848 | 319 | 0.93 |
| 6 | 12.0% | 3596% | 1848 | 174 | 0.93 |
| 8 | 16.0% | 3596% | 1848 | 56 | 0.92 |
| 10 | 16.0% | 3596% | 1848 | 19 | 0.92 |
| 15 | 16.0% | 3596% | 1848 | 1 | 0.92 |

## Raccomandazioni

- BILANCIATO: n=10 premi, top=30% → break-even 20.0%, ROI vincitore 2672%, Gini 0.90.
- MASSIMO ROI VINCITORE: n=1 premi, top=30% → ROI vincitore 9140%, premio 1° 4620 crediti.
- MASSIMO BREAK-EVEN: n=10 premi, top=30% → 20.0% dei partecipanti recupera la quota, ultimo premio 63 crediti (>= quota).
- FRONTIERA DI PARETO: 11 soluzioni non dominate sul piano (break-even %, premio 1°). Aggiungere premi aumenta la % di vincitori ma riduce la dimensione di ciascun premio.
- OGNI VINCITORE COPRE LA QUOTA: con n=10 premi e top=30%, anche l'ultimo classificato premiato riceve 63 crediti ≥ quota 50.

---
*Grid search — dati generati automaticamente dal motore FantaTrading.*