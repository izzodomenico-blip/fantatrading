# FantaTrading - Backtest Storico Full Rules V1

**Generato il:** 12/05/2026, 09:00:51
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
| VALUE | PLAYER_ZERO_TEAM_EXCLUDE | 6.92% | 6.61% | -0.32pp | 85.40% | 57.60% | 6.03% | 6.29 |
| VALUE | EXCLUDE | 6.55% | 6.14% | -0.41pp | 83.60% | 56.20% | 5.98% | 6.22 |
| LOW_COST | PLAYER_ZERO_TEAM_EXCLUDE | -1.74% | 0.45% | 2.19pp | 48.60% | 31.40% | -0.33% | 9.95 |
| LOW_COST | FIVE | -1.56% | 0.18% | 1.74pp | 48.80% | 31.00% | -0.53% | 10.00 |
| LOW_COST | EXCLUDE | -2.07% | 0.03% | 2.10pp | 47.80% | 27.20% | -0.43% | 8.73 |
| BALANCED | PLAYER_ZERO_TEAM_EXCLUDE | -5.74% | -2.25% | 3.49pp | 40.80% | 24.00% | -2.44% | 10.43 |
| RANDOM | EXCLUDE | -6.38% | -2.52% | 3.86pp | 40.40% | 23.00% | -2.50% | 10.43 |
| BALANCED | EXCLUDE | -6.24% | -2.78% | 3.46pp | 37.00% | 22.80% | -3.17% | 10.84 |
| RANDOM | PLAYER_ZERO_TEAM_EXCLUDE | -6.76% | -3.14% | 3.62pp | 39.00% | 21.40% | -3.49% | 10.09 |
| BALANCED | FIVE | -6.07% | -3.62% | 2.45pp | 35.40% | 18.80% | -4.48% | 10.22 |
| RANDOM | FIVE | -7.17% | -4.48% | 2.69pp | 32.20% | 15.80% | -4.78% | 9.98 |
| TOP_PLAYER | EXCLUDE | -13.23% | -7.48% | 5.75pp | 22.40% | 11.40% | -8.08% | 9.38 |
| TOP_PLAYER | PLAYER_ZERO_TEAM_EXCLUDE | -13.36% | -7.59% | 5.77pp | 22.80% | 9.40% | -7.90% | 9.52 |
| TOP_PLAYER | FIVE | -13.38% | -9.05% | 4.33pp | 16.80% | 7.40% | -9.28% | 9.26 |
| VALUE | ZERO | 6.43% | -38.05% | -44.48pp | 0.00% | 0.00% | -38.35% | 3.09 |
| TOP_PLAYER | PLAYER_MALUS_TEAM_EXCLUDE | -13.59% | -38.44% | -24.85pp | 0.00% | 0.00% | -38.85% | 8.92 |
| LOW_COST | PLAYER_MALUS_TEAM_EXCLUDE | -1.20% | -38.90% | -37.70pp | 0.00% | 0.00% | -39.04% | 10.05 |
| RANDOM | PLAYER_MALUS_TEAM_EXCLUDE | -6.97% | -39.32% | -32.35pp | 0.00% | 0.00% | -39.97% | 9.94 |
| BALANCED | PLAYER_MALUS_TEAM_EXCLUDE | -5.87% | -39.39% | -33.52pp | 0.00% | 0.00% | -40.21% | 10.13 |
| VALUE | PLAYER_MALUS_TEAM_EXCLUDE | 6.70% | -44.52% | -51.22pp | 0.00% | 0.00% | -44.42% | 7.44 |
| LOW_COST | ZERO | -1.61% | -46.95% | -45.34pp | 0.00% | 0.00% | -46.83% | 4.26 |
| BALANCED | ZERO | -6.19% | -50.56% | -44.37pp | 0.00% | 0.00% | -50.27% | 3.99 |
| RANDOM | ZERO | -6.46% | -50.83% | -44.38pp | 0.00% | 0.00% | -50.63% | 4.63 |
| TOP_PLAYER | ZERO | -14.01% | -55.08% | -41.07pp | 0.00% | 0.00% | -55.62% | 4.82 |

## Confronto NoVotePolicy

| Policy SV | ROI full-rules medio | % > 0 | % > 5 | % > 7 | % > 10 | SV derivati medi |
|-----------|----------------------|-------|-------|-------|--------|-----------------|
| ZERO | -48.29% | 0.00% | 0.00% | 0.00% | 0.00% | 400.9 |
| FIVE | -2.00% | 44.80% | 27.20% | 20.40% | 12.80% | 399.9 |
| EXCLUDE | -1.32% | 46.24% | 28.12% | 21.16% | 13.20% | 400.0 |
| PLAYER_ZERO_TEAM_EXCLUDE | -1.19% | 47.32% | 28.76% | 21.60% | 14.32% | 398.1 |
| PLAYER_MALUS_TEAM_EXCLUDE | -40.11% | 0.00% | 0.00% | 0.00% | 0.00% | 397.5 |

Le policy `PLAYER_ZERO_TEAM_EXCLUDE` e `PLAYER_MALUS_TEAM_EXCLUDE` separano correttamente effetto squadra ed effetto giocatore: lo SV non altera la media/fascia dei compagni, ma il singolo giocatore assente resta neutro oppure penalizzato.

## ROI Medio per Strategia

| Strategia | ROI medio | ROI mediano | Miglior ROI | Peggior ROI | Volatilita |
|-----------|-----------|-------------|-------------|-------------|------------|
| RANDOM | -20.06% | -20.28% | 32.90% | -65.41% | 9.01 |
| LOW_COST | -17.04% | -17.43% | 44.60% | -67.01% | 8.60 |
| TOP_PLAYER | -23.53% | -23.95% | 26.17% | -66.74% | 8.38 |
| BALANCED | -19.72% | -20.11% | 39.05% | -69.07% | 9.12 |
| VALUE | -12.57% | -12.85% | 31.02% | -71.73% | 5.72 |

## Dettaglio Completed

### 2023/24

| Strategia | Policy SV | ROI full-rules | Impatto voti | % > 0 | % > 5 | Best | Worst |
|-----------|-----------|----------------|-------------|-------|-------|------|-------|
| VALUE | FIVE | 7.21% | 0.06pp | 90.00% | 66.40% | 24.45% | -12.19% |
| VALUE | EXCLUDE | 6.55% | 0.24pp | 84.80% | 56.80% | 28.45% | -9.09% |
| VALUE | PLAYER_ZERO_TEAM_EXCLUDE | 6.38% | 0.18pp | 83.20% | 54.80% | 24.16% | -7.79% |
| LOW_COST | PLAYER_ZERO_TEAM_EXCLUDE | -1.12% | 2.25pp | 42.40% | 27.60% | 22.96% | -24.29% |
| LOW_COST | FIVE | -1.19% | 1.75pp | 45.20% | 29.20% | 24.36% | -26.46% |
| LOW_COST | EXCLUDE | -1.41% | 2.14pp | 41.60% | 20.40% | 22.47% | -27.28% |
| RANDOM | EXCLUDE | -2.06% | 4.17pp | 41.60% | 22.80% | 24.66% | -31.21% |
| BALANCED | PLAYER_ZERO_TEAM_EXCLUDE | -2.22% | 3.73pp | 42.00% | 25.60% | 23.23% | -27.40% |
| BALANCED | EXCLUDE | -3.51% | 3.43pp | 34.00% | 20.80% | 24.92% | -31.37% |
| RANDOM | PLAYER_ZERO_TEAM_EXCLUDE | -3.60% | 3.67pp | 36.40% | 20.00% | 27.24% | -26.55% |
| BALANCED | FIVE | -4.39% | 2.57pp | 32.40% | 15.20% | 21.17% | -29.20% |
| RANDOM | FIVE | -5.05% | 2.75pp | 31.20% | 10.40% | 19.60% | -32.80% |
| TOP_PLAYER | EXCLUDE | -6.56% | 6.00pp | 24.80% | 13.20% | 17.00% | -31.31% |
| TOP_PLAYER | PLAYER_ZERO_TEAM_EXCLUDE | -6.74% | 6.06pp | 26.40% | 10.80% | 18.92% | -33.01% |
| TOP_PLAYER | FIVE | -7.33% | 4.51pp | 21.20% | 8.40% | 14.42% | -27.92% |
| TOP_PLAYER | PLAYER_MALUS_TEAM_EXCLUDE | -38.04% | -25.01pp | 0.00% | 0.00% | -14.06% | -56.87% |
| LOW_COST | PLAYER_MALUS_TEAM_EXCLUDE | -38.60% | -36.76pp | 0.00% | 0.00% | -4.56% | -67.01% |
| RANDOM | PLAYER_MALUS_TEAM_EXCLUDE | -38.92% | -31.62pp | 0.00% | 0.00% | -10.43% | -61.27% |
| BALANCED | PLAYER_MALUS_TEAM_EXCLUDE | -39.11% | -32.86pp | 0.00% | 0.00% | -9.67% | -69.07% |
| VALUE | ZERO | -39.54% | -45.49pp | 0.00% | 0.00% | -30.51% | -46.78% |
| VALUE | PLAYER_MALUS_TEAM_EXCLUDE | -42.61% | -48.47pp | 0.00% | 0.00% | -17.98% | -64.40% |
| LOW_COST | ZERO | -47.55% | -45.09pp | 0.00% | 0.00% | -35.71% | -59.76% |
| RANDOM | ZERO | -51.26% | -44.54pp | 0.00% | 0.00% | -38.71% | -65.41% |
| BALANCED | ZERO | -51.35% | -44.51pp | 0.00% | 0.00% | -43.33% | -62.37% |
| TOP_PLAYER | ZERO | -54.51% | -41.50pp | 0.00% | 0.00% | -35.12% | -66.35% |

### 2024/25

| Strategia | Policy SV | ROI full-rules | Impatto voti | % > 0 | % > 5 | Best | Worst |
|-----------|-----------|----------------|-------------|-------|-------|------|-------|
| VALUE | PLAYER_ZERO_TEAM_EXCLUDE | 6.83% | -0.81pp | 87.60% | 60.40% | 31.02% | -7.26% |
| VALUE | FIVE | 6.71% | -0.70pp | 91.60% | 59.60% | 24.23% | -8.17% |
| VALUE | EXCLUDE | 5.74% | -1.06pp | 82.40% | 55.60% | 20.39% | -8.93% |
| LOW_COST | PLAYER_ZERO_TEAM_EXCLUDE | 2.01% | 2.13pp | 54.80% | 35.20% | 44.60% | -23.68% |
| LOW_COST | FIVE | 1.54% | 1.72pp | 52.40% | 32.80% | 35.80% | -22.45% |
| LOW_COST | EXCLUDE | 1.48% | 2.06pp | 54.00% | 34.00% | 34.35% | -25.06% |
| BALANCED | EXCLUDE | -2.06% | 3.49pp | 40.00% | 24.80% | 34.11% | -27.21% |
| BALANCED | PLAYER_ZERO_TEAM_EXCLUDE | -2.28% | 3.25pp | 39.60% | 22.40% | 39.05% | -31.98% |
| RANDOM | PLAYER_ZERO_TEAM_EXCLUDE | -2.67% | 3.57pp | 41.60% | 22.80% | 31.10% | -30.23% |
| BALANCED | FIVE | -2.86% | 2.33pp | 38.40% | 22.40% | 29.17% | -32.00% |
| RANDOM | EXCLUDE | -2.98% | 3.56pp | 39.20% | 23.20% | 25.22% | -30.34% |
| RANDOM | FIVE | -3.91% | 2.63pp | 33.20% | 21.20% | 32.90% | -27.97% |
| TOP_PLAYER | EXCLUDE | -8.41% | 5.50pp | 20.00% | 9.60% | 17.44% | -33.80% |
| TOP_PLAYER | PLAYER_ZERO_TEAM_EXCLUDE | -8.44% | 5.47pp | 19.20% | 8.00% | 26.17% | -34.95% |
| TOP_PLAYER | FIVE | -10.77% | 4.16pp | 12.40% | 6.40% | 17.82% | -41.89% |
| VALUE | ZERO | -36.56% | -43.47pp | 0.00% | 0.00% | -25.71% | -44.79% |
| TOP_PLAYER | PLAYER_MALUS_TEAM_EXCLUDE | -38.84% | -24.69pp | 0.00% | 0.00% | -14.37% | -66.74% |
| LOW_COST | PLAYER_MALUS_TEAM_EXCLUDE | -39.19% | -38.64pp | 0.00% | 0.00% | -4.27% | -60.34% |
| BALANCED | PLAYER_MALUS_TEAM_EXCLUDE | -39.68% | -34.19pp | 0.00% | 0.00% | -10.40% | -65.69% |
| RANDOM | PLAYER_MALUS_TEAM_EXCLUDE | -39.71% | -33.07pp | 0.00% | 0.00% | -3.98% | -62.60% |
| LOW_COST | ZERO | -46.34% | -45.59pp | 0.00% | 0.00% | -34.17% | -57.84% |
| VALUE | PLAYER_MALUS_TEAM_EXCLUDE | -46.43% | -53.98pp | 0.00% | 0.00% | -24.79% | -71.73% |
| BALANCED | ZERO | -49.77% | -44.22pp | 0.00% | 0.00% | -39.29% | -60.00% |
| RANDOM | ZERO | -50.41% | -44.21pp | 0.00% | 0.00% | -36.40% | -64.67% |
| TOP_PLAYER | ZERO | -55.65% | -40.64pp | 0.00% | 0.00% | -38.62% | -65.52% |

## Sezione In Progress

La stagione 2025/26 e riportata separatamente e non entra negli aggregati completed o nelle raccomandazioni definitive.

| Stagione | Strategia | Policy SV | ROI full-rules | % > 0 | % > 5 |
|----------|-----------|-----------|----------------|-------|-------|
| 2025/26 | VALUE | EXCLUDE | 6.95% | 83.60% | 59.20% |
| 2025/26 | VALUE | FIVE | 5.67% | 79.20% | 53.60% |
| 2025/26 | VALUE | PLAYER_ZERO_TEAM_EXCLUDE | 5.16% | 77.60% | 50.80% |
| 2025/26 | LOW_COST | PLAYER_ZERO_TEAM_EXCLUDE | -0.69% | 52.80% | 26.00% |
| 2025/26 | LOW_COST | EXCLUDE | -1.08% | 47.20% | 22.40% |
| 2025/26 | LOW_COST | FIVE | -1.64% | 46.40% | 23.20% |
| 2025/26 | BALANCED | PLAYER_ZERO_TEAM_EXCLUDE | -4.36% | 33.20% | 18.40% |
| 2025/26 | BALANCED | EXCLUDE | -4.56% | 29.60% | 16.40% |
| 2025/26 | BALANCED | FIVE | -4.92% | 29.60% | 14.80% |
| 2025/26 | RANDOM | EXCLUDE | -5.92% | 29.20% | 12.80% |
| 2025/26 | RANDOM | FIVE | -5.94% | 23.60% | 10.80% |
| 2025/26 | RANDOM | PLAYER_ZERO_TEAM_EXCLUDE | -6.96% | 25.20% | 12.00% |
| 2025/26 | TOP_PLAYER | PLAYER_ZERO_TEAM_EXCLUDE | -10.33% | 14.00% | 6.80% |
| 2025/26 | TOP_PLAYER | FIVE | -11.43% | 11.60% | 5.60% |
| 2025/26 | TOP_PLAYER | EXCLUDE | -12.22% | 10.80% | 4.80% |
| 2025/26 | VALUE | ZERO | -37.97% | 0.00% | 0.00% |
| 2025/26 | RANDOM | PLAYER_MALUS_TEAM_EXCLUDE | -40.32% | 0.00% | 0.00% |
| 2025/26 | BALANCED | PLAYER_MALUS_TEAM_EXCLUDE | -40.39% | 0.00% | 0.00% |
| 2025/26 | LOW_COST | PLAYER_MALUS_TEAM_EXCLUDE | -40.55% | 0.00% | 0.00% |
| 2025/26 | VALUE | PLAYER_MALUS_TEAM_EXCLUDE | -40.75% | 0.00% | 0.00% |
| 2025/26 | TOP_PLAYER | PLAYER_MALUS_TEAM_EXCLUDE | -40.78% | 0.00% | 0.00% |
| 2025/26 | LOW_COST | ZERO | -45.96% | 0.00% | 0.00% |
| 2025/26 | BALANCED | ZERO | -49.45% | 0.00% | 0.00% |
| 2025/26 | RANDOM | ZERO | -49.51% | 0.00% | 0.00% |
| 2025/26 | TOP_PLAYER | ZERO | -54.62% | 0.00% | 0.00% |

## Lettura Strategica

La strategia piu forte dopo l aggiunta dei voti e **VALUE** sugli aggregati completed. VALUE resta competitiva rispetto a RANDOM: delta medio VALUE-RANDOM pari a 7.49 punti percentuali sulle policy SV.

L impatto della componente voti e misurato come differenza tra ROI full-rules e ROI trading-only sullo stesso portafoglio. Questo isola il contributo fantasy da selezione rosa e rendimento quotazioni.

## Limiti del Modello

- Mancano quotazioni giornata per giornata: il modello applica i voti lungo la stagione, ma la componente quotazione resta Qt.I -> Qt.A.
- Non simula compravendite intra-stagione, liquidita, vincoli di mercato o decisioni reattive dopo infortuni/squalifiche.
- I giocatori quotati senza voti sono esclusi dalla generazione iniziale delle rose: scelta conservativa per non introdurre rischio SV artificiale.
- I giocatori nei voti senza quotazione sono esclusi perche non hanno base economica Qt.I/Qt.A.
- Gli SV sono derivati per assenza nel round, coerentemente con la struttura dei file voti.

## Raccomandazioni

Policy SV piu coerente ed equilibrata preliminare: **PLAYER_ZERO_TEAM_EXCLUDE**. Le policy team-exclude sono le piu corrette perche non distruggono la fascia squadra per colpa degli SV. Con malus individuale default -5% giornaliero, PLAYER_MALUS_TEAM_EXCLUDE risulta troppo severa in questo stress test; va ritarata a un malus molto piu basso oppure usata solo se il regolamento ufficiale conferma una penalita individuale esplicita. PLAYER_ZERO_TEAM_EXCLUDE e la variante piu neutra e stabile quando la penalita SV non e ancora ufficiale.
Soglia premio preliminare consigliata: **7%**. La scelta tra 5%, 7% e 10% va finalizzata dopo test con quotazioni giornata per giornata: con dati solo Qt.I/Qt.A la soglia 5% e piu inclusiva, 10% piu selettiva e prudente per la sostenibilita.
