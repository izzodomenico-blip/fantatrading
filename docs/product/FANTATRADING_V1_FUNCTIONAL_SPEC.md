# FantaTrading V1 — Specifica Funzionale

**Versione:** 1.0  
**Data:** 2026-05-12  
**Stato:** Bozza operativa — basata su regolamento V1 validato con backtest  
**Destinatari:** sviluppatori, product manager, stakeholder tecnici

---

## 1. Obiettivo dell'app

### 1.1 Cos'è FantaTrading

FantaTrading è un gioco a squadre ispirato al fantacalcio, con una meccanica finanziaria al centro: ogni partecipante costruisce un portafoglio di giocatori e cerca di massimizzare il rendimento complessivo durante la stagione.

Il portafoglio si comporta come un paniere di azioni: ogni giocatore ha un valore in crediti che può aumentare o diminuire in base all'andamento delle quotazioni e al rendimento in campo. Il risultato finale dipende da variazione delle quotazioni, bonus/malus legati ai voti reali, e costo delle operazioni di compravendita.

Il modello principale attuale è `FREE_ACCESS_VIRTUAL_CAPITAL`: accesso libero, nessuna quota iscrizione obbligatoria, capitale virtuale variabile per utente, ranking principale su ROI%. Premi e montepremi sono opzionali e separati dal modello base.

### 1.2 Differenza rispetto al fantacalcio classico

| Aspetto | Fantacalcio classico | FantaTrading |
|---------|----------------------|--------------|
| Obiettivo | Massimizzare il punteggio settimanale | Massimizzare il ROI del portafoglio |
| Rosa | Formazione in campo + panchina | Portafoglio di 25 giocatori |
| Voti | Generano punti fantacalcio | Generano bonus/malus in percentuale sul valore |
| Mercato | Sessioni d'asta | Compravendita libera con commissioni |
| Rendimento | Punti in classifica | ROI % rispetto al capitale virtuale depositato |
| Commissioni | Assenti o fisse | 2% acquisto + 2% vendita su ogni operazione |

### 1.3 Concetti fondamentali

**Rosa / Portafoglio:** l'insieme dei 25 giocatori acquistati dal partecipante. Ogni giocatore occupa una posizione nel portafoglio con un valore corrente.

**Azione / Posizione:** l'acquisto di un singolo giocatore. Il valore corrente di una posizione dipende dalla quotazione corrente del giocatore e dai bonus/malus accumulati.

**Crediti:** l'unità di misura virtuale del sistema. Nel pilot non rappresentano denaro reale. Il partecipante non parte da un budget massimo uniforme: il capitale virtuale depositato cresce quando gli acquisti richiedono nuova liquidità.

**Capitale virtuale depositato:** somma virtuale usata come denominatore del ROI. Ogni acquisto usa prima la liquidità disponibile; se non basta, il sistema aumenta il capitale virtuale depositato della sola differenza.

**Liquidità virtuale:** saldo virtuale disponibile. Aumenta con le vendite e diminuisce con gli acquisti.

**ROI (Return on Investment):** misura percentuale del rendimento finale rispetto al capitale virtuale depositato. Un ROI positivo significa che il portafoglio vale più di quanto è stato depositato virtualmente; un ROI negativo significa una perdita virtuale. La soglia di sopravvivenza è 0%, la soglia premio opzionale è 7%.

---

## 2. Tipologie di utenti

### 2.1 Partecipante

L'utente principale del sistema. Partecipa a una stagione, gestisce il proprio portafoglio, compra e vende giocatori, consulta le classifiche e verifica il proprio ROI.

Capacità principali:
- registrarsi e accedere alla piattaforma;
- accedere liberamente a una stagione senza quota iscrizione obbligatoria;
- creare e modificare la propria rosa;
- acquistare e vendere giocatori durante la stagione;
- visualizzare il valore corrente del portafoglio;
- consultare lo storico delle operazioni;
- vedere la classifica generale e, se attiva, la classifica soglia premi;
- leggere il regolamento.

### 2.2 Admin / Organizzatore

Gestisce il ciclo di vita della stagione: carica i dati, lancia i calcoli, supervisiona i risultati, gestisce eventuali premi opzionali. Non è un partecipante attivo ma ha accesso completo ai dati.

Capacità principali:
- creare e configurare una stagione;
- importare le quotazioni iniziali dei giocatori;
- caricare i voti di ogni giornata;
- aggiornare le quotazioni nel corso della stagione;
- avviare il calcolo della giornata;
- validare e correggere i risultati;
- gestire la classifica finale;
- gestire la struttura premi opzionale;
- esportare report in CSV e JSON;
- accedere all'audit log completo delle operazioni.

### 2.3 Super-Admin (futuro, fuori scope MVP)

Gestisce più organizzazioni o più leghe indipendenti. Configura le impostazioni globali della piattaforma. Non richiesto per il MVP V1.

---

## 3. Flusso partecipante

### 3.1 Registrazione e accesso

1. Il partecipante accede alla piattaforma tramite pagina di registrazione.
2. Inserisce nome, cognome, email e password.
3. Il sistema invia un'email di conferma (facoltativa per MVP).
4. Dopo la conferma, il partecipante accede con email e password.
5. È possibile recuperare la password tramite email.

**Vincoli:** un'email può essere associata a un solo account.

### 3.2 Iscrizione alla stagione

1. Il partecipante visualizza le stagioni disponibili (stato: aperta alle iscrizioni).
2. Seleziona la stagione e conferma l'accesso libero.
3. Il sistema crea il portafoglio iniziale del partecipante con capitale virtuale depositato 0 e liquidità virtuale 0.
4. Il partecipante può iscriversi solo prima della data di chiusura iscrizioni.

**Vincoli:** accesso possibile solo se la stagione è in stato "iscrizioni aperte". Non è prevista una quota iscrizione obbligatoria. Non è possibile iscriversi durante una stagione già in corso (da definire per V1).

### 3.3 Creazione della rosa

1. Dopo l'iscrizione, il partecipante deve costruire la propria rosa prima dell'inizio della stagione.
2. Accede al mercato e seleziona i giocatori da acquistare.
3. La rosa deve rispettare la composizione obbligatoria: 3 portieri, 8 difensori, 8 centrocampisti, 6 attaccanti (totale 25 giocatori).
4. Ogni acquisto usa la liquidità virtuale disponibile. Se non basta, il sistema aumenta il capitale virtuale depositato della differenza: `costo = valore giocatore × 1.02`.
5. La rosa non è valida fino al raggiungimento della composizione completa.

**Vincoli:** non esiste un budget massimo di rosa. Il costo complessivo della rosa aumenta il capitale virtuale depositato e quindi il denominatore del ROI.

### 3.4 Acquisto di giocatori

1. Il partecipante cerca o sfoglia i giocatori disponibili nel mercato.
2. Seleziona il giocatore e conferma l'acquisto.
3. Il sistema calcola il costo totale: `costo = valore corrente × 1.02`.
4. Il sistema scala il costo dalla liquidità virtuale; se la liquidità non basta, incrementa il capitale virtuale depositato della parte mancante.
5. Il giocatore entra nella rosa con il valore di acquisto tracciato.

**Vincoli:** non è possibile acquistare un giocatore già in rosa. La composizione per ruolo non deve superare i limiti massimi.

### 3.5 Vendita di giocatori

1. Il partecipante seleziona un giocatore in rosa e sceglie di venderlo.
2. Il sistema mostra il valore corrente e l'incasso netto stimato: `incasso = valore corrente × 0.98`.
3. Il partecipante conferma la vendita.
4. Il sistema aggiunge l'incasso netto alla liquidità virtuale disponibile.
5. Il giocatore esce dalla rosa.

**Vincoli:** non è possibile vendere un giocatore che porterebbe la composizione della rosa sotto i minimi per ruolo, salvo che la vendita sia seguita immediatamente da un acquisto sostitutivo (logica da definire per V1). Non è possibile vendere se la rosa scende sotto 25 giocatori senza un acquisto contestuale.

### 3.6 Cambi durante la stagione

I cambi sono liberi: non esiste un numero massimo di operazioni per giornata o per stagione. Ogni cambio (vendita + acquisto) comporta una commissione vendita del 2% e una commissione acquisto del 2%.

Il sistema deve mostrare un avviso esplicito sui costi dell'overtrading ogni volta che il partecipante supera una soglia di cambi frequenti (soglia da definire, es. oltre 5 cambi in 3 giornate).

### 3.7 Visualizzazione portafoglio

Il partecipante visualizza:
- elenco giocatori in rosa con ruolo, valore corrente, variazione dal valore di acquisto;
- liquidità virtuale disponibile;
- capitale virtuale depositato;
- valore totale del portafoglio / total wealth (informativo);
- commissioni cumulative pagate;
- ROI attuale rispetto al capitale virtuale depositato.

### 3.8 Visualizzazione ROI

Il partecipante visualizza:
- ROI corrente in percentuale;
- indicatore rispetto alla soglia 0% (sopravvivenza);
- indicatore rispetto alla soglia 7% (premio);
- andamento storico del ROI giornata per giornata.

### 3.9 Storico operazioni

Il partecipante consulta la lista di tutte le operazioni eseguite:
- data/giornata;
- tipo operazione (acquisto / vendita);
- giocatore;
- valore al momento dell'operazione;
- commissione pagata;
- liquidità virtuale residua dopo l'operazione.

### 3.10 Classifiche

Il partecipante accede a:
- **classifica generale:** tutti i partecipanti ordinati per ROI decrescente;
- **classifica soglia premi:** vista opzionale per scenari a premi, con soli partecipanti con ROI ≥ 7%, ordinati per ROI decrescente.

### 3.11 Premi

Se la stagione attiva uno scenario opzionale a premi, il partecipante vede la struttura premi definita dall'admin:
- soglia per accedere ai premi (ROI ≥ 7%);
- posizione in classifica necessaria per ogni fascia premio;
- montepremi disponibile.

I premi sono separati dal modello base free access e vengono assegnati al termine della stagione dall'admin solo se lo scenario a premi è stato configurato.

---

## 4. Flusso admin

### 4.1 Creazione stagione

1. L'admin accede alla sezione gestione stagioni.
2. Crea una nuova stagione con: nome, stagione calcistica di riferimento, data inizio/fine, numero giornate, accesso libero e modello capitale virtuale.
3. Configura i parametri regolamentari: commissione acquisto, commissione vendita, soglia sopravvivenza, soglia premio opzionale, policy SV.
4. Imposta la composizione rosa obbligatoria.
5. Porta la stagione in stato "configurata — in attesa dati".

### 4.2 Caricamento quotazioni iniziali

1. L'admin carica un file CSV/Excel con le quotazioni iniziali dei giocatori.
2. Il sistema valida il file: colonne obbligatorie, ruoli, valori numerici, assenza di duplicati.
3. In caso di errori, il sistema elenca le righe problematiche con descrizione.
4. Se la validazione passa, il sistema importa i dati e calcola le quotazioni iniziali.
5. L'admin verifica l'anteprima e conferma l'import.

**Formato atteso:** `playerId, nome, ruolo (P/D/C/A), quotazioneIniziale, squadraReale`.

### 4.3 Caricamento voti giornata

1. Dopo ogni giornata reale, l'admin carica il file voti.
2. Il sistema valida: colonne presenti, voti nel range corretto, assenza di duplicati per stagione+giornata+giocatore.
3. Il sistema deriva automaticamente i giocatori senza voto (SV) per assenza nel file.
4. L'admin conferma il caricamento.

**Formato atteso:** `stagione, giornata, playerId, voto, votoFantasy`.

### 4.4 Aggiornamento quotazioni

1. Durante la stagione, l'admin può caricare aggiornamenti alle quotazioni dei giocatori.
2. Il sistema traccia la variazione per ogni giocatore: quotazione precedente → quotazione aggiornata.
3. La variazione impatta il valore corrente delle posizioni di tutti i partecipanti che detengono quel giocatore.

### 4.5 Calcolo giornata

1. L'admin lancia il calcolo per una specifica giornata.
2. Il sistema applica bonus/malus a tutti i partecipanti in base a:
   - voti individuali caricati;
   - fascia squadra calcolata sulla media dei giocatori con voto valido;
   - tabella bonus/malus ufficiale FantaTrading.
3. I giocatori senza voto ricevono effetto 0% (policy PLAYER_ZERO_TEAM_EXCLUDE).
4. Il sistema aggiorna il valore corrente di ogni posizione.
5. Il sistema ricalcola il ROI di tutti i partecipanti.

### 4.6 Validazione risultati

1. Dopo il calcolo, l'admin visualizza un riepilogo: variazioni per giornata, partecipanti sopra/sotto soglia.
2. Può confrontare i risultati con i dati di input per verificare coerenza.
3. In caso di errori nei dati importati, può correggere e rieseguire il calcolo.
4. Tutte le operazioni di correzione vengono tracciate nell'audit log.

### 4.7 Gestione classifiche

1. Al termine di ogni giornata, la classifica viene aggiornata automaticamente dopo il calcolo.
2. L'admin può visualizzare la classifica in qualsiasi momento.
3. A fine stagione, congela la classifica finale.

### 4.8 Gestione premi

1. L'admin definisce la struttura premi per la stagione: numero posizioni premiate, percentuale del montepremi per posizione.
2. Il sistema calcola il montepremi disponibile solo se la stagione ha uno scenario opzionale/premium a premi. Il montepremi non fa parte del modello base free access.
3. A fine stagione, l'admin assegna i premi ai partecipanti sopra soglia.
4. Il sistema genera la lista dei vincitori e il dettaglio degli importi.

### 4.9 Esportazione report

L'admin può esportare in CSV e JSON:
- elenco partecipanti con ROI finale;
- classifica finale;
- dettaglio commissioni per partecipante;
- ricavo piattaforma;
- storico calcoli per giornata.

---

## 5. Schermate utente (partecipante)

### 5.1 Dashboard personale

Schermata principale dopo il login. Mostra in sintesi:
- valore totale del portafoglio;
- ROI corrente con indicatori visivi (soglia 0% e soglia 7%);
- ultimi movimenti (ultime 3-5 operazioni);
- prossima giornata prevista;
- avvisi e notifiche.

### 5.2 Mercato

Elenco di tutti i giocatori disponibili. Funzionalità:
- ricerca per nome;
- filtro per ruolo (P/D/C/A);
- filtro per fascia di prezzo;
- ordinamento per quotazione, variazione, nome;
- card giocatore con: nome, squadra reale, ruolo, quotazione corrente, variazione dall'inizio stagione;
- pulsante acquisto con modale di conferma.

### 5.3 Rosa / Portafoglio

Elenco dei giocatori in rosa, raggruppati per ruolo. Per ogni giocatore:
- nome, squadra reale;
- valore di acquisto e valore corrente;
- variazione in percentuale e in crediti;
- pulsante vendita con modale di conferma.

In fondo alla pagina: riepilogo liquidità virtuale disponibile, capitale virtuale depositato, valore totale portafoglio informativo e commissioni pagate.

### 5.4 Dettaglio calciatore

Pagina dedicata a un singolo calciatore. Mostra:
- anagrafica (nome, ruolo, squadra reale);
- quotazione corrente;
- andamento storico della quotazione giornata per giornata;
- storico voti stagione corrente;
- bonus/malus ricevuti giornata per giornata;
- se in rosa: valore di acquisto, performance della posizione.

### 5.5 Storico operazioni

Lista paginata di tutte le operazioni eseguite dal partecipante. Per ogni operazione:
- data e giornata;
- tipo (acquisto / vendita);
- nome giocatore;
- valore al momento dell'operazione;
- commissione;
- saldo liquidità virtuale dopo l'operazione.

Export CSV disponibile.

### 5.6 Classifica generale

Tabella con tutti i partecipanti iscritti alla stagione, ordinati per ROI decrescente. Per ogni partecipante:
- posizione;
- nome (o nickname);
- ROI corrente;
- valore portafoglio;
- numero operazioni.

Indicazione visiva delle posizioni sotto soglia 0%, sopra soglia 0%, sopra soglia 7%.

### 5.7 Classifica soglia premi

Tabella filtrata opzionale: solo partecipanti con ROI ≥ 7%. Mostra la struttura premi e la posizione del partecipante rispetto alle fasce premiate solo per stagioni con scenario a premi attivo.

### 5.8 Regolamento

Versione leggibile del regolamento V1 FantaTrading. Organizzata per sezioni. Non modificabile dal partecipante. Deve includere:
- obiettivo del gioco;
- composizione rosa;
- commissioni;
- variazione quotazioni;
- bonus/malus;
- ROI e soglie;
- avviso overtrading.

### 5.9 Notifiche / Avvisi

Lista cronologica delle notifiche:
- calcolo giornata completato;
- aggiornamento quotazioni;
- avviso overtrading (se supera soglia di cambi frequenti);
- avvisi di stagione (inizio, fine iscrizioni, fine stagione).

---

## 6. Schermate admin

### 6.1 Dashboard admin

Panoramica della stagione in corso:
- stato stagione (in configurazione / in corso / terminata);
- ultima giornata calcolata;
- numero partecipanti;
- percentuale sopra soglia 0% e sopra soglia 7%;
- ricavo piattaforma accumulato;
- avvisi pendenti (dati mancanti, errori import).

### 6.2 Gestione stagioni

Lista delle stagioni create. Per ogni stagione:
- nome, stato, date;
- numero partecipanti;
- parametri regolamentari.

Funzionalità: crea nuova stagione, modifica parametri (solo se la stagione non è ancora iniziata), archivia stagione.

### 6.3 Import dati

Due sezioni distinte:
- **Import quotazioni:** carica file quotazioni iniziali o aggiornamenti. Anteprima, validazione, conferma.
- **Import voti:** carica file voti per una specifica giornata. Validazione, riepilogo SV derivati, conferma.

Storico di tutti gli import con stato (successo / errore) e timestamp.

### 6.4 Controllo qualità dati

Strumenti di verifica:
- confronto giocatori con quotazione vs giocatori con voto (matched / non matched);
- lista SV derivati per giornata;
- anomalie nei voti (voti fuori range, duplicati);
- anomalie nelle quotazioni (valori negativi, variazioni eccessive).

### 6.5 Calcolo giornata

Pannello per lanciare il calcolo di una giornata specifica:
- seleziona giornata;
- verifica che i voti siano stati caricati;
- lancia il calcolo;
- visualizza il riepilogo: partecipanti processati, errori, variazioni medie portafoglio.

Possibilità di rieseguire il calcolo in caso di correzione dati.

### 6.6 Gestione utenti

Lista dei partecipanti iscritti alla stagione con:
- nome, email, stato iscrizione;
- composizione rosa (completa / incompleta);
- ROI corrente.

Funzionalità: visualizza dettaglio partecipante, disattiva account (con tracciamento audit).

### 6.7 Gestione premi

Configurazione della struttura premi per la stagione:
- definizione numero posizioni premiate;
- percentuale montepremi per posizione;
- calcolo automatico montepremi disponibile se lo scenario opzionale/premium a premi è attivo.

Al termine della stagione: assegnazione premi ai vincitori e generazione lista finale con importi solo se i premi sono stati configurati.

### 6.8 Audit log

Lista cronologica di tutte le operazioni amministrative con:
- timestamp;
- utente admin che ha eseguito l'operazione;
- tipo operazione (import, calcolo, correzione, assegnazione premi);
- dettaglio;
- stato (successo / errore).

Non modificabile.

### 6.9 Esportazione report

Export disponibili in CSV e JSON:
- classifica finale con ROI;
- dettaglio commissioni per partecipante;
- ricavo piattaforma;
- storico calcoli giornata per giornata;
- lista vincitori premi.

---

## 7. Regole di business V1

### 7.1 Composizione rosa

- Rosa obbligatoria: 25 giocatori.
- Composizione: 3 portieri (P), 8 difensori (D), 8 centrocampisti (C), 6 attaccanti (A).
- Una rosa non è valida se non rispetta questa composizione.
- Non è possibile avere più di un giocatore identico in rosa.

### 7.2 Commissioni

| Operazione | Commissione |
|------------|-------------|
| Acquisto | 2% del valore del giocatore |
| Vendita | 2% del valore del giocatore |

Il 100% delle commissioni di acquisto e vendita è trattenuto dal sistema. Non esiste una platform fee separata nel modello base.

### 7.3 Variazione quotazioni

- Ogni punto di variazione della quotazione corrisponde al 5% del valore del giocatore.
- Formula: `effetto quotazione = (Qt.A − Qt.I) × 5%`
- Il valore di vendita non può scendere sotto zero (floor a zero).
- Perdita massima da quotazione: −100%.

### 7.4 Cambi durante la stagione

- I cambi sono liberi: non esiste un numero massimo per giornata o per stagione.
- Ogni operazione di vendita genera una commissione del 2%, ogni acquisto genera una commissione del 2%.
- Il sistema deve mostrare un avviso esplicito se il partecipante effettua cambi frequenti: i dati mostrano che strategie con molti cambi tendono a produrre rendimenti significativamente inferiori rispetto a chi mantiene la rosa stabile.

### 7.5 Gestione giocatori senza voto (SV)

Policy V1: `PLAYER_ZERO_TEAM_EXCLUDE`.

- Un giocatore è considerato SV se non compare nel file voti della giornata.
- Lo SV non entra nel calcolo della media squadra.
- Lo SV non riceve bonus o malus per quella giornata (effetto 0%).
- La fascia squadra viene calcolata solo sui giocatori con voto valido.

### 7.6 Bonus e malus

- La media dei giocatori con voto valido determina la fascia squadra (0–4).
- Ogni giocatore con voto valido riceve un effetto in percentuale basato sulla combinazione fascia squadra + voto individuale, secondo la tabella ufficiale FantaTrading.
- I bonus/malus si accumulano giornata per giornata tramite moltiplicatore composto.

### 7.7 Fasce squadra

| Fascia | Media squadra |
|--------|---------------|
| Fascia 0 | < 5 |
| Fascia 1 | ≥ 5 e < 5.5 |
| Fascia 2 | ≥ 5.5 e < 6 |
| Fascia 3 | ≥ 6 e < 6.5 |
| Fascia 4 | ≥ 6.5 |

### 7.8 ROI e soglie

- `ROI = (valore netto liquidabile + liquidità virtuale − capitale virtuale depositato) / capitale virtuale depositato × 100`
- Soglia sopravvivenza: ROI ≥ 0%
- Soglia premio opzionale: ROI ≥ 7%
- La classifica finale è ordinata per ROI decrescente.
- Total wealth e valore assoluto del portafoglio sono metriche informative, non criteri principali di ranking.

### 7.9 Montepremi opzionale

- Il modello base è free access e non richiede quota iscrizione obbligatoria.
- Il montepremi è un layer opzionale/premium o una competizione a premi separata.
- La struttura premi può essere definita dall'admin solo per stagioni che dichiarano esplicitamente uno scenario a premi.
- Le commissioni trading restano trattenute dal sistema e non alimentano automaticamente il montepremi.

---

## 8. Modello dati preliminare

Vedere documento separato: `FANTATRADING_V1_DATA_MODEL_DRAFT.md`.

---

## 9. Calcoli principali

### 9.1 Valore corrente di una posizione

```
valoreCorrente = Qt.I × fantasyMultiplier × (1 + (Qt.corrente − Qt.I) × 5 / 100)
valoreCorrente = max(0, valoreCorrente)
```

Dove `fantasyMultiplier` è il prodotto composto dei bonus/malus accumulati giornata per giornata:
```
fantasyMultiplier = Π (1 + bonusPct_giornata / 100)
```

### 9.2 Costo acquisto

```
costoAcquisto = valoreGiocatore × 1.02
```

### 9.3 Incasso vendita

```
incassoVendita = valoreCorrente × 0.98
```

### 9.4 ROI corrente

```
valoreTotalePortafoglio = Σ valoreCorrente(i) per tutti i giocatori in rosa
totalWealthInformativo = valoreTotalePortafoglio + liquiditàVirtuale
ROI = (valoreNettoLiquidabile + liquiditàVirtuale − capitaleVirtualeDepositato) / capitaleVirtualeDepositato × 100
```

### 9.5 Fascia squadra

```
mediaSquadra = Σ voto(i) / N    (solo giocatori con voto valido)
fascia = f(mediaSquadra)  secondo tabella soglie
```

### 9.6 Bonus/malus individuale

```
bonusPct = tabellaBonusMalus[fascia][votoIndividuale]
```

### 9.7 Ricavo sistema

```
ricavoSistema = Σ commissioni
```

### 9.8 Montepremi disponibile

Il modello base non prevede montepremi obbligatorio. Il montepremi dipende da una struttura opzionale/premium definita dall'admin per ogni stagione a premi e può provenire da quota opzionale, sponsor o fondo premi separato. Le commissioni trading sono trattenute dal sistema.

---

## 10. Requisiti non funzionali

### 10.1 Tracciabilità calcoli

Ogni calcolo di giornata deve essere riproducibile: i dati di input (voti, quotazioni) e i parametri di configurazione devono essere salvati insieme al risultato. Un calcolo deve poter essere rieseguito a partire dagli stessi input e produrre lo stesso output.

### 10.2 Auditabilità

Tutte le operazioni amministrative (import, calcolo, correzione, assegnazione premi) devono essere tracciate nell'audit log con timestamp, utente e dettaglio. Le operazioni dei partecipanti (acquisto, vendita) devono essere tracciate con timestamp, valore al momento dell'operazione, commissione applicata.

### 10.3 Esportazione dati

I dati di classifica, ROI, commissioni e operazioni devono essere esportabili in CSV e JSON. L'export deve includere tutti i campi necessari per verificare i calcoli offline.

### 10.4 Gestione errori import

Il sistema deve:
- elencare chiaramente le righe con errori nei file importati;
- descrivere il tipo di errore per ogni riga (campo mancante, formato errato, duplicato, valore fuori range);
- impedire l'import parziale: o il file passa la validazione completa, o viene rifiutato.

### 10.5 Sicurezza dati

- Le password devono essere memorizzate con hash sicuro (bcrypt o equivalente).
- I dati dei partecipanti non devono essere visibili ad altri partecipanti salvo quelli esplicitamente pubblici (nome/nickname, ROI in classifica).
- Le API devono essere protette da autenticazione e autorizzazione per ruolo.

### 10.6 Backup

I dati di stagione (quotazioni, voti, portafogli, operazioni, calcoli) devono essere esportabili e archiviabili prima di ogni operazione distruttiva (ricalcolo, chiusura stagione).

### 10.7 Coerenza tra portafogli e calcoli

Il sistema deve garantire che il valore dei portafogli sia coerente con i dati di input in ogni momento. Dopo ogni ricalcolo, tutti i portafogli devono essere aggiornati in modo atomico.

---

## 11. Cose fuori scope V1

Le funzionalità seguenti non sono richieste per il MVP V1:

- **Trading live con dati ufficiali in tempo reale:** le quotazioni giornata per giornata sono ancora sintetiche. Il trading live con dati Fantacalcio aggiornati in automatico richiede integrazione API non ancora disponibile.
- **Pagamenti reali automatici:** il modello base non implementa pagamenti. La gestione del montepremi reale con pagamenti digitali automatici è fuori scope. Eventuali premi vengono gestiti manualmente dall'admin in uno scenario separato.
- **Quota iscrizione obbligatoria:** fuori scope per il modello base free access. Eventuali quote sono solo opzionali/premium e richiedono decisione separata.
- **App mobile nativa:** l'app V1 è un'applicazione web responsive. Un'app nativa iOS/Android è fuori scope.
- **Notifiche push avanzate:** le notifiche in-app sono incluse. Notifiche push mobile native e email transazionali avanzate sono fuori scope.
- **Integrazioni API esterne non autorizzate:** qualsiasi integrazione con API di terze parti (Fantacalcio, provider di dati calcistici) richiede accordo separato prima dell'implementazione.
- **Super-admin multi-organizzazione:** gestione di più leghe indipendenti da un unico pannello è fuori scope per V1.
- **Mercato con offerte e aste:** il mercato V1 è a prezzo fisso (valore corrente + commissione). Aste e offerte sono fuori scope.

---

## 12. Roadmap MVP

### MVP 1 — Admin import dati e calcolo offline

Obiettivo: l'admin può gestire una stagione completa senza un'interfaccia utente partecipante.

Contenuto:
- modello dati: Season, Player, Quote, Vote, RoundCalculation;
- import quotazioni iniziali con validazione;
- import voti per giornata con validazione;
- calcolo giornata (bonus/malus, aggiornamento valori);
- export CSV risultati;
- audit log operazioni admin.

Valore: permette di gestire la stagione e validare i calcoli offline prima di coinvolgere i partecipanti.

### MVP 2 — Utenti e portafogli

Obiettivo: i partecipanti possono iscriversi, creare la rosa e vedere il proprio portafoglio.

Contenuto:
- registrazione e login;
- accesso libero alla stagione;
- creazione rosa con composizione obbligatoria e senza budget massimo;
- visualizzazione portafoglio e ROI;
- classifica generale.

Valore: primo test con utenti reali.

### MVP 3 — Mercato

Obiettivo: i partecipanti possono acquistare e vendere giocatori durante la stagione.

Contenuto:
- mercato con filtri e ricerca;
- acquisto con commissione 2%;
- vendita con commissione 2%;
- storico operazioni;
- avviso overtrading;
- aggiornamento in tempo reale del portafoglio dopo ogni operazione.

Valore: il gioco diventa interattivo.

### MVP 4 — Classifiche e premi opzionali

Obiettivo: la stagione ha un risultato finale su ROI%; eventuali premi sono un layer opzionale separato.

Contenuto:
- classifica soglia premi (ROI ≥ 7%);
- gestione struttura premi da admin;
- calcolo montepremi opzionale;
- assegnazione premi a fine stagione solo se configurati;
- notifiche risultato finale.

Valore: il ciclo di gioco è completo.

### MVP 5 — Dashboard pubblica e refinement

Obiettivo: esperienza utente completa e raffinata.

Contenuto:
- dashboard pubblica con classifica stagione corrente;
- grafici andamento ROI per partecipante;
- dettaglio calciatore con storico quotazioni e voti;
- sezione regolamento integrata;
- ottimizzazione performance e UX.

Valore: prodotto pronto per un pubblico più ampio.
