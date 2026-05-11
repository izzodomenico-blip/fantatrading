# Ipotesi di Simulazione

Tutte le assunzioni semplificatrici adottate nelle simulazioni Monte Carlo.

---

## Ipotesi sul Mercato

| Ipotesi | Valore | Note |
|---------|--------|------|
| Distribuzione operazioni per squadra per giornata | Poissoniana con media `λ` | Alternativa: uniforme |
| Prezzo di acquisto/vendita | Valore corrente del calciatore | No spread bid/ask |
| Direzione operazione (buy/sell) | 50% buy, 50% sell | Da calibrare su dati reali |
| Quote per operazione | Uniforme in [1, maxSharesPerOp] | Default: sempre 1 quota |

## Ipotesi sui Valori dei Calciatori

| Ipotesi | Valore | Note |
|---------|--------|------|
| Variazione giornaliera | Distribuzione normale N(0, σ) + bonus/malus deterministici | σ calibrabile |
| Floor valore calciatore | `playerMinValue` (default: 1) | Evita valori negativi |
| Cap valore calciatore | `playerMaxValue` (default: 100) | Opzionale |
| Correlazione tra calciatori | Non modellata (indipendenza) | Semplificazione |

## Ipotesi sui Partecipanti

| Ipotesi | Valore | Note |
|---------|--------|------|
| Strategia di trading | Casuale | Fase 1; agenti strategici in Fase 4 |
| Budget minimo mantenuto | `minBudgetReserve` | Non va sotto questo valore |
| Selezione calciatore per operazione | Uniforme tra disponibili | No preferenze |

## Ipotesi sulla Stagione

| Ipotesi | Valore | Note |
|---------|--------|------|
| Numero giornate | 38 | Serie A |
| Tutti i team completano la stagione | true | No ritiri |
| Commissioni sempre riscosse | true | No evasione |

---

## Sensibilità alle Ipotesi

Le ipotesi più impattanti sui risultati sono:
1. **Frequenza delle operazioni** — il montepremi scala linearmente con il numero di operazioni.
2. **Tasso di commissione** — impatto diretto su montepremi e piattaforma.
3. **Split montepremi/piattaforma** — equilibrio tra sostenibilità e attrattività per i partecipanti.
