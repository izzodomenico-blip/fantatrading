# Formule di Calcolo FantaTrading

Raccolta di tutte le formule matematiche utilizzate nel motore.

---

## Commissioni di Mercato

### Acquisto
```
grossBuy      = shares × pricePerShare
commBuy       = grossBuy × buyCommissionRate
totalCost     = grossBuy + commBuy
```

### Vendita
```
grossSell     = shares × pricePerShare
commSell      = grossSell × sellCommissionRate
netProceeds   = grossSell − commSell
```

### Spread effettivo (costo round-trip)
```
spreadCost    = grossBuy × (buyCommissionRate + sellCommissionRate)
spreadCostPct = buyCommissionRate + sellCommissionRate
```
Esempio con commissioni al 10%: un acquisto+vendita allo stesso prezzo costa il 20% del capitale impiegato.

---

## Bonus/Malus Calciatori

```
bonusMalus = goals × goalBonus[role]
           + assists × assistBonus
           + yellowCards × yellowCardMalus
           + redCards × redCardMalus
           + (cleanSheet ? cleanSheetBonus[role] : 0)
           + (minutesPlayed < minuteThreshold ? noPlayMalus : 0)
```

### Aggiornamento valore
```
newValue = max(playerMinValue, currentValue + bonusMalus)
```

---

## ROI Squadra

```
portfolioValue   = Σ (player.currentValue × shares)  per ogni entry nel portfolio
unrealizedGains  = portfolioValue − totalInvested
netROI           = realizedGains + unrealizedGains − totalCommissionsPaid
netROIPercent    = netROI / totalInvested × 100
grossROI         = realizedGains + unrealizedGains
grossROIPercent  = grossROI / totalInvested × 100
```

---

## Montepremi

```
prizePool        = Σ commissioni × prizePoolContributionRate
platformRevenue  = Σ commissioni × platformFeeRate
prize[rank]      = prizePool × prizeTable[rank].percentageOfPool
```

### Verifica equilibrio
```
Σ prize[rank]  ≤  prizePool          (il montepremi copre tutti i premi)
platformRevenue ≥ costiOperativi     (la piattaforma è sostenibile)
```

---

## Break-Even Piattaforma

Il numero minimo di operazioni `N_min` affinché la piattaforma raggiunga il break-even:

```
revenuePerOp  = avgOperationValue × avgCommissionRate × platformFeeRate
N_min         = costiOperativi / revenuePerOp
```

---

## Numero Medio di Operazioni per Stagione

```
totalOps = numTeams × operationsPerTeamPerRound × roundsPerSeason
```

---

## Valore Atteso Montepremi

```
E[prizePool] = numTeams × operationsPerTeamPerRound × avgOpValue
             × avgCommissionRate × prizePoolContributionRate
             × roundsPerSeason
```
