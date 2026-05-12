# FantaTrading - Final Settlement

**Data:** 2026-05-12
**Stato:** specifica backend minimale

## 1. Audit stato attuale

Prima dell'intervento non esisteva un processo dedicato di final settlement:

- nessun `SettlementModule` o service di liquidazione finale;
- nessun endpoint `POST /admin/seasons/:seasonId/settlement/calculate`;
- nessun endpoint `GET /teams/:id/final-settlement`;
- nessuna tabella dedicata per conservare snapshot di riscossione finale;
- la logica FAVC era gia' parzialmente presente in `TeamsService`.

Nel backend attuale, prima del nuovo modulo:

- `Team.initialBudget` e' usato come `totalCapitalDeposited`;
- `Team.availableBudget` e' usato come `virtualCashBalance`;
- il riepilogo portafoglio calcola `netLiquidationValue` applicando `Season.sellCommissionRate`;
- il ROI FAVC usa gia' `netLiquidationValue + virtualCashBalance - totalCapitalDeposited`;
- la commissione finale di vendita e' quindi lo scenario gia' coerente con il modello esistente.

## 2. Regola di riscossione finale

La riscossione finale e' una chiusura virtuale del portafoglio. Non implica denaro reale, payout, pagamenti digitali o integrazioni bancarie.

Formula:

```text
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

Esempio:

```text
totalCapitalDeposited = 285
finalLiquidationValue = 310
profitLoss = 25
roiPct = 8.77%
```

Il valore finale riscuotibile e' 310. Non va aumentato di nuovo dell'8.77%.

## 3. Campi

| Campo | Significato |
|---|---|
| `totalCapitalDeposited` | Capitale virtuale totale depositato, denominatore del ROI |
| `initialRosterCost` | Costo lordo delle posizioni attive |
| `virtualCashBalance` | Liquidita' virtuale disponibile, generata da vendite o capitale non investito |
| `activePositionsValue` | Valore lordo corrente delle posizioni ancora attive |
| `finalSellCommissionAmount` | Commissione di vendita applicata alla liquidazione finale |
| `netLiquidationValue` | Valore netto della rosa dopo eventuale sell fee finale |
| `finalLiquidationValue` | Valore finale virtualmente riscuotibile |
| `profitLoss` | Utile/perdita virtuale |
| `roiPct` | Rendimento percentuale ufficiale |
| `rankByRoi` | Posizione in classifica calcolata per ROI% |
| `isPrizeEligible` | Indicatore informativo sulla soglia premio opzionale |

## 4. Commissione vendita finale

Il modello usato attualmente e' lo scenario A:

- liquidazione finale con sell fee;
- `finalSellCommissionAmount = activePositionsValue * sellCommissionRate`;
- `netLiquidationValue = activePositionsValue - finalSellCommissionAmount`.

Scenario B, non attivo di default:

- liquidazione finale senza sell fee;
- `finalSellCommissionAmount = 0`;
- `netLiquidationValue = activePositionsValue`.

La configurazione e' esplicitata nello snapshot tramite `applyFinalSellCommission`.

## 5. Endpoint backend

Endpoint admin:

```text
POST /admin/seasons/:seasonId/settlement/calculate
```

Calcola e persiste uno snapshot `FinalSettlement` per ogni team della stagione. Per stagioni `COMPLETED`, se uno snapshot esiste gia', viene restituito quello stabile senza sovrascriverlo.

Endpoint utente:

```text
GET /teams/:id/final-settlement
```

Restituisce lo snapshot finale del team. Un partecipante puo' leggere solo il proprio team; admin e super-admin possono leggere tutti i team.

## 6. Persistenza e audit

La tabella minimale e' `FinalSettlement`.

Ogni settlement persistito genera un record `AuditLog` con action `CALCULATE_FINAL_SETTLEMENT`, riferimento allo snapshot e dettagli principali del calcolo.

Regole:

- non sovrascrivere snapshot esistenti senza log;
- per stagioni `COMPLETED`, il settlement gia' calcolato e' stabile;
- ranking e idoneita' premio sono calcolati sul ROI%, non sul valore assoluto riscuotibile.

## 7. Confini espliciti

Il final settlement non implementa:

- pagamenti reali;
- wallet reali;
- payout;
- integrazioni bancarie;
- modifica delle formule core validate.
