# Scenari di Business

Definizione degli scenari da simulare per validare la sostenibilità economica.

---

## Scenario 1: Lega Piccola (Baseline)
- **Squadre:** 8
- **Operazioni medie per squadra per giornata:** 2
- **Commissione acquisto/vendita:** 10%
- **Split montepremi/piattaforma:** 80%/20%
- **Durata stagione:** 38 giornate
- **Obiettivo:** verificare che il montepremi sia adeguato con partecipazione minima.

## Scenario 2: Lega Media
- **Squadre:** 16
- **Operazioni medie per squadra per giornata:** 3
- **Commissione acquisto/vendita:** 10%
- **Split montepremi/piattaforma:** 80%/20%
- **Obiettivo:** scenario tipico di utilizzo.

## Scenario 3: Lega Grande
- **Squadre:** 32
- **Operazioni medie per squadra per giornata:** 5
- **Commissione acquisto/vendita:** 8%
- **Split montepremi/piattaforma:** 85%/15%
- **Obiettivo:** verificare che commissioni ridotte siano compensate dal volume.

## Scenario 4: Partecipazione Bassa (Stress Test)
- **Squadre:** 8
- **Operazioni medie per squadra per giornata:** 0.5
- **Obiettivo:** worst case — pochissime operazioni, montepremi minimo.

## Scenario 5: Trader Attivo vs Passivo
- **Setup:** una squadra fa 10x le operazioni della media.
- **Obiettivo:** misurare quanto le commissioni penalizzano il trader iperattivo.

## Scenario 6: Commissioni Elevate
- **Commissione acquisto/vendita:** 15%
- **Obiettivo:** verificare se il gioco rimane attraente con commissioni alte.

## Scenario 7: Commissioni Basse
- **Commissione acquisto/vendita:** 5%
- **Obiettivo:** verificare se la piattaforma è sostenibile con commissioni ridotte.

---

## Metriche di Valutazione per Scenario

Per ogni scenario si calcolano:

| Metrica | Descrizione |
|---------|-------------|
| `totalPrizePool` | Montepremi totale accumulato |
| `platformRevenue` | Ricavi piattaforma |
| `avgNetROI` | ROI netto medio dei partecipanti |
| `winnerROI` | ROI del vincitore (1° posto) |
| `loserROI` | ROI del peggior classificato |
| `breakEvenOps` | Operazioni minime per coprire i costi fissi |
| `prizeToFeeRatio` | Premio 1° posto / quota iscrizione |
