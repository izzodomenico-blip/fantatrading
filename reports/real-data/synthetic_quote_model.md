# Modello Sintetico Quotazioni Giornata per Giornata

## Natura del modello

Questo modello e sintetico, stimato e non ufficiale Fantacalcio.

Non usa quotazioni giornata per giornata reali. Parte dalle quotazioni iniziali reali, legge voti e presenze reali giornata per giornata, genera una QA interna decimale stimata e la confronta solo alla fine con la Qt.A reale disponibile.

## Logica implementata

- L ultima prestazione giocata muove la QA in base alla differenza tra fantavoto/voto e rendimento atteso.
- Dalla quinta presenza utile entra una componente stagionale basata su fantamedia e presenza.
- La presenza usa il valore migliore tra presenceRateSeason e presenceRateLast10.
- Se la componente stagionale darebbe un upgrade ma il giocatore non ha giocato l ultima partita, l upgrade viene congelato.
- Lo stesso voto ha effetto diverso in base a ruolo e quotazione corrente stimata.
- Il calcolo riparte sempre da QA decimale, non dalla QAA pubblica arrotondata.
- QAA e arrotondata per difetto da .01 a .50 e per eccesso da .51 a .99.
- Il paracadute agisce sulla QAA pubblica minima, secondo ruolo e quotazione iniziale.
- QAA non scende sotto 1 e non supera 60.

## Limiti

- Non implementa logiche complesse di recuperi.
- Non replica un algoritmo ufficiale Fantacalcio.
- Non osserva movimenti reali intermedi di mercato.
- La calibrazione vede solo Qt.I e Qt.A, quindi molte traiettorie giornaliere diverse possono arrivare allo stesso valore finale.
- Va usato come baseline sperimentale per stress test, non come fonte ufficiale di prezzo.