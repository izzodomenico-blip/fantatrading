# Regolamento Formalizzato FantaTrading

Versione matematicamente precisa del regolamento, con definizioni formali di ogni parametro.

---

## 1. Entità del Sistema

- **Calciatore** (`Player`): entità con valore corrente, ruolo, club reale.
- **Squadra** (`Team`): partecipante con budget e portfolio di calciatori.
- **Portfolio** (`Portfolio`): insieme di quote di calciatori possedute da una squadra.
- **Operazione di mercato** (`MarketOperation`): acquisto o vendita di quote.
- **Giornata** (`Round`): unità temporale minima; corrisponde a una giornata di campionato reale.
- **Stagione** (`Season`): sequenza di giornate dal round 1 al round N.

---

## 2. Iscrizione

Ogni squadra versa una quota di iscrizione `registrationFee` prima dell'inizio della stagione.
La quota è suddivisa tra montepremi e piattaforma secondo `prizePoolContributionRate`.

---

## 3. Budget Iniziale

Ogni squadra riceve un budget iniziale `initialBudget` (crediti virtuali) con cui operare sul mercato.

---

## 4. Mercato

### 4.1 Acquisto

Costo totale acquisto di `q` quote al prezzo `p`:

```
gross   = q × p
comm    = gross × buyCommissionRate
totalCost = gross + comm
```

Il budget della squadra si riduce di `totalCost`.
La commissione `comm` entra nel sistema di montepremi/piattaforma.

### 4.2 Vendita

Proventi netti della vendita di `q` quote al prezzo `p`:

```
gross      = q × p
comm       = gross × sellCommissionRate
netProceeds = gross − comm
```

Il budget della squadra aumenta di `netProceeds`.
La commissione `comm` entra nel sistema di montepremi/piattaforma.

---

## 5. Variazione Valori Calciatori

Dopo ogni giornata, il valore di ogni calciatore varia in base a bonus/malus derivati
dalle prestazioni reali (gol, assist, cartellini, clean sheet, minuti giocati).

```
newValue = max(playerMinValue, currentValue + bonusMalus(stats, role))
```

---

## 6. Ranking

Le squadre sono classificate per **ricchezza totale** a fine stagione:

```
totalWealth = portfolioValue + remainingBudget
portfolioValue = Σ (currentValue × shares) per ogni calciatore nel portfolio
```

---

## 7. Montepremi

### 7.1 Formazione del Montepremi

```
totalCommissions = Σ tutte le commissioni della stagione
prizePool = totalCommissions × prizePoolContributionRate
platformRevenue = totalCommissions × platformFeeRate
```

Dove `prizePoolContributionRate + platformFeeRate = 1`.

### 7.2 Distribuzione Premi

I premi sono distribuiti ai primi N classificati secondo la tabella premi configurata.

```
prize[rank] = prizePool × prizeTable[rank].percentageOfPool
```
