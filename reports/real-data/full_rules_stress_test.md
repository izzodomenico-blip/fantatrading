# FantaTrading - Full Rules Stress Test

**Generato il:** 12/05/2026, 09:13:26
**Completed usate:** 2023/24, 2024/25
**In progress separata:** 2025/26
**Policy principali:** PLAYER_ZERO_TEAM_EXCLUDE, EXCLUDE, FIVE
**Policy in appendice:** ZERO, PLAYER_MALUS_TEAM_EXCLUDE

## Raccomandazione V1

- NoVotePolicy: **PLAYER_ZERO_TEAM_EXCLUDE**
- Soglia premio: **7%**
- Commissione vendita: **2.00%**
- Platform fee sulle commissioni: **10.00%**
- Attrattivita utenti: **MEDIUM**
- Sostenibilita piattaforma: **LOW**
- Rischio dominanza VALUE: **MEDIUM**

## Top combinazioni principali

| # | Policy | Soglia | Platform fee | Sell fee | ROI medio | % > soglia | Vincitori stimati | Ricavo piattaforma | VALUE delta vs RANDOM | Sostenibilita | Attrattivita | Rischio VALUE |
|---|--------|--------|--------------|----------|-----------|------------|-------------------|--------------------|-----------------------|---------------|-------------|---------------|
| 1 | PLAYER_ZERO_TEAM_EXCLUDE | 7% | 15.00% | 3.00% | -3.19% | 16.16% | 40.4 | 0.85 | 8.09pp | LOW | MEDIUM | LOW |
| 2 | EXCLUDE | 7% | 15.00% | 3.00% | -3.47% | 15.96% | 39.9 | 0.85 | 9.60pp | LOW | MEDIUM | LOW |
| 3 | PLAYER_ZERO_TEAM_EXCLUDE | 7% | 10.00% | 3.00% | -3.19% | 16.16% | 40.4 | 0.57 | 8.09pp | LOW | MEDIUM | LOW |
| 4 | PLAYER_ZERO_TEAM_EXCLUDE | 10% | 15.00% | 1.25% | -1.45% | 12.88% | 32.2 | 0.35 | 8.24pp | LOW | MEDIUM | LOW |
| 5 | EXCLUDE | 10% | 15.00% | 1.25% | -1.72% | 13.24% | 33.1 | 0.36 | 9.77pp | LOW | MEDIUM | LOW |
| 6 | PLAYER_ZERO_TEAM_EXCLUDE | 10% | 10.00% | 1.25% | -1.45% | 12.88% | 32.2 | 0.24 | 8.24pp | LOW | MEDIUM | LOW |
| 7 | EXCLUDE | 7% | 10.00% | 3.00% | -3.47% | 15.96% | 39.9 | 0.57 | 9.60pp | LOW | MEDIUM | LOW |
| 8 | EXCLUDE | 10% | 10.00% | 1.25% | -1.72% | 13.24% | 33.1 | 0.24 | 9.77pp | LOW | MEDIUM | LOW |
| 9 | PLAYER_ZERO_TEAM_EXCLUDE | 10% | 5.00% | 1.25% | -1.45% | 12.88% | 32.2 | 0.12 | 8.24pp | LOW | MEDIUM | LOW |
| 10 | PLAYER_ZERO_TEAM_EXCLUDE | 7% | 5.00% | 3.00% | -3.19% | 16.16% | 40.4 | 0.28 | 8.09pp | LOW | MEDIUM | LOW |
| 11 | EXCLUDE | 10% | 5.00% | 1.25% | -1.72% | 13.24% | 33.1 | 0.12 | 9.77pp | LOW | MEDIUM | LOW |
| 12 | FIVE | 10% | 15.00% | 1.25% | -1.98% | 12.76% | 31.9 | 0.35 | 10.55pp | LOW | MEDIUM | LOW |
| 13 | PLAYER_ZERO_TEAM_EXCLUDE | 10% | 0.00% | 1.25% | -1.45% | 12.88% | 32.2 | 0.00 | 8.24pp | LOW | MEDIUM | LOW |
| 14 | EXCLUDE | 10% | 0.00% | 1.25% | -1.72% | 13.24% | 33.1 | 0.00 | 9.77pp | LOW | MEDIUM | LOW |
| 15 | EXCLUDE | 7% | 5.00% | 3.00% | -3.47% | 15.96% | 39.9 | 0.28 | 9.60pp | LOW | MEDIUM | LOW |
| 16 | FIVE | 10% | 10.00% | 1.25% | -1.98% | 12.76% | 31.9 | 0.24 | 10.55pp | LOW | MEDIUM | LOW |
| 17 | PLAYER_ZERO_TEAM_EXCLUDE | 7% | 0.00% | 3.00% | -3.19% | 16.16% | 40.4 | 0.00 | 8.09pp | LOW | MEDIUM | LOW |
| 18 | FIVE | 10% | 5.00% | 1.25% | -1.98% | 12.76% | 31.9 | 0.12 | 10.55pp | LOW | MEDIUM | LOW |
| 19 | PLAYER_ZERO_TEAM_EXCLUDE | 5% | 15.00% | 1.25% | -1.45% | 27.36% | 68.4 | 0.35 | 8.24pp | LOW | HIGH | MEDIUM |
| 20 | FIVE | 10% | 0.00% | 1.25% | -1.98% | 12.76% | 31.9 | 0.00 | 10.55pp | LOW | MEDIUM | LOW |

## Confronto policy principali

| Policy | ROI medio | % > 0 | % > 5 | % > 7 | % > 10 | VALUE ROI | VALUE delta vs RANDOM |
|--------|-----------|-------|-------|-------|--------|-----------|-----------------------|
| PLAYER_ZERO_TEAM_EXCLUDE | -2.28% | 42.25% | 24.43% | 18.60% | 10.91% | 4.83% | 8.17pp |
| EXCLUDE | -2.55% | 41.49% | 25.04% | 18.95% | 11.51% | 5.47% | 9.69pp |
| FIVE | -2.80% | 41.31% | 24.93% | 18.89% | 10.49% | 5.69% | 10.46pp |

## Valutazioni

Il modello Originale + 10% margine resta fragile se applicato senza aggiustamenti, ma migliora con commissione vendita al 2% e soglia premio al 7%.
VALUE resta la strategia piu forte o tra le piu forti: il rischio osservato e **LOW**. Non va bloccata, ma va monitorata con quotazioni giornata per giornata per capire se il vantaggio deriva da informazione ex-post Qt.I/Qt.A.

## Proposta Regolamento FantaTrading V1

- Rosa: 25 giocatori, 3 P, 8 D, 8 C, 6 A.
- Acquisto: commissione 2%.
- Vendita: commissione consigliata 2.00%.
- Platform fee consigliata: 10.00% delle commissioni.
- Premio: soglia ROI consigliata 7%.
- SV: PLAYER_ZERO_TEAM_EXCLUDE, cioe assente escluso dalla media squadra e neutro sul singolo finche non esiste una regola ufficiale diversa.
- Fasce squadra e bonus/malus: tabella ufficiale gia configurata.

## Appendice policy severe

| Policy | ROI medio | % > 0 | % > 5 | % > 10 | Nota |
|--------|-----------|-------|-------|--------|------|
| ZERO | -48.73% | 0.00% | 0.00% | 0.00% | Troppo severa per report principale |
| PLAYER_MALUS_TEAM_EXCLUDE | -41.29% | 0.00% | 0.00% | 0.00% | Troppo severa per report principale |

## In Progress

La stagione 2025/26 resta separata e non entra nelle raccomandazioni definitive.

## Limiti

- Mancano quotazioni giornata per giornata: la componente trading resta Qt.I -> Qt.A.
- Non vengono simulate compravendite intra-stagione.
- La dominanza VALUE potrebbe cambiare con prezzi dinamici e vincoli di liquidita.
- Gli SV sono derivati da assenza nel file voti, coerentemente con i dati disponibili.
