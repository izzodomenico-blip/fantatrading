# Audit economico e solvibilita: REAL_MONEY_REDEEMABLE_PORTFOLIO_MODEL

Generated: 2026-05-12T20:22:10.433Z

## 1. Executive summary

Questo report analizza una variante nuova rispetto al modello attuale FantaTrading. Il modello attuale resta **FREE_ACCESS_VIRTUAL_CAPITAL**: accesso libero, capitale virtuale, ranking su ROI%, settlement finale virtuale e nessun pagamento reale all'utente. La variante qui testata, **REAL_MONEY_REDEEMABLE_PORTFOLIO_MODEL**, rende il valore finale del portafoglio fisicamente riscuotibile. Questo cambia completamente la natura economica: il sistema non incassa solo commissioni, ma assume anche l'obbligo di pagare agli utenti il valore liquidabile finale.

Risultato principale: il modello riscattabile reale **non va considerato autosufficiente per definizione con sole commissioni**. Le commissioni coprono il sistema solo quando le plusvalenze aggregate degli utenti sono inferiori alle commissioni trattenute. Nei casi in cui strategie come HOLD o VALUE producono ROI positivo, il sistema deve disporre di riserve, coperture, sponsor, limiti di esposizione o un diverso modello economico. Prima di qualunque payout reale servono parere legale, fiscale, regolatorio e un risk framework.

Dataset usati: backtest full-rules, intraseason, variable-capital, settlement concettuale e commission revenue gia presenti in `reports/real-data`. Le raccomandazioni usano solo stagioni completed 2023/24 e 2024/25. Il 2025/26 resta preview e non viene usato come base definitiva.

## 2. Differenza tra settlement virtuale e riscossione reale

Nel settlement virtuale l'utente vede un valore finale e un ROI, ma non nasce un debito monetario del sistema verso l'utente. Il valore resta una metrica di gioco.

Nel modello riscattabile reale il valore finale diventa un'uscita di cassa. Se l'utente ha versato 285 EUR e il portafoglio vale 310 EUR, il sistema deve pagare 310 EUR, non solo il profitto. Il profitto dell'utente e 25 EUR e il ROI e 8.77%, ma il valore riscuotibile resta 310 EUR. Non si applica il ROI una seconda volta.

## 3. Formula utente

```
finalLiquidationValue = netLiquidationValue + cashBalance
profitLoss = finalLiquidationValue - totalCapitalDeposited
roiPct = profitLoss / totalCapitalDeposited * 100
```

Interpretazione: `totalCapitalDeposited` e il capitale reale o convertibile versato dall'utente. `netLiquidationValue` e il valore della rosa liquidata, al netto dell'eventuale commissione finale. `cashBalance` e la liquidita residua. `finalLiquidationValue` e il valore che l'utente puo riscuotere nella variante reale.

## 4. Formula sistema

```
systemCashIn = totalCapitalDeposited + buyCommissions + sellCommissions
systemCashOut = sum(finalLiquidationValue paid to users)
systemNet = systemCashIn - systemCashOut
```

Se `systemNet < 0`, il sistema non e autosufficiente nello scenario simulato. Poiche il capitale depositato rientra nel pagamento finale, il margine economico reale del sistema e dato dalle commissioni meno le plusvalenze nette aggregate degli utenti.

## 5. Analisi solvibilita

| Fee scenario | Righe | SystemNet medio EUR | % neg medio | Reserve ratio medio | Reserve ratio max | Attrattivita | Righe autosuff. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BUY_1_5_SELL_1_5 | 192 | 20911.61 | 25.02% | 1.1151% | 8.2722% | 26.45 | 75% |
| BUY_1_5_SELL_3 | 192 | 25526.14 | 13.54% | 0.3386% | 4.0693% | 20.69 | 87.5% |
| BUY_1_SELL_1 | 192 | 17831.3 | 25.25% | 1.666% | 11.0798% | 30.88 | 75% |
| BUY_2_5_SELL_2_5 | 192 | 27059.39 | 11.05% | 0.1826% | 2.824% | 18.93 | 87.5% |
| BUY_2_SELL_2 | 192 | 23988.49 | 24.27% | 0.5878% | 5.4398% | 22.15 | 75% |
| BUY_2_SELL_3 | 192 | 27056.91 | 11.06% | 0.1821% | 2.7772% | 18.93 | 87.5% |
| BUY_3_SELL_3 | 192 | 30133.87 | 0.29% | 0.0098% | 0.4884% | 16.18 | 100% |

Sintesi: aumentando le fee migliora la solvibilita, ma cala l'attrattivita utente. Il punto critico e che fee piu alte riducono il ROI netto degli utenti, ma non eliminano il rischio di dover pagare utenti vincenti se la performance lorda della rosa supera il prelievo commissionale.

## 6. Scenari capitale

| Distribuzione | SystemNet medio EUR | % neg medio | Reserve ratio medio | Reserve ratio max | Attrattivita |
| --- | --- | --- | --- | --- | --- |
| HIGH | 39051.33 | 15.78% | 0.5674% | 8.7854% | 23.36 |
| LOW | 9763.61 | 15.79% | 0.566% | 8.7308% | 23.36 |
| MEDIUM | 19525.81 | 15.78% | 0.5664% | 8.7803% | 23.35 |
| WHALE | 30235.08 | 15.78% | 0.6327% | 11.0798% | 18.05 |

LOW, MEDIUM e HIGH scalano quasi linearmente. WHALE non e solo uno scenario piu grande: concentra esposizione in pochi utenti e aumenta il rischio di payout elevati verso vincitori singoli.

## 7. Scenari commissioni

Sono stati testati buy/sell 1%/1%, 1.5%/1.5%, 2%/2%, 2.5%/2.5%, 3%/3%, 1.5%/3% e 2%/3%. Nel modello virtuale queste fee possono finanziare operativita o montepremi opzionali. Nel modello reale devono anche assorbire eventuali plusvalenze aggregate degli utenti. Questo rende il break-even molto piu severo.

| Fee scenario | Attrattivita media | Reserve ratio medio | Autosuff. media |
| --- | --- | --- | --- |
| BUY_1_SELL_1 | 30.88 | 1.666% | 75% |
| BUY_1_5_SELL_1_5 | 26.45 | 1.1151% | 75% |
| BUY_2_SELL_2 | 22.15 | 0.5878% | 75% |
| BUY_1_5_SELL_3 | 20.69 | 0.3386% | 87.5% |
| BUY_2_5_SELL_2_5 | 18.93 | 0.1826% | 87.5% |
| BUY_2_SELL_3 | 18.93 | 0.1821% | 87.5% |
| BUY_3_SELL_3 | 16.18 | 0.0098% | 100% |

## 8. Rischio whale

| Utenti | Fee | Strategia | SystemNet EUR | Reserve p95 EUR | Reserve ratio | Whale x MEDIUM |
| --- | --- | --- | --- | --- | --- | --- |
| 100 | BUY_1_SELL_1 | HOLD | -2146.15 | 2793.26 | 5.9778% | 1.1491 |
| 100 | BUY_1_SELL_1 | VALUE | -3056.98 | 4019.19 | 8.6421% | 1.1502 |
| 100 | BUY_1_SELL_1 | BALANCED | 2949.83 | 0 | 0% | n/a |
| 100 | BUY_1_SELL_1 | LOW_COST | 1137.22 | 0 | 0% | n/a |
| 100 | BUY_1_SELL_1 | TOP_PLAYER | 6320.96 | 0 | 0% | n/a |
| 100 | BUY_1_SELL_1 | VALUE_ROTATION | 13205.74 | 0 | 0% | n/a |
| 100 | BUY_1_SELL_1 | MOMENTUM | 28663.57 | 0 | 0% | n/a |
| 100 | BUY_1_SELL_1 | HYBRID_VALUE_MOMENTUM | 7532.27 | 0 | 0% | n/a |
| 100 | BUY_1_5_SELL_1_5 | HOLD | -1203.22 | 1635.84 | 3.5185% | 1.1138 |
| 100 | BUY_1_5_SELL_1_5 | VALUE | -2116.92 | 2849.86 | 6.1486% | 1.1255 |
| 100 | BUY_1_5_SELL_1_5 | BALANCED | 3879.71 | 0 | 0% | n/a |
| 100 | BUY_1_5_SELL_1_5 | LOW_COST | 2062.77 | 0 | 0% | n/a |
| 100 | BUY_1_5_SELL_1_5 | TOP_PLAYER | 7279.19 | 0 | 0% | n/a |
| 100 | BUY_1_5_SELL_1_5 | VALUE_ROTATION | 15041.77 | 0 | 0% | n/a |
| 100 | BUY_1_5_SELL_1_5 | MOMENTUM | 30492.68 | 0 | 0% | n/a |
| 100 | BUY_1_5_SELL_1_5 | HYBRID_VALUE_MOMENTUM | 8706.52 | 0 | 0% | n/a |

Il rischio whale e soprattutto un rischio di concentrazione. Anche se il sistema e positivo in media, un utente ad alto capitale con ROI positivo crea un'uscita di cassa assoluta molto piu grande. Per un modello reale servono limiti di capitale massimo per utente, limiti di esposizione per singolo giocatore e monitoraggio concentrazione.

## 9. Rischio VALUE

La strategia VALUE nei completed dataset resta la piu favorevole tra le strategie statiche considerate. Premium medio stimato rispetto a BALANCED: **12.93 punti percentuali ROI**.

| Utenti | Distrib. | Fee | ROI utente medio | SystemNet EUR | Reserve p95 EUR | Reserve ratio |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | WHALE | BUY_1_SELL_1 | 8.5617% | -612.55 | 1034.87 | 11.0798% |
| 50 | WHALE | BUY_1_SELL_1 | 8.5666% | -1527.63 | 2207.08 | 9.4848% |
| 20 | HIGH | BUY_1_SELL_1 | 8.5959% | -790.24 | 1052.64 | 8.7854% |
| 20 | MEDIUM | BUY_1_SELL_1 | 8.5937% | -396 | 527.27 | 8.7803% |
| 20 | LOW | BUY_1_SELL_1 | 8.5872% | -197.67 | 261.93 | 8.7308% |
| 100 | WHALE | BUY_1_SELL_1 | 8.5722% | -3056.98 | 4019.19 | 8.6421% |
| 20 | WHALE | BUY_1_5_SELL_1_5 | 7.55% | -420.92 | 764.25 | 8.2722% |
| 50 | MEDIUM | BUY_1_SELL_1 | 8.5614% | -984.6 | 1193.23 | 7.9517% |

Se una strategia replicabile produce vantaggio strutturale, il modello reale trasferisce valore dal sistema agli utenti informati. Nel modello virtuale e un tema di bilanciamento competitivo; nel modello reale diventa rischio finanziario.

## 10. Capitale di garanzia necessario

La riserva tecnica consigliata in questa simulazione e il p95 del fabbisogno di riserva, cioe il capitale necessario per coprire il 95% degli esiti simulati per ogni combinazione.

| Utenti | Distrib. | Fee | Strategia | Capitale EUR | Reserve p95 EUR | Reserve ratio | % systemNet<0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | WHALE | BUY_1_SELL_1 | VALUE | 9340.11 | 1034.87 | 11.0798% | 100% |
| 50 | WHALE | BUY_1_SELL_1 | VALUE | 23269.76 | 2207.08 | 9.4848% | 100% |
| 20 | HIGH | BUY_1_SELL_1 | VALUE | 11981.71 | 1052.64 | 8.7854% | 100% |
| 20 | MEDIUM | BUY_1_SELL_1 | VALUE | 6005.09 | 527.27 | 8.7803% | 100% |
| 20 | LOW | BUY_1_SELL_1 | VALUE | 3000.1 | 261.93 | 8.7308% | 100% |
| 100 | WHALE | BUY_1_SELL_1 | VALUE | 46506.92 | 4019.19 | 8.6421% | 100% |
| 20 | WHALE | BUY_1_5_SELL_1_5 | VALUE | 9238.82 | 764.25 | 8.2722% | 99.98% |
| 50 | MEDIUM | BUY_1_SELL_1 | VALUE | 15006.02 | 1193.23 | 7.9517% | 100% |
| 50 | HIGH | BUY_1_SELL_1 | VALUE | 29981.8 | 2375.89 | 7.9244% | 100% |
| 50 | LOW | BUY_1_SELL_1 | VALUE | 7507.85 | 594.16 | 7.9139% | 100% |

Per una variante reale non basta stimare il costo operativo. Serve una riserva separata dalle commissioni operative, calibrata su volatilita, concentrazione capitale e strategie vincenti.

## 11. Autosufficienza con sole commissioni

Nel modello reale la domanda corretta non e solo "le commissioni coprono i costi operativi?". La domanda e: "le commissioni coprono anche le plusvalenze aggregate pagate agli utenti?".

Righe simulate: **1344**. Righe con systemNet medio negativo: **16.07%**. Righe con almeno qualche scenario negativo: **21.58%**. Reserve ratio medio consigliato: **0.5831%**. Reserve ratio massimo osservato: **11.0798%**.

Conclusione: le sole commissioni possono risultare sufficienti in scenari sfavorevoli agli utenti o con fee alte, ma non costituiscono una garanzia robusta. Il modello non va trattato come autosufficiente senza riserve e limiti.

## 12. Fee necessarie e attrattivita utente

La fee minima per pareggio e stata stimata come fee simmetrica per lato necessaria ad assorbire il rendimento lordo medio della strategia. La fee di sicurezza aggiunge un buffer legato alla volatilita e alla numerosita utenti.

| Strategia | SystemNet medio EUR | % neg medio | Reserve ratio medio | Attrattivita | Autosuff. righe |
| --- | --- | --- | --- | --- | --- |
| BALANCED | 13067.13 | 0% | 0% | 26.8 | 100% |
| HOLD | -196.37 | 43.62% | 1.4323% | 48.26 | 57.14% |
| HYBRID_VALUE_MOMENTUM | 26398.34 | 0% | 0% | 4.47 | 100% |
| LOW_COST | 8317.31 | 0.3% | 0.0156% | 35.4 | 100% |
| MOMENTUM | 85474.43 | 0% | 0% | 0 | 100% |
| TOP_PLAYER | 21860.38 | 0% | 0% | 11.02 | 100% |
| VALUE | -2595.49 | 82.32% | 3.2172% | 50.3 | 14.29% |
| VALUE_ROTATION | 44825.94 | 0% | 0% | 0 | 100% |

Fee alte rendono piu sicuro il sistema, ma possono rendere il prodotto poco attrattivo per utenti esperti, soprattutto se il rendimento atteso netto si avvicina a zero o diventa negativo. Per questo una soluzione solo-fee tende a entrare in tensione con l'esperienza utente.

## 13. Fondo e riserve

Serve un fondo/riserve se il valore finale e riscattabile. Il fondo deve essere separato dalla contabilita operativa e dimensionato su:

- p95 o p99 del fabbisogno di riserva;
- concentrazione whale;
- strategie replicabili ad alto ROI;
- esposizione per singolo giocatore;
- stagioni anomale;
- tempi di liquidazione e contestazioni.

Senza fondo, un cluster di utenti vincenti puo rendere negativo il systemNet anche se le fee sembrano sufficienti in media.

## 14. Limite capitale massimo per utente

Per il modello reale serve limitare il capitale massimo per utente. In assenza di budget massimo, un utente whale puo aumentare linearmente il debito potenziale del sistema. Il ranking ROI% resta equo a livello competitivo, ma non limita l'esposizione assoluta di cassa.

Raccomandazione prudenziale: introdurre cap per utente, soglie KYC/AML se applicabili, limiti di deposito per fase e stress test prima di ogni aumento cap.

## 15. Limite esposizione per singolo giocatore

Serve anche limitare l'esposizione aggregata del sistema verso singoli giocatori. Se molti utenti concentrano capitale sugli stessi asset e quell'asset cresce, il payout diventa correlato. Nel modello virtuale questa correlazione impatta la classifica; nel modello reale impatta la solvibilita.

Contromisure possibili: position limit per utente, exposure cap globale per giocatore, quote dinamiche, haircut di liquidazione, fondi segregati o coperture esterne. Queste misure richiedono design legale e tecnico dedicato.

## 16. Raccomandazione finale

Raccomandazione: **procedere con il modello virtuale come modello base**. La variante reale e riscattabile va trattata come prodotto nuovo, non come piccola estensione del settlement virtuale.

Percorso consigliato:

1. Mantenere FREE_ACCESS_VIRTUAL_CAPITAL come modello principale.
2. Valutare un modello ibrido solo con limiti forti, payout non automatici, fondo dedicato e parere legale/fiscale.
3. Procedere con reale riscattabile solo dopo analisi legale, fiscale, regolatoria, AML/KYC, risk policy, contabilita segregata e stress test cash-ledger.
4. Non implementare payout reali in questa fase.

Decisione sintetica: **non procedere con payout reale immediato**. Procedere eventualmente con modello ibrido controllato dopo parere legale e risk framework; in assenza di questi presidi, restare virtuale.

## Appendice A. Ipotesi e limiti della simulazione

- La simulazione usa rendimenti aggregati storici gia presenti nei report, non ricostruisce un ledger reale transazione per transazione.
- HOLD, VALUE_ROTATION, MOMENTUM e HYBRID_VALUE_MOMENTUM derivano dal backtest intraseason con quotazioni sintetiche.
- VALUE, BALANCED, LOW_COST e TOP_PLAYER derivano da historical strategy/full-rules completed seasons.
- Le commissioni sono stimate come buy + sell + turnover addizionale per strategie attive.
- La formula di sistema segue esattamente l'ipotesi richiesta: capitale depositato piu commissioni in entrata, finalLiquidationValue pagato in uscita.
- Il 2025/26 resta separato e non e usato per raccomandazioni definitive.

## Appendice B. File sorgente usati

- historicalFullRules: `reports/real-data/historical_full_rules_backtest.json`
- intraseasonTrading: `reports/real-data/intraseason_trading_backtest.json`
- commissionRevenue: `reports/real-data/commission_revenue_model_simulation.json`
- fullRulesStress: `reports/real-data/full_rules_stress_test.json`
- historicalStrategy: `reports/real-data/historical_strategy_backtest.json`
- variableCapitalAudit: `reports/real-data/variable_capital_trading_model_audit.md`

