# Audit Backtest Intra-stagione — FantaTrading

**Data audit:** 2026-05-12
**Versione corretta:** post-audit

---

## 1. Problema riscontrato

Il backtest intra-stagione con quotazioni sintetiche ROLE_BONUS_SENSITIVE riportava per la strategia HOLD un ROI medio di **217.20%**, valore evidentemente gonfiato. L'analisi ha individuato due bug nel calcolo.

---

## 2. Bug #1 — CRITICO: Formula `positionValue` errata

### Causa

La funzione `positionValue` calcolava il valore di una posizione come:

```
positionValue = currentQaa × fantasyMultiplier
```

Questo è sbagliato per due ragioni:

1. Usa la quotazione sintetica grezza (`qaa`) invece della formula FantaTrading che vale `1 punto di variazione = 5% del valore iniziale`.
2. Per giocatori con `Qt.I < 20` (es. portieri a quota 1–5, difensori a quota 4–12), il `qaa` lordo è molto più alto rispetto al valore corretto calcolato con la formula FantaTrading.

### Esempio concreto

- Giocatore: Qt.I = 5, `qaa` finale = 7 (salito di 2 punti)
- Formula errata: `positionValue = 7 × 1.0 = 7`
- Formula corretta FantaTrading: `5 × (1 + (7−5) × 5/100) = 5 × 1.10 = 5.5`
- Sopravvalutazione: `7 / 5.5 = 127%`

La strategia HOLD, per tiebreak, selezionava i giocatori **più economici** (Qt.I spesso 1–5 per portieri), che erano quelli più sopravvalutati dalla formula errata.

### Formula corretta (coerente con `historicalFullRulesBacktest.ts`)

```
positionValue = Qt.I × fantasyMultiplier × (1 + (currentQaa − Qt.I) × 5 / 100)
```

Questa formula è la stessa usata in `evaluateFullRulesPortfolio` (linea ~296–298):
```ts
const fantasyBaseValue = player.initialQuote * (fantasyMultipliers.get(player.playerId) ?? 1);
const fullSellValue = calculateSellValue(fantasyBaseValue, effective);
// dove effective = (Qt.A - Qt.I) * 5
```

### Fix applicato

- Aggiunto campo `initialQuote: number` all'interfaccia `Position`
- `buyPosition` ora popola `initialQuote: row.initialQuote` (Qt.I della stagione)
- Aggiunta funzione esportata `fantaTradingPositionValue(initialQuote, currentQaa, fantasyMultiplier)`
- `positionValue` ora usa la formula corretta

---

## 3. Bug #2 — MEDIO: `SELL_FEE` errata (2% → 1.25%)

### Causa

Il codice usava `SELL_FEE = 0.02` (2%) mentre il regolamento FantaTrading V1 prevede commissione di vendita **1.25%** (`sellCommissionRate: 0.0125`). Tutti gli altri backtest (`historicalPortfolioSimulator`, `historicalFullRulesBacktest`) usano correttamente 1.25%.

### Fix applicato

```ts
// Prima (sbagliato)
const SELL_FEE = 0.02;
// Dopo (corretto)
const SELL_FEE = 0.0125;
```

---

## 4. Verifica checklist completa

| # | Punto | Stato | Note |
|---|-------|-------|------|
| 1 | Valore iniziale rosa | ✅ CORRETTO | `totalCapitalAdded = sum(qaa_round1 × 1.02)` ≈ `sum(Qt.I × 1.02)` |
| 2 | Commissione acquisto 2% | ✅ CORRETTO | `BUY_FEE = 0.02` |
| 3 | Quotazioni sintetiche round-by-round | ✅ CORRETTO | `quoteAt(index, season, round, playerId)?.qaa` |
| 4 | Bonus/malus fantasy giornaliero | ✅ CORRETTO | `applyFantasyRound` chiama `getBonusMalusPct` per ogni round |
| 5 | Bonus 1.5 = moltiplicatore 1.015 | ✅ CORRETTO | `fantasyMultiplier *= 1 + 1.5/100 = 1.015` |
| 6 | Malus -2.5 = moltiplicatore 0.975 | ✅ CORRETTO | `fantasyMultiplier *= 1 + (-2.5)/100 = 0.975` |
| 7 | No Qt.A finale sovrapposta a qaa sintetico | ✅ CORRETTO | La formula usa `currentQaa` (sintetico), nessuna Qt.A aggiuntiva |
| 8 | Rendimento quotazione non contato due volte | ✅ CORRETTO POST-FIX | Formula corretta: `(currentQaa - Qt.I) × 5` applicato una sola volta |
| 9 | Premi e ROI non sommati due volte | ✅ CORRETTO | `finalROI = (finalValue - totalCapitalAdded) / totalCapitalAdded × 100` |
| 10 | HOLD senza cambi non genera commissioni extra | ✅ CORRETTO | HOLD non chiama `executeTrade`, solo buy iniziale + sell finale |
| 11 | Capitale totale = costo iniziale + commissioni | ✅ CORRETTO | `totalCapitalAdded = sum(buyPrice × 1.02)` per HOLD |

---

## 5. Impatto della correzione

| Metrica | Valore PRIMA (bug) | Valore DOPO (corretto) |
|---------|-------------------|----------------------|
| HOLD ROI medio | 217.20% | **5.30%** |
| HOLD ROI best | 241.31% | **8.54%** |
| HOLD ROI worst | 193.09% | **2.05%** |
| VALUE_ROTATION ROI | 166.60% | **-1.86%** |
| MOMENTUM ROI | -19.42% | **-24.34%** |
| Commissioni HOLD | 2.19 crediti (sovrastimate) | **0.86 crediti** |

---

## 6. Consistenza con altri backtest

- **Historical portfolio backtest** (Qt.I → Qt.A, senza voti): ROI medio ≈ -8.2%
- **Full-rules backtest** (Qt.I → Qt.A, con voti): ROI medio ≈ 5–15% per buone strategie
- **Intraseason backtest post-fix** (qaa round-by-round, con voti): HOLD ≈ 5.30% ✅

Il risultato post-fix è coerente con il full-rules backtest (che usa la stessa formula ma con Qt.A reale invece di qaa sintetico).

---

## 7. Test aggiunti

File: `tests/unit/intraseasonTradingBacktest.test.ts`

| Test | Verifica |
|------|---------|
| `bonus 1.5 applicato come moltiplicatore 1.015, non addizione` | `1 + 1.5/100 = 1.015` |
| `malus -2.5 applicato come moltiplicatore 0.975, non sottrazione` | `1 + (-2.5)/100 = 0.975` |
| `nessun doppio conteggio Qt.I → Qt.A` | Formula applicata una sola volta |
| `Qt.I != 20: formula non coincide con raw qaa` | Qt.I=34, qaa=36 → 37.4, non 36 |
| `Qt.I basso: formula non sopravvaluta il giocatore economico` | Qt.I=5, qaa=7 → 5.5, non 7 |
| `ROI caso semplice: Qt.I=20, flat market, no bonus → solo commissioni` | ROI ≈ -3.19% |
| `HOLD non genera commissioni extra` | `trades == 0` per HOLD |
| `commissioni corrette su executeTrade` | `sell=1.25%`, `buy=2%` |

**Totale test:** 452 (tutti verdi, +8 rispetto alla sessione precedente)
