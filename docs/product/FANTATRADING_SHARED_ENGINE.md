# FantaTrading — Shared Engine (`src/shared/`)

**Versione:** 1.0  
**Data:** 2026-05-12  
**Stato:** Implementato e testato (523 test passati)

---

## 1. Scopo

`src/shared/` è la libreria di calcolo canonica di FantaTrading V1.

Contiene le **formule validate**, le **costanti regolamento** e i **tipi di dominio** che devono essere usati in modo identico da:

- I backtest TypeScript esistenti (`src/analysis/`, `src/engine/`)
- Il futuro backend NestJS
- Qualsiasi strumento di calcolo futuro (CLI admin, script di importazione, ecc.)

**Regola fondamentale:** se esiste in `src/shared/`, non riscriverla altrove.

---

## 2. Struttura

```
src/shared/
├── index.ts                        # Barrel export pubblico
├── domain/
│   └── index.ts                    # Tipi di dominio (RosterCount, ecc.)
├── rules/
│   └── v1Rules.ts                  # Costanti regolamento V1
├── calculations/
│   ├── positionValue.ts            # Formula quotazioni (fonte di verità)
│   ├── commissions.ts              # Commissioni acquisto/vendita
│   ├── portfolio.ts                # Valore portafoglio totale
│   ├── roi.ts                      # ROI e idoneità premio
│   ├── roster.ts                   # Validazione composizione rosa
│   ├── teamBand.ts                 # Re-export da engine (fascia voti squadra)
│   └── bonusMalus.ts               # Bonus/malus fantasy e moltiplicatore
├── money/
│   └── precision.ts                # Arrotondamento monetario
└── audit/
    └── AuditEvent.ts               # Tipi evento audit (per backend)
```

---

## 3. Formula quotazioni — fonte di verità

**File:** `src/shared/calculations/positionValue.ts`

```typescript
// Ogni punto di differenza = 5% di rendimento (NON percentuale classica)
export function calculateQuoteStepReturn(qtI: number, qtA: number): number {
  return (qtA - qtI) * 5;
}

// Valore posizione: mai negativo (floor a 0)
export function calculatePositionValue(
  initialQuote: number,    // Qt.I: quotazione all'acquisto
  currentQuote: number,    // Qt.A: quotazione attuale
  fantasyMultiplier: number, // prodotto cumulato bonus/malus
): number {
  const tradingReturnPct = calculateQuoteStepReturn(initialQuote, currentQuote);
  return Math.max(0, initialQuote * fantasyMultiplier * (1 + tradingReturnPct / 100));
}
```

**Esempio verificato da test:**
- Qt.I = 1, Qt.A = 2, mult = 1.0 → valore = **1.05** (NON 2.0)
- Ragionamento: `(2-1) * 5 = 5%` di rendimento, non `(2-1)/1 * 100 = 100%`
- Qt.I = 10, Qt.A = 8, mult = 1.0 → valore = **9.00** (−10%, non −20%)

**Errore storico da non ripetere:** prima del refactoring, `intraseasonTradingBacktest.ts` aveva un bug che produceva HOLD ROI = 217.20% invece del corretto ~10%. Il bug era nell'uso della formula classica percentuale invece della formula FantaTrading (+1 punto = +5%).

---

## 4. Costanti Regolamento V1

**File:** `src/shared/rules/v1Rules.ts`

| Costante | Valore | Significato |
|----------|--------|-------------|
| `V1_BUY_COMMISSION_RATE` | 0.02 | Commissione acquisto 2% |
| `V1_SELL_COMMISSION_RATE` | 0.02 | Commissione vendita raccomandata 2% |
| `V1_PLATFORM_FEE_RATE` | 0.10 | Fee piattaforma 10% delle commissioni totali |
| `V1_PRIZE_THRESHOLD` | 7 | Soglia premio: ROI ≥ 7% (punti percentuali) |
| `V1_SURVIVAL_THRESHOLD` | 0 | Soglia sopravvivenza: ROI ≥ 0% |
| `V1_QUOTE_STEP_PCT` | 5 | +1 punto quotazione = +5% rendimento |
| `V1_MAX_LOSS_PCT` | -100 | Perdita massima (valore mai negativo) |
| `V1_ROSTER_COMPOSITION` | `{GK:3, DEF:8, MID:8, FWD:6, total:25}` | Rosa regolamentare |
| `V1_NO_VOTE_POLICY` | `PLAYER_ZERO_TEAM_EXCLUDE` | SV escluso dalla media squadra, effetto individuale 0% |

**Nota sulle commissioni:** `V1_SELL_COMMISSION_RATE = 0.02` riflette la raccomandazione regolamentare. I backtest storici pre-V1 usano internamente `SELL_FEE = 0.0125` (1.25%) per simulare le commissioni reali dell'epoca — questo non è un conflitto, sono contesti separati.

---

## 5. Calcoli disponibili

### Commissioni (`commissions.ts`)

```typescript
calculateBuyCommission(grossValue, rate)      // commissione acquisto
calculateSellCommission(grossValue, rate)     // commissione vendita
calculateBuyCost(grossValue, rate)            // { gross, commission, total }
calculateSellProceeds(grossValue, rate)       // { gross, commission, net }
calculatePlatformFee(totalCommissions, feeRate) // fee piattaforma
```

### ROI (`roi.ts`)

```typescript
calculateROI(portfolioValue, availableBudget, initialBudget): number
// = ((portfolioValue + availableBudget - initialBudget) / initialBudget) * 100

calculatePrizeEligibility(roi, prizeThreshold): boolean
// true se roi >= prizeThreshold (default: V1_PRIZE_THRESHOLD = 7)
```

### Rosa (`roster.ts`)

```typescript
validateRosterComposition(actual, required?): string[]  // lista errori (vuota = valida)
isRosterComplete(actual, required?): boolean
```

### Bonus/Malus (`bonusMalus.ts`)

```typescript
calculateFantasyBonusMalus(teamBand, individualVote, noVotePolicy?, tableConfig?): number
// Ritorna il bonus/malus in punti percentuali per il round

applyBonusToMultiplier(fantasyMultiplier, bonusPct): number
// mult *= (1 + bonusPct/100) — aggiornamento cumulato round per round
```

### Precisione monetaria (`money/precision.ts`)

```typescript
roundTo(value, decimals): number
roundTo2(v)   // per importi in budget
roundTo4(v)   // per quotazioni
roundTo6(v)   // per moltiplicatori
```

---

## 6. Come usare nel backend NestJS

### Importazione

```typescript
// Import dalla barrel (preferito)
import {
  calculatePositionValue,
  calculateROI,
  V1_PRIZE_THRESHOLD,
  V1_ROSTER_COMPOSITION,
} from '@shared';

// Oppure import diretto per tree-shaking
import { calculatePositionValue } from '@shared/calculations/positionValue';
```

### Alias TypeScript (`tsconfig.json`)

Il path alias `@shared` deve essere configurato nel `tsconfig.json` del backend:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared": ["../shared/index"],
      "@shared/*": ["../shared/*"]
    }
  }
}
```

### Principio di utilizzo

I servizi NestJS **non devono reimplementare** nessuna delle formule presenti in `src/shared/`. Devono:

1. Importare la funzione canonica da `@shared`
2. Chiamarla con i parametri dal database (via Prisma)
3. Eventualmente arrotondare il risultato con `roundTo2` prima di salvarlo

```typescript
// Esempio: calcolo valore posizione nel MarketService
import { calculatePositionValue, roundTo2 } from '@shared';

const value = roundTo2(
  calculatePositionValue(position.initialQuote, currentQuote, position.fantasyMultiplier)
);
```

---

## 7. Test

**File:** `tests/unit/shared.test.ts`

I test della libreria condivisa coprono:

- Tutte le costanti V1 (valori esatti)
- Formula quotazioni con casi edge (Qt.A < Qt.I, valore = 0 al floor)
- Commissioni acquisto e vendita
- ROI e soglia premio
- Validazione rosa (composizione corretta/errata)
- Policy SV `PLAYER_ZERO_TEAM_EXCLUDE` vs `ZERO` (comportamento diverso sulla media squadra)
- Bonus/malus e aggiornamento moltiplicatore
- Scenario integrato end-to-end

Per eseguire solo i test shared:

```bash
npm test -- --testPathPattern=shared
```

---

## 8. Cosa NON è in `src/shared/`

- **Motore simulazione sintetica**: `src/simulation/` (specifico per backtest)
- **Import dati reali**: `src/services/` (I/O file, specifico per CLI)
- **Orchestrazione backtest**: `src/analysis/` (pipeline multi-round)
- **Logica fascia voti (implementazione)**: `src/engine/teamVoteBandEngine.ts` — shared la re-esporta ma non la reimplementa
- **Schema DB / ORM**: futuro `backend/prisma/schema.prisma`
- **Controller HTTP**: futuro `backend/src/`

---

## 9. Dipendenze

`src/shared/` non ha dipendenze esterne. Dipende solo da:

- `src/engine/teamVoteBandEngine.ts` (via re-export in `calculations/teamBand.ts`)
- `src/engine/bonusMalusEngine.ts` (via adapter in `calculations/bonusMalus.ts`)

Non importa da `src/analysis/`, `src/simulation/`, `src/services/`, né da framework (NestJS, Express, Prisma).

---

## 10. Changelog

| Data | Versione | Note |
|------|----------|------|
| 2026-05-12 | 1.0 | Prima implementazione — formula canonica, costanti V1, test 523/523 passati |
