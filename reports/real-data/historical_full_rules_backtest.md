# FantaTrading - Backtest Storico Full Rules V1

**Generato il:** 12/05/2026, 08:40:59
**Modello:** FULL_RULES_V1
**Stagioni completed:** 2023/24, 2024/25
**Stagioni in_progress:** 2025/26
**Simulazioni per strategia/stagione/policy:** 250

## Pool Dati

| Stagione | Stato | Matched quote+voti | Solo quotazioni | Solo voti | Scelta modello |
|----------|-------|--------------------|-----------------|-----------|----------------|
| 2023/24 | completed | 512 | 27 | 75 | Le rose iniziali usano solo giocatori matched; i quotati senza voti sono esclusi dalla generazione per evitare SV strutturali non informativi. |
| 2024/25 | completed | 524 | 36 | 74 | Le rose iniziali usano solo giocatori matched; i quotati senza voti sono esclusi dalla generazione per evitare SV strutturali non informativi. |
| 2025/26 | in_progress | 497 | 34 | 68 | Le rose iniziali usano solo giocatori matched; i quotati senza voti sono esclusi dalla generazione per evitare SV strutturali non informativi. |

## Confronto Trading-Only vs Full-Rules

| Strategia | Policy SV | ROI trading-only | ROI full-rules | Impatto voti | % > 0 | % > 5 | ROI mediano | Volatilita |
|-----------|-----------|------------------|----------------|-------------|-------|-------|-------------|------------|
| VALUE | FIVE | 7.28% | 6.96% | -0.32pp | 90.80% | 63.00% | 6.49% | 5.56 |
| VALUE | EXCLUDE | 6.55% | 6.14% | -0.41pp | 83.60% | 56.20% | 5.98% | 6.22 |
| LOW_COST | FIVE | -1.56% | 0.18% | 1.74pp | 48.80% | 31.00% | -0.53% | 10.00 |
| LOW_COST | EXCLUDE | -2.07% | 0.03% | 2.10pp | 47.80% | 27.20% | -0.43% | 8.73 |
| RANDOM | EXCLUDE | -6.38% | -2.52% | 3.86pp | 40.40% | 23.00% | -2.50% | 10.43 |
| BALANCED | EXCLUDE | -6.24% | -2.78% | 3.46pp | 37.00% | 22.80% | -3.17% | 10.84 |
| BALANCED | FIVE | -6.07% | -3.62% | 2.45pp | 35.40% | 18.80% | -4.48% | 10.22 |
| RANDOM | FIVE | -7.17% | -4.48% | 2.69pp | 32.20% | 15.80% | -4.78% | 9.98 |
| TOP_PLAYER | EXCLUDE | -13.23% | -7.48% | 5.75pp | 22.40% | 11.40% | -8.08% | 9.38 |
| TOP_PLAYER | FIVE | -13.38% | -9.05% | 4.33pp | 16.80% | 7.40% | -9.28% | 9.26 |
| VALUE | ZERO | 6.43% | -38.05% | -44.48pp | 0.00% | 0.00% | -38.35% | 3.09 |
| LOW_COST | ZERO | -1.61% | -46.95% | -45.34pp | 0.00% | 0.00% | -46.83% | 4.26 |
| BALANCED | ZERO | -6.19% | -50.56% | -44.37pp | 0.00% | 0.00% | -50.27% | 3.99 |
| RANDOM | ZERO | -6.46% | -50.83% | -44.38pp | 0.00% | 0.00% | -50.63% | 4.63 |
| TOP_PLAYER | ZERO | -14.01% | -55.08% | -41.07pp | 0.00% | 0.00% | -55.62% | 4.82 |
| VALUE | FIXED_MALUS | 6.92% | -71.49% | -78.41pp | 0.00% | 0.00% | -71.61% | 2.38 |
| LOW_COST | FIXED_MALUS | -1.74% | -71.92% | -70.18pp | 0.00% | 0.00% | -72.21% | 3.39 |
| TOP_PLAYER | FIXED_MALUS | -13.36% | -71.93% | -58.57pp | 0.00% | 0.00% | -72.36% | 4.18 |
| BALANCED | FIXED_MALUS | -5.74% | -72.25% | -66.51pp | 0.00% | 0.00% | -72.32% | 3.44 |
| RANDOM | FIXED_MALUS | -6.76% | -72.57% | -65.81pp | 0.00% | 0.00% | -72.54% | 3.24 |

## Confronto NoVotePolicy

| Policy SV | ROI full-rules medio | % > 0 | % > 5 | % > 7 | % > 10 | SV derivati medi |
|-----------|----------------------|-------|-------|-------|--------|-----------------|
| ZERO | -48.29% | 0.00% | 0.00% | 0.00% | 0.00% | 400.9 |
| FIVE | -2.00% | 44.80% | 27.20% | 20.40% | 12.80% | 399.9 |
| EXCLUDE | -1.32% | 46.24% | 28.12% | 21.16% | 13.20% | 400.0 |
| FIXED_MALUS | -72.03% | 0.00% | 0.00% | 0.00% | 0.00% | 398.1 |

## ROI Medio per Strategia

| Strategia | ROI medio | ROI mediano | Miglior ROI | Peggior ROI | Volatilita |
|-----------|-----------|-------------|-------------|-------------|------------|
| RANDOM | -32.60% | -32.61% | 32.90% | -81.21% | 7.07 |
| LOW_COST | -29.66% | -30.00% | 35.80% | -80.97% | 6.60 |
| TOP_PLAYER | -35.89% | -36.34% | 17.82% | -83.32% | 6.91 |
| BALANCED | -32.31% | -32.56% | 34.11% | -83.13% | 7.12 |
| VALUE | -24.11% | -24.37% | 28.45% | -76.50% | 4.31 |

## Dettaglio Completed

### 2023/24

| Strategia | Policy SV | ROI full-rules | Impatto voti | % > 0 | % > 5 | Best | Worst |
|-----------|-----------|----------------|-------------|-------|-------|------|-------|
| VALUE | FIVE | 7.21% | 0.06pp | 90.00% | 66.40% | 24.45% | -12.19% |
| VALUE | EXCLUDE | 6.55% | 0.24pp | 84.80% | 56.80% | 28.45% | -9.09% |
| LOW_COST | FIVE | -1.19% | 1.75pp | 45.20% | 29.20% | 24.36% | -26.46% |
| LOW_COST | EXCLUDE | -1.41% | 2.14pp | 41.60% | 20.40% | 22.47% | -27.28% |
| RANDOM | EXCLUDE | -2.06% | 4.17pp | 41.60% | 22.80% | 24.66% | -31.21% |
| BALANCED | EXCLUDE | -3.51% | 3.43pp | 34.00% | 20.80% | 24.92% | -31.37% |
| BALANCED | FIVE | -4.39% | 2.57pp | 32.40% | 15.20% | 21.17% | -29.20% |
| RANDOM | FIVE | -5.05% | 2.75pp | 31.20% | 10.40% | 19.60% | -32.80% |
| TOP_PLAYER | EXCLUDE | -6.56% | 6.00pp | 24.80% | 13.20% | 17.00% | -31.31% |
| TOP_PLAYER | FIVE | -7.33% | 4.51pp | 21.20% | 8.40% | 14.42% | -27.92% |
| VALUE | ZERO | -39.54% | -45.49pp | 0.00% | 0.00% | -30.51% | -46.78% |
| LOW_COST | ZERO | -47.55% | -45.09pp | 0.00% | 0.00% | -35.71% | -59.76% |
| RANDOM | ZERO | -51.26% | -44.54pp | 0.00% | 0.00% | -38.71% | -65.41% |
| BALANCED | ZERO | -51.35% | -44.51pp | 0.00% | 0.00% | -43.33% | -62.37% |
| TOP_PLAYER | ZERO | -54.51% | -41.50pp | 0.00% | 0.00% | -35.12% | -66.35% |
| VALUE | FIXED_MALUS | -71.13% | -77.33pp | 0.00% | 0.00% | -63.35% | -76.17% |
| TOP_PLAYER | FIXED_MALUS | -71.21% | -58.42pp | 0.00% | 0.00% | -52.25% | -79.44% |
| BALANCED | FIXED_MALUS | -72.08% | -66.13pp | 0.00% | 0.00% | -62.21% | -80.72% |
| LOW_COST | FIXED_MALUS | -72.22% | -68.86pp | 0.00% | 0.00% | -63.27% | -79.70% |
| RANDOM | FIXED_MALUS | -72.55% | -65.28pp | 0.00% | 0.00% | -63.11% | -80.33% |

### 2024/25

| Strategia | Policy SV | ROI full-rules | Impatto voti | % > 0 | % > 5 | Best | Worst |
|-----------|-----------|----------------|-------------|-------|-------|------|-------|
| VALUE | FIVE | 6.71% | -0.70pp | 91.60% | 59.60% | 24.23% | -8.17% |
| VALUE | EXCLUDE | 5.74% | -1.06pp | 82.40% | 55.60% | 20.39% | -8.93% |
| LOW_COST | FIVE | 1.54% | 1.72pp | 52.40% | 32.80% | 35.80% | -22.45% |
| LOW_COST | EXCLUDE | 1.48% | 2.06pp | 54.00% | 34.00% | 34.35% | -25.06% |
| BALANCED | EXCLUDE | -2.06% | 3.49pp | 40.00% | 24.80% | 34.11% | -27.21% |
| BALANCED | FIVE | -2.86% | 2.33pp | 38.40% | 22.40% | 29.17% | -32.00% |
| RANDOM | EXCLUDE | -2.98% | 3.56pp | 39.20% | 23.20% | 25.22% | -30.34% |
| RANDOM | FIVE | -3.91% | 2.63pp | 33.20% | 21.20% | 32.90% | -27.97% |
| TOP_PLAYER | EXCLUDE | -8.41% | 5.50pp | 20.00% | 9.60% | 17.44% | -33.80% |
| TOP_PLAYER | FIVE | -10.77% | 4.16pp | 12.40% | 6.40% | 17.82% | -41.89% |
| VALUE | ZERO | -36.56% | -43.47pp | 0.00% | 0.00% | -25.71% | -44.79% |
| LOW_COST | ZERO | -46.34% | -45.59pp | 0.00% | 0.00% | -34.17% | -57.84% |
| BALANCED | ZERO | -49.77% | -44.22pp | 0.00% | 0.00% | -39.29% | -60.00% |
| RANDOM | ZERO | -50.41% | -44.21pp | 0.00% | 0.00% | -36.40% | -64.67% |
| TOP_PLAYER | ZERO | -55.65% | -40.64pp | 0.00% | 0.00% | -38.62% | -65.52% |
| LOW_COST | FIXED_MALUS | -71.62% | -71.50pp | 0.00% | 0.00% | -58.94% | -80.97% |
| VALUE | FIXED_MALUS | -71.85% | -79.50pp | 0.00% | 0.00% | -63.32% | -76.50% |
| BALANCED | FIXED_MALUS | -72.43% | -66.90pp | 0.00% | 0.00% | -55.75% | -83.13% |
| RANDOM | FIXED_MALUS | -72.59% | -66.35pp | 0.00% | 0.00% | -61.83% | -81.21% |
| TOP_PLAYER | FIXED_MALUS | -72.64% | -58.72pp | 0.00% | 0.00% | -51.45% | -83.32% |

## Sezione In Progress

La stagione 2025/26 e riportata separatamente e non entra negli aggregati completed o nelle raccomandazioni definitive.

| Stagione | Strategia | Policy SV | ROI full-rules | % > 0 | % > 5 |
|----------|-----------|-----------|----------------|-------|-------|
| 2025/26 | VALUE | EXCLUDE | 6.95% | 83.60% | 59.20% |
| 2025/26 | VALUE | FIVE | 5.67% | 79.20% | 53.60% |
| 2025/26 | LOW_COST | EXCLUDE | -1.08% | 47.20% | 22.40% |
| 2025/26 | LOW_COST | FIVE | -1.64% | 46.40% | 23.20% |
| 2025/26 | BALANCED | EXCLUDE | -4.56% | 29.60% | 16.40% |
| 2025/26 | BALANCED | FIVE | -4.92% | 29.60% | 14.80% |
| 2025/26 | RANDOM | EXCLUDE | -5.92% | 29.20% | 12.80% |
| 2025/26 | RANDOM | FIVE | -5.94% | 23.60% | 10.80% |
| 2025/26 | TOP_PLAYER | FIVE | -11.43% | 11.60% | 5.60% |
| 2025/26 | TOP_PLAYER | EXCLUDE | -12.22% | 10.80% | 4.80% |
| 2025/26 | VALUE | ZERO | -37.97% | 0.00% | 0.00% |
| 2025/26 | LOW_COST | ZERO | -45.96% | 0.00% | 0.00% |
| 2025/26 | BALANCED | ZERO | -49.45% | 0.00% | 0.00% |
| 2025/26 | RANDOM | ZERO | -49.51% | 0.00% | 0.00% |
| 2025/26 | TOP_PLAYER | ZERO | -54.62% | 0.00% | 0.00% |
| 2025/26 | VALUE | FIXED_MALUS | -69.48% | 0.00% | 0.00% |
| 2025/26 | LOW_COST | FIXED_MALUS | -70.14% | 0.00% | 0.00% |
| 2025/26 | BALANCED | FIXED_MALUS | -71.00% | 0.00% | 0.00% |
| 2025/26 | TOP_PLAYER | FIXED_MALUS | -71.45% | 0.00% | 0.00% |
| 2025/26 | RANDOM | FIXED_MALUS | -71.54% | 0.00% | 0.00% |

## Lettura Strategica

La strategia piu forte dopo l aggiunta dei voti e **VALUE** sugli aggregati completed. VALUE resta competitiva rispetto a RANDOM: delta medio VALUE-RANDOM pari a 8.49 punti percentuali sulle policy SV.

L impatto della componente voti e misurato come differenza tra ROI full-rules e ROI trading-only sullo stesso portafoglio. Questo isola il contributo fantasy da selezione rosa e rendimento quotazioni.

## Limiti del Modello

- Mancano quotazioni giornata per giornata: il modello applica i voti lungo la stagione, ma la componente quotazione resta Qt.I -> Qt.A.
- Non simula compravendite intra-stagione, liquidita, vincoli di mercato o decisioni reattive dopo infortuni/squalifiche.
- I giocatori quotati senza voti sono esclusi dalla generazione iniziale delle rose: scelta conservativa per non introdurre rischio SV artificiale.
- I giocatori nei voti senza quotazione sono esclusi perche non hanno base economica Qt.I/Qt.A.
- Gli SV sono derivati per assenza nel round, coerentemente con la struttura dei file voti.

## Raccomandazioni

Policy SV piu equilibrata preliminare: **EXCLUDE**. EXCLUDE e spesso la policy piu neutra sulla media squadra, mentre FIXED_MALUS e utile se si vuole penalizzare esplicitamente l assenza voto senza schiacciare tutta la fascia squadra.
Soglia premio preliminare consigliata: **7%**. La scelta tra 5%, 7% e 10% va finalizzata dopo test con quotazioni giornata per giornata: con dati solo Qt.I/Qt.A la soglia 5% e piu inclusiva, 10% piu selettiva e prudente per la sostenibilita.
