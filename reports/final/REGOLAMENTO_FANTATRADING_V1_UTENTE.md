# Regolamento FantaTrading V1

## 1. Obiettivo del gioco

FantaTrading e un gioco in cui ogni partecipante costruisce una rosa di calciatori e cerca di aumentare il valore complessivo del proprio portafoglio durante la stagione.

Il risultato finale dipende da:

- variazione delle quotazioni dei giocatori;
- rendimento dei giocatori nelle partite reali;
- bonus e malus legati ai voti;
- commissioni di acquisto e vendita.

L obiettivo e chiudere la stagione con il miglior ROI possibile.

## 1a. Modello base: accesso libero e capitale virtuale

La V1 usa come modello principale il modello `FREE_ACCESS_VIRTUAL_CAPITAL`.

Questo significa:

- l accesso e libero;
- non esiste una quota iscrizione obbligatoria;
- il capitale del pilot e virtuale;
- ogni partecipante costruisce una rosa da 25 giocatori senza budget massimo;
- il capitale virtuale depositato puo essere diverso da utente a utente;
- la classifica principale e basata sul ROI%, non sulla ricchezza assoluta;
- il valore totale del portafoglio, o total wealth, e mostrato solo come informazione;
- la liquidazione finale serve a calcolare rendimento e classifica;
- non sono previsti pagamenti o riscossioni reali nel pilot;
- premi e montepremi sono opzionali e separati dal modello base.

Nel pilot il credito e virtuale. Un eventuale modello con premi o riscossione reale sara valutato separatamente e avra regole dedicate.

## 2. Composizione della rosa

Ogni rosa deve essere composta da 25 giocatori:

| Ruolo | Numero giocatori |
|-------|------------------|
| Portieri | 3 |
| Difensori | 8 |
| Centrocampisti | 8 |
| Attaccanti | 6 |

Una rosa non e valida se non rispetta questa composizione.

## 3. Acquisto dei giocatori

Quando un partecipante acquista un giocatore, il costo dell operazione e dato da:

- valore del giocatore al momento dell acquisto;
- commissione di acquisto del 2%.

Il sistema usa prima la liquidita virtuale disponibile. Se la liquidita non basta, aggiunge automaticamente al capitale virtuale depositato solo la parte mancante. Non esiste un budget massimo: una rosa piu costosa aumenta anche il capitale virtuale depositato e quindi non crea un vantaggio automatico nel ranking ROI%.

Esempio:

- valore giocatore: 100 crediti;
- commissione acquisto: 2%;
- costo totale: 102 crediti.

## 4. Vendita dei giocatori

Quando un partecipante vende un giocatore, riceve il valore aggiornato del giocatore al netto della commissione di vendita.

La commissione di vendita e pari al 2%.

L incasso netto della vendita aumenta la liquidita virtuale disponibile. La vendita non riduce retroattivamente il capitale virtuale depositato: il ROI continua a misurare il rendimento rispetto al capitale che il sistema ha dovuto depositare virtualmente per finanziare gli acquisti.

Esempio:

- valore giocatore al momento della vendita: 120 crediti;
- commissione vendita: 2%;
- incasso netto: 117,60 crediti.

## 5. Commissioni

Le commissioni previste nella V1 sono:

| Operazione | Commissione |
|------------|-------------|
| Acquisto | 2% |
| Vendita | 2% |

Le commissioni sono costi di operazione. Sono trattenute dal sistema a copertura dei costi di gestione e organizzazione e riducono il rendimento netto dell utente.

La piattaforma non applica una percentuale diretta sul capitale della rosa: il costo nasce solo quando effettui operazioni di acquisto o vendita.

## 5a. Cambi durante la stagione

Puoi acquistare e vendere giocatori liberamente durante la stagione. Non esiste un numero massimo di cambi per giornata o per stagione.

Ogni cambio comporta un costo:

- commissione di vendita: 2% del valore del giocatore ceduto;
- commissione di acquisto: 2% del valore del giocatore acquistato.

**Attenzione al rischio overtrading.**

Operare frequentemente puo sembrare un vantaggio, ma ogni cambio ha un costo immediato in commissioni. Le simulazioni mostrano che strategie con molti cambi tendono a produrre rendimenti significativamente piu bassi rispetto a chi mantiene la rosa relativamente stabile.

Esempi orientativi (basati su quotazioni sintetiche esplorative, non dati ufficiali):

| Tipo di strategia | ROI medio stimato |
|-------------------|-------------------|
| Mantieni la rosa (HOLD) | circa +5% |
| Pochi cambi mirati | circa -1% / -2% |
| Molti cambi aggressivi | fino a -25% / -57% |

Questi valori derivano da simulazioni con quotazioni non ufficiali e hanno carattere esplorativo. Il dato che resta solido e la direzione: le commissioni si accumulano rapidamente e possono azzerare o invertire qualsiasi guadagno da quotazioni.

Il freno all overtrading e il costo stesso delle commissioni, non un limite regolamentare.

## 6. Commissioni trattenute dal sistema

Le commissioni di acquisto e vendita sono trattenute dal sistema.

Importante:

- le commissioni non si applicano al montepremi totale;
- le commissioni non sono una trattenuta diretta sul capitale della rosa;
- le commissioni si pagano solo quando compri o vendi;
- i cambi sono liberi, ma ogni cambio ha un costo;
- prima di operare devi valutare se il possibile guadagno supera il costo delle commissioni.

Esempio:

- acquisto giocatore a 100 con commissione 2%: costo totale 102;
- vendita giocatore a 120 con commissione 2%: incasso netto 117,60;
- utile netto dell operazione: 117,60 - 102 = 15,60;
- commissioni trattenute dal sistema: 2,00 + 2,40 = 4,40.

## 7. Variazione delle quotazioni

Ogni giocatore puo aumentare o diminuire di valore in base alla variazione della sua quotazione.

La regola base e:

```text
+1 punto quotazione = +5%
-1 punto quotazione = -5%
```

Esempi:

| Variazione quotazione | Effetto sul valore |
|-----------------------|--------------------|
| +1 | +5% |
| +2 | +10% |
| -1 | -5% |
| -3 | -15% |

La perdita massima da variazione quotazione e limitata a -100%. Il valore di vendita non puo quindi diventare negativo.

## 8. Gestione dei voti

Per ogni giornata vengono considerati i voti reali dei giocatori.

I voti servono a:

- calcolare la media squadra;
- determinare la fascia squadra;
- applicare bonus o malus individuali ai giocatori con voto.

Solo i giocatori con voto valido entrano nel calcolo della media squadra.

## 9. Fasce squadra

La media dei giocatori con voto valido determina la fascia squadra della giornata.

| Fascia | Media squadra |
|--------|---------------|
| Fascia 0 | inferiore a 5 |
| Fascia 1 | da 5 a meno di 5,5 |
| Fascia 2 | da 5,5 a meno di 6 |
| Fascia 3 | da 6 a meno di 6,5 |
| Fascia 4 | da 6,5 in su |

Una fascia squadra piu alta puo migliorare l effetto dei bonus sui singoli giocatori.

## 10. Bonus e malus individuali

Ogni giocatore con voto valido riceve un effetto fantasy individuale.

Questo effetto dipende da:

- fascia squadra della giornata;
- voto individuale del giocatore;
- tabella bonus/malus ufficiale FantaTrading.

In generale:

- un buon voto in una squadra con media alta tende a generare un bonus;
- un voto basso in una squadra con media bassa tende a generare un malus;
- voti intermedi possono avere effetto neutro o moderato.

## 11. Giocatori senza voto

Un giocatore e considerato senza voto quando non ha un voto valido nella giornata.

Nella V1 si applica questa regola:

- il giocatore senza voto non entra nella media squadra;
- il giocatore senza voto non riceve bonus fantasy;
- il giocatore senza voto non riceve malus fantasy;
- il suo effetto fantasy giornaliero e pari a 0.

Questa scelta evita di penalizzare tutta la rosa per un singolo giocatore senza voto, ma mantiene tracciato il fatto che quel giocatore non ha contribuito alla giornata.

## 12. Calcolo del ROI

Il ROI misura il rendimento finale della rosa.

In forma semplice:

```text
ROI = rendimento finale rispetto al capitale virtuale depositato
```

Esempio:

- capitale virtuale depositato: 1.000 crediti;
- valore finale netto: 1.080 crediti;
- ROI: +8%.

Se il valore finale netto e 970 crediti, il ROI e -3%.

## 13. Soglia sopravvivenza 0%

La soglia di sopravvivenza e fissata a ROI 0%.

Chi chiude la stagione sopra 0% ha conservato o aumentato il valore del proprio portafoglio.

Chi chiude sotto 0% ha perso valore rispetto al capitale virtuale depositato.

## 14. Soglia premio 7%

La soglia premio V1, quando viene attivato uno scenario opzionale a premi, e fissata a ROI 7%.

Un partecipante supera la soglia premio se chiude la stagione con ROI pari o superiore al 7%.

Esempio:

- ROI finale +6,9%: soglia premio non raggiunta;
- ROI finale +7,0%: soglia premio raggiunta;
- ROI finale +10,0%: soglia premio raggiunta.

La soglia 7% e scelta come compromesso tra attrattivita per i partecipanti e sostenibilita del gioco. Nel modello base free access resta una soglia informativa, non un diritto automatico a un premio.

## 15. Classifica finale

La classifica finale e ordinata in base al ROI.

Il partecipante con ROI piu alto si posiziona davanti agli altri.

In caso di pari ROI, il regolamento operativo potra prevedere criteri di spareggio, ad esempio:

- valore finale netto piu alto;
- minor numero di operazioni;
- miglior rendimento medio dei giocatori con voto.

## 16. Distribuzione premi

Nel modello base free access i premi non sono obbligatori e non fanno parte della meccanica principale.

La classifica principale resta sempre ordinata per ROI%. Eventuali premi o montepremi possono essere attivati solo come scenario opzionale, premium o competizione a premi separata, con regole dichiarate prima dell inizio della stagione.

Se viene attivato uno scenario a premi, la distribuzione deve rispettare due principi:

- premiare i partecipanti che superano la soglia del 7%;
- mantenere sostenibile il gioco nel tempo.

La struttura premi puo essere definita in base a:

- numero di partecipanti;
- montepremi disponibile;
- numero di partecipanti sopra soglia;
- posizione in classifica.

Le commissioni trattenute dal sistema riguardano solo le operazioni effettuate e non devono essere confuse con una trattenuta sul montepremi totale o sul capitale della rosa.

### Scenario opzionale a premi

La simulazione economica con quota di iscrizione da 30 euro per partecipante non e il modello base V1. Va letta come scenario opzionale/premium o competizione a premi.

In quello scenario, la quota di iscrizione puo alimentare il montepremi secondo la percentuale indicata:

- 80% della quota di iscrizione va al montepremi;
- 20% della quota di iscrizione va al sistema per sostenere gestione e organizzazione.

Con 100 partecipanti, questa struttura genera:

- montepremi netto: 2.400 euro;
- quota destinata al sistema: 600 euro.

Le commissioni di acquisto e vendita sono costi operativi trattenuti dal sistema.

Il premio finale dipende dalla classifica e dalla tabella premi.

Per uno scenario opzionale a premi, la tabella consigliata puo premiare il top 10% dei partecipanti. Il montepremi puo derivare da quota iscrizione opzionale, sponsor o fondo premi dichiarato prima dell inizio della stagione.

## 16a. Riscossione reale: non inclusa nel pilot

Nel pilot il credito e virtuale.

La liquidazione finale serve a calcolare rendimento e classifica. Non trasforma il credito in denaro e non crea un diritto automatico a ricevere pagamenti.

Non sono previsti pagamenti o riscossioni reali.

Un eventuale modello con premi, montepremi o riscossione reale sara valutato separatamente. Prima di introdurlo servono analisi di sostenibilita, fondo/riserve dedicate e verifiche legali, fiscali e regolatorie.

La raccomandazione attuale e semplice: non procedere con payout reale immediato nel pilot.

## 17. Esempi numerici semplici

### Esempio A: aumento quotazione

- valore iniziale giocatore: 100;
- quotazione iniziale: 10;
- quotazione finale: 12;
- variazione: +2 punti;
- effetto quotazione: +10%;
- valore prima delle commissioni: 110.

### Esempio B: diminuzione quotazione

- valore iniziale giocatore: 100;
- quotazione iniziale: 10;
- quotazione finale: 8;
- variazione: -2 punti;
- effetto quotazione: -10%;
- valore prima delle commissioni: 90.

### Esempio C: vendita con commissione

- valore aggiornato giocatore: 110;
- commissione vendita: 2%;
- incasso netto: 107,80.

### Esempio D: giocatore senza voto

- il giocatore non riceve voto nella giornata;
- non entra nella media squadra;
- non riceve bonus;
- non riceve malus;
- effetto fantasy giornaliero: 0.

### Esempio E: soglia premio

- capitale virtuale depositato: 1.000;
- valore finale netto: 1.075;
- ROI: +7,5%;
- soglia premio 7% raggiunta.

## 18. Nota sperimentale V1

Questo regolamento V1 e una baseline.

La V1 e pensata per essere chiara, giocabile e coerente con i dati oggi disponibili, ma deve essere validata ulteriormente con le quotazioni giornata per giornata ufficiali.

### Cosa e gia stato verificato

E stato condotto un backtest intra-stagione usando quotazioni sintetiche (non ufficiali) per simulare il trading giornata per giornata. I risultati principali, avvertiti come esplorativi, mostrano:

- **HOLD** (mantieni la rosa invariata) produce il ROI piu alto tra tutte le strategie simulate: circa **5.30%** nella versione con commissione vendita 1.25%, e **4.50%** con commissione vendita 2%;
- nessuna strategia di trading attivo ha superato HOLD nelle simulazioni;
- le strategie con cambi molto frequenti producono perdite significative a causa dell accumulo di commissioni;
- il nuovo modello economico prevede che le commissioni siano trattenute dal sistema a copertura dei costi di gestione e organizzazione.

Queste simulazioni usano quotazioni sintetiche stimate, non le quotazioni ufficiali Fantacalcio giornata per giornata. I valori numerici sono esplorativi. La direzione delle conclusioni e comunque utile per impostare il regolamento.

### Cosa manca ancora

Prima di considerare il regolamento definitivo, sara necessario verificare:

- andamento reale dei prezzi ufficiali durante la stagione;
- effetti di acquisti e vendite in corso d anno con dati reali;
- numero effettivo di partecipanti sopra soglia con prezzi dinamici ufficiali;
- sostenibilita economica della struttura premi con dati reali;
- possibile vantaggio eccessivo di alcune strategie su dati ufficiali.

Fino a quella validazione, la V1 va considerata un regolamento ufficiale di baseline, non una versione definitiva immutabile.
