# FantaTrading — Free Access Virtual Capital Model

**Versione:** 1.0
**Data:** 2026-05-12
**Stato:** Implementato (pilot virtuale)

---

## 1. Cos'è questo modello

Il modello **FREE_ACCESS_VIRTUAL_CAPITAL_TRADING_MODEL** (FAVC) è la versione pilota di FantaTrading progettata per:

- abbassare la barriera d'ingresso a zero (nessuna quota d'iscrizione obbligatoria);
- permettere a ogni utente di scegliere liberamente quanto capitale investire;
- misurare la bravura tramite ROI%, non tramite la ricchezza assoluta finale;
- operare interamente con capitale virtuale (nessun denaro reale).

---

## 2. Differenza rispetto al modello a quota iscrizione

| Dimensione | Modello quota iscrizione | Modello FAVC |
|---|---|---|
| Accesso | Quota obbligatoria (es. 30 €) | Libero, zero barriere |
| Budget iniziale | Fisso e uguale per tutti | Variabile: ogni utente decide |
| Unità di misura | Crediti virtuali uniformi | Crediti virtuali proporzionali alla quota del giocatore |
| Classifica | Ricchezza assoluta (chi ha più crediti) | ROI percentuale (chi ha reso di più) |
| Montepremi | Da commissioni + quote obbligatorie | Da sole commissioni (o opt-in) |
| Confronto equo | Sì, tutti partono uguali | Sì, solo tramite ROI% |

**Perché la classifica su ricchezza assoluta sarebbe iniqua nel FAVC:**
chi investe 1.000 € ha più materiale grezzo da apprezzare rispetto a chi ne investe 150. Una variazione identica in percentuale produce guadagni assoluti molto diversi. Solo il ROI% livella il campo.

---

## 3. Struttura del capitale virtuale

### 3.1 Variabili per utente/squadra

| Campo | Descrizione |
|---|---|
| `totalCapitalDeposited` | Totale capitale "versato" dall'utente (virtuale). Aumenta quando acquista un giocatore che costa più del cash disponibile. Corrisponde a `initialBudget` nel DB. |
| `virtualCashBalance` | Cash non investito disponibile. Alias di `availableBudget` nel DB. |
| `currentPortfolioValue` | Valore lordo corrente di tutte le posizioni aperte. |
| `netLiquidationValue` | Valore netto incassabile vendendo tutte le posizioni (`portfolioValue × (1 − sellCommissionRate)`). |
| `initialRosterCost` | Somma dei prezzi di acquisto (lordi) delle posizioni attive. |
| `totalBuyCommissions` | Somma delle commissioni di acquisto pagate. |
| `totalSellCommissions` | Somma delle commissioni di vendita pagate. |
| `roiPct` | ROI% corrente (vedi formula sotto). |

### 3.2 Esempio valori di partenza

- Utente A sceglie di investire 150 crediti → `totalCapitalDeposited = 150`
- Utente B sceglie di investire 600 crediti → `totalCapitalDeposited = 600`

Entrambi possono costruire la rosa come vogliono; la classifica li confronterà solo su ROI%.

---

## 4. Formula ROI (FAVC)

```
ROI% =
(
  netLiquidationValue
  + virtualCashBalance
  − totalCapitalDeposited
)
/
totalCapitalDeposited
× 100
```

### Regola anti-doppio conteggio

```
capitaleTotaleVersato    = 285 crediti
valoreNettoLiquidabile   = 295 crediti
depositoVirtuale         =  15 crediti
totaleFinale             = 295 + 15 = 310 crediti

utile                    = 310 − 285 = 25 crediti
ROI%                     = 25 / 285 × 100 = 8.77%
```

Il valore finale rimane 310 crediti. Non si applica nuovamente il ROI al valore finale.

---

## 5. Formula acquisto

```
grossBuy   = quotaGiocatore (crediti)
commBuy    = grossBuy × buyCommissionRate
totalCost  = grossBuy + commBuy
```

- `virtualCashBalance` diminuisce di `totalCost`.
- Se `totalCost > virtualCashBalance`: il deficit aumenta `totalCapitalDeposited` e azzera il cash.
- La commissione `commBuy` è trattenuta dal sistema.

### Esempio

```
giocatore quotato 34 crediti, buyCommissionRate = 2%
grossBuy  = 34
commBuy   = 0.68
totalCost = 34.68

virtualCashBalance prima:  100
virtualCashBalance dopo:   100 − 34.68 = 65.32
totalCapitalDeposited:     invariato (c'era abbastanza cash)
```

---

## 6. Formula vendita

```
grossSell   = netLiquidationValuePosizione
            = initialQuote × (1 + (Qt.A − Qt.I) × 5 / 100)
commSell    = grossSell × sellCommissionRate
netProceeds = grossSell − commSell
```

- `virtualCashBalance` aumenta di `netProceeds`.
- Se si vende un giocatore meno costoso e si reinveste in uno più costoso, la differenza si aggiunge al `virtualCashBalance` prima del prossimo acquisto.
- La commissione `commSell` è trattenuta dal sistema.

### Esempio: vendita che aumenta virtualCashBalance

```
Qt.I = 34, Qt.A = 35 → tradingReturn = +5%
grossSell = 34 × 1.05 = 35.70
commSell  = 35.70 × 0.02 = 0.714
netProceeds = 35.70 − 0.714 = 34.986
virtualCashBalance += 34.986
```

---

## 7. Aggiunta capitale virtuale

Quando un utente acquista un giocatore il cui prezzo supera il `virtualCashBalance` corrente:

```
capitalToAdd = max(0, totalCost − virtualCashBalance)
totalCapitalDeposited += capitalToAdd
virtualCashBalance = 0
```

### Esempio: acquisto con deposito aggiuntivo

```
virtualCashBalance = 50
totalCost = 102 (giocatore a 100 + 2% commissione)

capitalToAdd = 102 − 50 = 52
totalCapitalDeposited += 52
virtualCashBalance = 0
```

Il denominatore del ROI aumenta di 52, riflettendo il reale impegno di capitale dell'utente.

---

## 8. Commissioni trattenute dal sistema

Le commissioni di acquisto e vendita non entrano nel montepremi: sono trattenute interamente dal sistema per coprire i costi operativi e (in futuro) finanziare eventuali premi opzionali.

| Operazione | Commissione | Destinazione |
|---|---|---|
| Acquisto giocatore | `grossBuy × buyCommissionRate` | Sistema (100%) |
| Vendita giocatore | `grossSell × sellCommissionRate` | Sistema (100%) |

---

## 9. Cambi liberi

Non esiste un limite massimo di cambi per stagione. Ogni cambio genera commissioni (buy + sell), il che rende l'overtrading economicamente costoso senza regole formali che lo vietino.

---

## 10. Perché il pilot usa capitale virtuale

### Motivazioni

1. **Zero rischio legale.** Nessun denaro reale circolante, nessuna licenza necessaria (MSB, AAMS/ADM).
2. **Facilità di onboarding.** Chiunque può partecipare senza pagare.
3. **Raccolta dati comportamentali.** Il pilot misura frequenza di cambio, composizione rosa, distribuzione ROI reale.
4. **Flessibilità parametrica.** Le commissioni (virtuali) possono essere modificate senza impatto finanziario su utenti reali.

### Cosa viene validato nel pilot

- Distribuzione del ROI% su dati storici reali.
- Frequenza media di cambio (λ ops/giornata).
- Attrattività della classifica su ROI%.
- Break-even di utenti attivi per la sostenibilità del sistema a sole commissioni.

---

## 11. Evoluzione verso modello ibrido o reale

Il pilot virtuale è il primo passo di una roadmap in tre fasi:

### Fase 1 — Pilot virtuale (attuale)

- Accesso libero.
- Capitale 100% virtuale.
- Commissioni virtuali.
- Classifica su ROI%.
- Nessun premio monetario.

### Fase 2 — Modello ibrido (opzionale)

- Accesso libero (classifica principale).
- Opt-in volontario: chi vuole, versa una quota al montepremi comune.
- Chi versa la quota compete anche per il premio monetario (secondario).
- Chi non versa compete solo per la classifica ROI% (principale).
- Analisi legale necessaria per l'opt-in (contributo volontario vs gioco).

### Fase 3 — Modello con denaro reale (futuro)

- Solo dopo analisi legale approfondita.
- Richiede licenze per la gestione di denaro di terzi.
- Il modello tecnico (ROI%, commissioni, capital deposit) è già implementato.
- Migrazione: sostituire "crediti virtuali" con "euro reali" e collegare un gateway di pagamento.

---

## 12. Impatto sull'implementazione attuale

### Campi aggiunti alla risposta `/teams/:id/portfolio`

```json
{
  "summary": {
    "totalCapitalDeposited": 285,
    "virtualCashBalance": 15,
    "netLiquidationValue": 295,
    "initialRosterCost": 270,
    "totalBuyCommissions": 5.7,
    "totalSellCommissions": 3.2,
    "roiPct": 8.77
  }
}
```

### Cambiamento formula ROI nel backend

Prima: `ROI = (portfolioValue + availableBudget − initialBudget) / initialBudget`
Dopo:  `ROI = (netLiquidationValue + virtualCashBalance − totalCapitalDeposited) / totalCapitalDeposited`

La differenza: il nuovo ROI sottrae le commissioni di vendita potenziali (netLiquidationValue vs portfolioValue lordo), dando una stima più conservativa e corretta del rendimento reale.

### Classifica

La classifica principale usa `roiPct`. La ricchezza assoluta (`totalWealth`) rimane come metrica informativa nel portfolio summary, ma non è il criterio ordinante ufficiale.

---

## 13. Parametri V1 consigliati per il pilot

| Parametro | Valore | Motivazione |
|---|---|---|
| `buyCommissionRate` | 1.5% | Commissione acquisto bassa per non penalizzare chi costruisce la rosa |
| `sellCommissionRate` | 3.0% | Commissione vendita più alta frena l'overtrading compulsivo |
| `prizeThreshold` | 5% | Soglia ROI per accedere ai premi (se presenti) |
| `initialBudget` | 0 o libero | Per il pilot puro, il budget iniziale non è fissato dall'organizzatore |
| `rosterComposition` | 3P+8D+8C+6A | 25 giocatori fissi per composizione obbligatoria |
