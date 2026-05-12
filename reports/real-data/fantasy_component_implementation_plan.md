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
| `src/config/teamBandBonusTables.ts` | Tabella bonus/malus FantaTrading ufficiale (`isOfficial=true`, `source=Regolamento FantaTrading originale`) |
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
- La gestione SV resta configurabile tramite `NoVotePolicy` e non e ancora dichiarata ufficiale.
- Le fasce squadra attuali sono:
  - `FASCIA_0`: media < 5
  - `FASCIA_1`: media >= 5 e < 5.5
  - `FASCIA_2`: media >= 5.5 e < 6
  - `FASCIA_3`: media >= 6 e < 6.5
  - `FASCIA_4`: media >= 6.5
- La tabella bonus/malus FantaTrading ufficiale e gia stata inserita in `src/config/teamBandBonusTables.ts`.
- La configurazione della tabella bonus/malus dichiara `isOfficial=true` e `source=Regolamento FantaTrading originale`.

## Non implementato in questa fase

- Nessun `historicalFullRulesBacktest.ts`.
- Nessun backtest completo con regole FantaTrading, perche mancano i dati reali dei voti giornata per giornata.
- Nessun dato voto inventato.
- Nessuna simulazione decisionale con voti mock.
- Nessuna modifica alla dashboard React.

## Prossimo passo

Caricare CSV reali in `data/real/raw/votes/`, eseguire:

```bash
npm.cmd run import:real-votes
npm.cmd run analyze:real-votes
```

Poi creare il backtest storico completo usando voti reali giornata per giornata e la tabella bonus/malus ufficiale gia configurata.
