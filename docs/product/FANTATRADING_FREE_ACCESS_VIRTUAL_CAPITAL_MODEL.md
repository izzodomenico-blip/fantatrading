# FantaTrading - FREE_ACCESS_VIRTUAL_CAPITAL_TRADING_MODEL

**Versione:** 1.1
**Data:** 2026-05-12
**Stato:** modello target del pilot virtuale

## 1. Obiettivo

Il modello FREE_ACCESS_VIRTUAL_CAPITAL_TRADING_MODEL (FAVC) riallinea FantaTrading a un pilot gratuito:

- accesso libero, senza quota obbligatoria;
- nessun denaro reale e nessun pagamento;
- capitale virtuale variabile per utente;
- nessun budget fisso uniforme;
- rosa da 25 giocatori, valida 3P/8D/8C/6A, costruibile con qualsiasi valore complessivo;
- cambi liberi;
- classifica principale su ROI%;
- commissioni di acquisto e vendita trattenute dal sistema.

## 2. Differenza dal modello a quota iscrizione

| Dimensione | Modello quota iscrizione | Modello FAVC virtuale |
|---|---|---|
| Accesso | Quota obbligatoria | Libero |
| Budget iniziale | Fisso e uguale per tutti | Nessun budget assegnato |
| Capitale | Uniforme | Variabile, cresce con gli acquisti |
| Ranking | Ricchezza assoluta | ROI percentuale |
| Cash residuo | Budget residuo | Deposito/cash virtuale |
| Commissioni | Sistema o montepremi secondo split | Sistema |
| Denaro reale | Possibile nel modello con quota | Non usato nel pilot |

Nel modello a quota iscrizione la ricchezza assoluta e' confrontabile perche' tutti partono dallo stesso budget. Nel FAVC sarebbe iniqua: una rosa da 1.000 crediti ha piu' base assoluta di una rosa da 150. Per questo il ranking ufficiale e' il ROI%.

## 3. Capitale virtuale variabile

Ogni team parte con:

```text
totalCapitalDeposited = 0
virtualCashBalance = 0
```

Quando compra un giocatore, il sistema usa prima il cash virtuale disponibile. Se non basta, aggiunge automaticamente solo il deficit al capitale virtuale depositato.

```text
capitalToAdd = max(0, totalCost - virtualCashBalance)
totalCapitalDeposited += capitalToAdd
virtualCashBalance = virtualCashBalance + capitalToAdd - totalCost
```

Non esiste budget massimo. Il costo di una rosa piu' cara aumenta il denominatore del ROI, quindi non crea vantaggio competitivo automatico.

## 4. Deposito portafoglio virtuale

`virtualCashBalance` e' il deposito/cash virtuale non investito:

- capitale non ancora speso;
- proventi netti delle vendite;
- differenze positive dopo vendita e riacquisto di giocatori meno costosi.

Non va confuso con `totalCapitalDeposited`: vendere un giocatore aumenta il cash, ma non aumenta il capitale versato.

## 5. Formula ROI ufficiale

```text
ROI% =
(
  netLiquidationValue
  + virtualCashBalance
  - totalCapitalDeposited
)
/
totalCapitalDeposited
* 100
```

Dove:

- `netLiquidationValue` e' il valore netto liquidabile della rosa, dopo commissione vendita;
- `virtualCashBalance` e' il cash virtuale disponibile;
- `totalCapitalDeposited` e' la somma dei depositi virtuali richiesti dagli acquisti.

Esempi:

```text
150 -> 180 = (180 - 150) / 150 * 100 = +20%
600 -> 660 = (660 - 600) / 600 * 100 = +10%
```

Il team 150 -> 180 batte il team 600 -> 660 nel ranking principale, anche se il secondo ha ricchezza assoluta maggiore.

## 5a. Liquidazione finale virtuale del portafoglio

A fine stagione il partecipante chiude virtualmente il valore finale del proprio portafoglio. Questa liquidazione finale non e' un pagamento reale e non e' una riscossione fisica: e' una chiusura contabile virtuale del pilot, usata per calcolare rendimento e classifica.

Il modello attuale usa lo scenario A: la liquidazione finale applica la commissione di vendita alle posizioni ancora attive. Questa scelta e' coerente con il comportamento gia' usato dal riepilogo portafoglio, dove `netLiquidationValue` rappresenta il valore incassabile vendendo virtualmente tutta la rosa.

```text
activePositionsValue = valore lordo delle posizioni attive
finalSellCommissionAmount = activePositionsValue * sellCommissionRate
netLiquidationValue = activePositionsValue - finalSellCommissionAmount

finalLiquidationValue =
  netLiquidationValue
  + virtualCashBalance

profitLoss =
  finalLiquidationValue
  - totalCapitalDeposited

roiPct =
  profitLoss
  / totalCapitalDeposited
  * 100
```

Regola anti doppio conteggio:

```text
totalCapitalDeposited = 285
finalLiquidationValue = 310
profitLoss = 310 - 285 = 25
roiPct = 25 / 285 * 100 = 8.77%
```

Il valore liquidabile virtuale resta 310. Non va aumentato di nuovo dell'8.77%, perche' il ROI e' solo una misura percentuale del rendimento gia' contenuto nei 310.

Scenario alternativo documentato ma non attivo di default:

- scenario A, attuale: liquidazione finale con sell fee;
- scenario B, possibile variante futura: liquidazione finale senza sell fee.

Se in futuro si decide di usare lo scenario B, il backend deve impostare `applyFinalSellCommission = false` e `finalSellCommissionAmount = 0`, senza cambiare la formula di ROI.

## 6. Market logic

Acquisto:

```text
grossBuy = playerValue
buyCommission = grossBuy * buyCommissionRate
totalCost = grossBuy + buyCommission
```

Vendita:

```text
grossSell = sellValue
sellCommission = grossSell * sellCommissionRate
netProceeds = grossSell - sellCommission
virtualCashBalance += netProceeds
```

Regole operative:

- ogni acquisto genera commissione;
- ogni vendita genera commissione;
- le commissioni sono trattenute dal sistema;
- non sono ammessi duplicati attivi dello stesso giocatore;
- la rosa attiva deve rispettare 3P/8D/8C/6A;
- i cambi sono liberi, ma economicamente costosi per via delle commissioni.

## 7. Perche' il pilot non usa denaro reale

Il pilot usa solo crediti virtuali per evitare gestione di denaro di terzi, pagamenti, payout e rischi regolatori. Questo consente di validare prima:

- engagement;
- frequenza cambi;
- distribuzione dei ROI;
- sostenibilita' delle commissioni;
- qualita' della classifica ROI%.

Nessuna parte del pilot richiede gateway di pagamento, wallet reale o premi monetari.

## 7a. Riscossione reale: non inclusa nel pilot

Il modello base attuale e':

- accesso libero;
- capitale virtuale;
- settlement finale virtuale;
- nessun pagamento reale;
- nessuna riscossione fisica nel pilot.

Il report `reports/real-data/real_money_redeemable_portfolio_audit.md` ha analizzato una variante diversa, `REAL_MONEY_REDEEMABLE_PORTFOLIO_MODEL`, in cui il valore finale del portafoglio potrebbe essere pagato fisicamente all'utente.

Quella variante cambia la natura economica del prodotto. Nel modello virtuale il valore finale e' una metrica di gioco; nel modello riscattabile reale il valore finale diventa un'uscita di cassa del sistema.

Sintesi audit solvibilita':

- se `systemNet < 0`, il sistema non e' autosufficiente nello scenario reale;
- il rischio nasce quando il valore finale pagato agli utenti supera capitale depositato e commissioni disponibili;
- la strategia `VALUE` e' critica perche' puo' produrre vantaggio replicabile e quindi payout ricorrenti verso utenti esperti;
- gli utenti whale aumentano il rischio assoluto perche' concentrano capitale elevato su poche posizioni;
- servirebbero fondo/riserve, cap capitale per utente, cap esposizione per singolo giocatore e monitoraggio di concentrazione;
- prima di qualunque payout reale servono parere legale, fiscale, regolatorio, AML/KYC e risk framework.

Raccomandazione: non procedere con payout reale immediato. Il pilot resta virtuale; eventuali premi, montepremi o riscossione reale devono essere valutati separatamente.

## 8. Evoluzione possibile

Fase 1 - pilot virtuale:

- accesso libero;
- capitale virtuale;
- ranking ROI%;
- nessun pagamento.

Fase 2 - modello ibrido opzionale:

- classifica ROI% sempre gratuita;
- eventuale premio opt-in separato;
- analisi legale prima di qualunque quota reale.

Fase 3 - modello reale:

- solo dopo parere legale;
- eventuali pagamenti, wallet e payout gestiti come prodotto separato;
- stesse formule core, ma con infrastruttura finanziaria dedicata.

## 9. Campi concettuali richiesti

| Campo | Significato |
|---|---|
| `initialRosterCost` | Costo lordo delle posizioni attive |
| `totalCapitalDeposited` | Capitale virtuale totale depositato |
| `virtualCashBalance` | Cash/deposito virtuale disponibile |
| `totalBuyCommissions` | Commissioni di acquisto pagate |
| `totalSellCommissions` | Commissioni di vendita pagate |
| `netLiquidationValue` | Valore netto liquidabile della rosa |
| `finalLiquidationValue` | Valore finale virtuale liquidabile: netLiquidationValue + virtualCashBalance |
| `profitLoss` | Utile/perdita virtuale: finalLiquidationValue - totalCapitalDeposited |
| `roiPct` | ROI percentuale ufficiale |

Nel backend attuale alcuni campi mantengono nomi legacy per compatibilita' (`initialBudget`, `availableBudget`), ma la semantica FAVC e':

```text
initialBudget legacy = totalCapitalDeposited
availableBudget = virtualCashBalance
currentRoi = roiPct
```
