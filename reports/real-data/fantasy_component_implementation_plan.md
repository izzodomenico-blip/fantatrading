# FantaTrading - Piano Implementazione Componente Fantacalcistica

## Obiettivo

Integrare voti reali giornata per giornata nel motore FantaTrading completo.

Il backtest attuale misura solo la componente trading su quotazioni. Il motore completo dovra combinare:

1. variazione quotazione;
2. bonus/malus derivato dai voti reali;
3. commissioni acquisto/vendita;
4. ranking e premi.

## Moduli predisposti

| File | Responsabilita |
|------|----------------|
| `src/importers/realVotesImporter.ts` | Parsing CSV voti reali |
| `src/importers/realVotesValidator.ts` | Validazione colonne, ruoli, round e voti |
| `src/analysis/realVotesAnalysis.ts` | Report qualita dataset voti |
| `src/config/teamBandBonusTables.ts` | Struttura tabella fasce/bonus |
| `src/engine/teamVoteBandEngine.ts` | Somma voti rosa e fascia squadra |
| `src/engine/fantaTradingBonusTableEngine.ts` | Lookup bonus/malus per fascia e voto |

## Flusso futuro del backtest completo

1. Importare voti reali.
2. Importare quotazioni giornata per giornata, se disponibili.
3. Costruire una rosa valida da 25 giocatori.
4. Per ogni giornata:
   - recuperare i voti dei 25 giocatori;
   - sommare i voti;
   - calcolare media e fascia squadra;
   - applicare bonus/malus individuale a ogni giocatore;
   - aggiornare valore giocatore combinando quotazione e bonus/malus voto.
5. Calcolare valore finale rosa, ROI, ranking e premi.

## Assunzioni attuali

- Una rosa deve contenere sempre 25 giocatori.
- Un giocatore con `played=false` contribuisce 0 alla somma voti finche non viene definita una regola ufficiale diversa.
- Le fasce squadra attuali sono:
  - `FASCIA_0`: media < 5
  - `FASCIA_1`: media >= 5 e < 5.5
  - `FASCIA_2`: media >= 5.5 e < 6
  - `FASCIA_3`: media >= 6 e < 6.5
  - `FASCIA_4`: media >= 6.5
- La tabella bonus/malus inclusa nel codice e provvisoria e deve essere sostituita con la tabella ufficiale.

## Non implementato in questa fase

- Nessun `historicalFullRulesBacktest.ts`.
- Nessun dato voto inventato.
- Nessuna simulazione decisionale con voti mock.
- Nessuna modifica alla dashboard React.

## Prossimo passo

Caricare CSV reali in `data/real/raw/votes/`, eseguire:

```bash
npm.cmd run import:real-votes
npm.cmd run analyze:real-votes
```

Poi sostituire la tabella provvisoria con la tabella ufficiale del regolamento prima di creare il backtest storico completo.
