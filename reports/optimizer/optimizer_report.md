# FantaTrading — Ottimizzazione Parametri

**Generato il:** 11/05/2026, 22:04:41
**Candidati valutati:** 150 (50 run/candidato, N=50)

## Spazio di ricerca

- Commissione acquisto: 1.0%, 2.0%, 3.0%, 5.0%, 8.0%, 10.0%
- Commissione vendita: 0.50%, 1.25%, 2.00%, 5.00%, 8.00%
- Margine piattaforma: 5%, 10%, 15%, 20%, 25%

## Migliori soluzioni per obiettivo

| Obiettivo | Buy % | Sell % | Platform % | Margine Org. | Break-even | ROI Vincitore | Sostenibile |
|-----------|-------|--------|------------|-------------|------------|---------------|-------------|
| Massimizza Ricavo Organizzatore | 10.0% | 8.00% | 25% | 25.0% | 12.0% | 9564% | SI |
| Massimizza Break-even Partecipanti | 1.0% | 0.50% | 5% | 5.0% | 12.0% | 2746% | SI |
| Massimizza ROI Vincitore | 10.0% | 8.00% | 5% | 5.0% | 12.0% | 12142% | SI |
| Bilanciato (organizzatore + partecipanti) | 10.0% | 8.00% | 25% | 25.0% | 12.0% | 9564% | SI |

## Frontiera di Pareto

*5 soluzioni non dominate sul piano (margine organizzatore %, break-even partecipanti %)*

| Buy % | Sell % | Platform % | Margine Org. | Break-even | Premio 1° | ROI Vincitore |
|-------|--------|------------|-------------|------------|-----------|---------------|
| 10.0% | 8.00% | 25% | 25.0% | 12.0% | 4832 | 9564% |
| 10.0% | 8.00% | 20% | 20.0% | 12.0% | 5154 | 10209% |
| 10.0% | 8.00% | 15% | 15.0% | 12.0% | 5476 | 10853% |
| 10.0% | 8.00% | 10% | 10.0% | 12.0% | 5799 | 11497% |
| 10.0% | 8.00% | 5% | 5.0% | 12.0% | 6121 | 12142% |

## Raccomandazioni

- OTTIMALE BILANCIATO: buy=10.0%, sell=8.00%, platform=25% → margine 25.0%, break-even 12.0%, ROI vincitore 9564%.
- MASSIMO RICAVO ORGANIZZATORE: buy=10.0%, sell=8.00%, platform=25% → ricavo 4027 crediti/stagione (margine 25.0%).
- MASSIMO WELFARE PARTECIPANTI: buy=1.0%, sell=0.50%, platform=5% → break-even 12.0% dei partecipanti recupera la quota.
- FRONTIERA DI PARETO: 5 soluzioni non dominate sul piano (ricavo piattaforma, premio 1° posto). La vera tensione è nel platformFeeRate: alto → più ricavo organizzatore ma premi più piccoli. Le commissioni di trading aumentano entrambi i valori e non creano un trade-off.
- NOTA STRUTTURALE: Il break-even % è costante al 12.0% indipendentemente dalle commissioni. Questo è determinato dalla struttura della prize table (12.0% = n. premi / n. partecipanti), non dai parametri di trading. Per aumentare la % di vincitori bisogna modificare la prize table.
- TRADE-OFF PARETO: le 5 soluzioni non dominate coprono platformFeeRate dal 5% al 25%. La scelta del punto ottimale dipende dalla priorità dell'organizzatore: margine alto vs premi attrattivi per i vincitori.

## Top 10 soluzioni bilanciate

| # | Buy % | Sell % | Platform % | Margine % | Break-even | ROI Vincitore | Pareto |
|---|-------|--------|------------|-----------|------------|---------------|--------|
| 1 | 10.0% | 8.00% | 25% | 25.0% | 12.0% | 9564% | SI |
| 2 | 8.0% | 8.00% | 25% | 25.0% | 12.0% | 8699% |  |
| 3 | 10.0% | 5.00% | 25% | 25.0% | 12.0% | 8385% |  |
| 4 | 8.0% | 5.00% | 25% | 25.0% | 12.0% | 7497% |  |
| 5 | 5.0% | 8.00% | 25% | 25.0% | 12.0% | 7334% |  |
| 6 | 10.0% | 2.00% | 25% | 25.0% | 12.0% | 7172% |  |
| 7 | 10.0% | 1.25% | 25% | 25.0% | 12.0% | 6885% |  |
| 8 | 10.0% | 0.50% | 25% | 25.0% | 12.0% | 6570% |  |
| 9 | 3.0% | 8.00% | 25% | 25.0% | 12.0% | 6384% |  |
| 10 | 8.0% | 2.00% | 25% | 25.0% | 12.0% | 6285% |  |

---
*Grid search — dati generati automaticamente dal motore FantaTrading.*