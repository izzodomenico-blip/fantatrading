# FantaTrading V1 — Flussi Utente

**Versione:** 1.0  
**Data:** 2026-05-12  
**Stato:** Bozza operativa  
**Destinatari:** sviluppatori, UX designer, QA

---

## Convenzioni

Ogni flusso è descritto con:
- **Attore:** chi esegue il flusso;
- **Precondizioni:** cosa deve essere vero prima che il flusso inizi;
- **Passi:** sequenza di azioni;
- **Postcondizioni:** stato del sistema dopo il completamento;
- **Eccezioni:** cosa succede se qualcosa va storto.

---

## Flussi partecipante

---

### F-P-01 — Registrazione

**Attore:** utente non registrato  
**Precondizioni:** la piattaforma è attiva e accetta nuove registrazioni

**Passi:**
1. L'utente apre la pagina di registrazione.
2. Inserisce nome, cognome, email e password.
3. Conferma la password.
4. Invia il modulo.
5. Il sistema verifica che l'email non sia già registrata.
6. Il sistema crea l'account con ruolo `PARTECIPANTE`.
7. L'utente viene reindirizzato alla dashboard personale (o alla pagina di conferma email se abilitata).

**Postcondizioni:** account creato, utente autenticato.

**Eccezioni:**
- Email già registrata → messaggio di errore "Email già in uso".
- Password troppo corta o non conforme → messaggio con requisiti minimi.
- Errore di rete → messaggio generico, dati del modulo conservati.

---

### F-P-02 — Login

**Attore:** partecipante registrato  
**Precondizioni:** account esistente

**Passi:**
1. L'utente apre la pagina di login.
2. Inserisce email e password.
3. Il sistema verifica le credenziali.
4. Se corrette, crea la sessione e reindirizza alla dashboard personale.

**Postcondizioni:** sessione attiva.

**Eccezioni:**
- Credenziali errate → messaggio "Email o password non validi" (senza indicare quale dei due è errato).
- Account disabilitato → messaggio "Account non attivo, contatta l'organizzatore".

---

### F-P-03 — Iscrizione a una stagione

**Attore:** partecipante autenticato  
**Precondizioni:** esiste almeno una stagione in stato "iscrizioni aperte"; il partecipante non è già iscritto

**Passi:**
1. Il partecipante accede alla sezione "Stagioni disponibili".
2. Visualizza la lista delle stagioni aperte con: nome, date, budget iniziale, commissioni, soglia premio.
3. Seleziona la stagione di interesse.
4. Legge il riepilogo dei parametri regolamentari.
5. Conferma l'iscrizione.
6. Il sistema crea il portafoglio del partecipante con il budget iniziale definito dalla stagione.
7. Il partecipante viene reindirizzato alla schermata "Crea la tua rosa".

**Postcondizioni:** portafoglio creato con budget iniziale, rosa vuota, stato `ROSA_INCOMPLETA`.

**Eccezioni:**
- Stagione chiusa alle iscrizioni → messaggio "Iscrizioni chiuse per questa stagione".
- Partecipante già iscritto → messaggio "Sei già iscritto a questa stagione".

---

### F-P-04 — Creazione rosa iniziale

**Attore:** partecipante iscritto con rosa incompleta  
**Precondizioni:** portafoglio creato, rosa vuota o parzialmente compilata; quotazioni iniziali disponibili

**Passi:**
1. Il partecipante accede al mercato.
2. Filtra per ruolo per costruire la rosa in modo sistematico.
3. Seleziona un giocatore e visualizza: nome, ruolo, squadra reale, quotazione, costo acquisto (inclusa commissione 2%).
4. Conferma l'acquisto.
5. Il sistema verifica:
   - budget sufficiente;
   - ruolo non già al massimo (es. non può acquistare un 4° portiere);
   - giocatore non già in rosa.
6. Se le verifiche passano: scala il costo dal budget, aggiunge il giocatore alla rosa.
7. Il partecipante ripete i passi 2–6 fino a completare la rosa (25 giocatori: 3P + 8D + 8C + 6A).
8. Quando la rosa è completa, lo stato cambia in `ROSA_ATTIVA`.

**Postcondizioni:** rosa completa, budget ridotto, stato `ROSA_ATTIVA`.

**Eccezioni:**
- Budget insufficiente per il giocatore selezionato → messaggio con costo e budget disponibile.
- Ruolo al massimo → messaggio "Hai già il numero massimo di [ruolo]".
- Giocatore già in rosa → pulsante acquisto disabilitato con tooltip.
- Budget residuo non sufficiente a completare la rosa → avviso "Attenzione: con questo acquisto potresti non avere budget sufficiente per completare la rosa".

---

### F-P-05 — Acquisto di un giocatore (durante la stagione)

**Attore:** partecipante con rosa attiva  
**Precondizioni:** stagione in corso; partecipante ha budget disponibile; il giocatore non è in rosa; il ruolo del giocatore non è al massimo

**Passi:**
1. Il partecipante cerca il giocatore nel mercato.
2. Visualizza la scheda giocatore: nome, ruolo, squadra reale, quotazione corrente, costo totale con commissione.
3. Clicca "Acquista".
4. Il sistema mostra la modale di conferma con: nome giocatore, valore, commissione 2%, costo totale, budget residuo dopo l'acquisto.
5. Il partecipante conferma.
6. Il sistema registra l'operazione, aggiorna il budget, aggiunge il giocatore alla rosa.

**Postcondizioni:** giocatore in rosa, budget ridotto, operazione registrata nello storico.

**Eccezioni:**
- Budget insufficiente → messaggio con costo richiesto e budget disponibile.
- Ruolo al massimo → pulsante acquisto disabilitato.
- Stagione non in corso (es. calcolo in corso) → operazioni temporaneamente bloccate con messaggio.

---

### F-P-06 — Vendita di un giocatore

**Attore:** partecipante con rosa attiva  
**Precondizioni:** stagione in corso; il giocatore è in rosa; la vendita non porta la composizione sotto i minimi per ruolo (o viene gestita come parte di uno scambio)

**Passi:**
1. Il partecipante accede alla schermata Rosa.
2. Seleziona il giocatore da vendere.
3. Il sistema mostra la modale di conferma con: nome giocatore, valore corrente, commissione 2%, incasso netto, budget dopo la vendita.
4. Il partecipante conferma.
5. Il sistema registra l'operazione, aggiorna il budget, rimuove il giocatore dalla rosa.

**Postcondizioni:** giocatore rimosso dalla rosa, budget aumentato, operazione registrata nello storico.

**Eccezioni:**
- La vendita porterebbe la rosa sotto i minimi per ruolo → avviso. Comportamento: da definire per V1 (blocco oppure permesso con warning).
- Il giocatore non è in rosa (es. doppio click) → nessuna operazione, messaggio di errore.

---

### F-P-07 — Consultazione portafoglio e ROI

**Attore:** partecipante autenticato  
**Precondizioni:** iscritto a una stagione, rosa attiva

**Passi:**
1. Il partecipante accede alla schermata Rosa / Portafoglio.
2. Visualizza l'elenco dei giocatori in rosa con: nome, ruolo, valore di acquisto, valore corrente, variazione in % e in crediti.
3. Visualizza il riepilogo in fondo: budget disponibile, valore totale portafoglio, commissioni cumulative.
4. Accede alla tab ROI per visualizzare: ROI corrente, indicatori grafici rispetto alle soglie 0% e 7%, andamento storico giornata per giornata.

**Postcondizioni:** nessuna modifica al sistema.

---

### F-P-08 — Consultazione classifica

**Attore:** partecipante autenticato  
**Precondizioni:** iscritto a una stagione

**Passi:**
1. Il partecipante accede alla schermata Classifica.
2. Visualizza la classifica generale con: posizione, nome, ROI, valore portafoglio, numero operazioni.
3. Può passare alla vista "Classifica soglia premi" per vedere solo i partecipanti con ROI ≥ 7%.
4. La propria posizione è evidenziata.

**Postcondizioni:** nessuna modifica al sistema.

---

### F-P-09 — Consultazione storico operazioni

**Attore:** partecipante autenticato  
**Precondizioni:** ha eseguito almeno un'operazione

**Passi:**
1. Il partecipante accede alla schermata Storico Operazioni.
2. Visualizza la lista paginata di tutte le operazioni: data, tipo, giocatore, valore, commissione, saldo.
3. Può filtrare per tipo (acquisto / vendita) e per periodo.
4. Può esportare in CSV.

**Postcondizioni:** nessuna modifica al sistema.

---

## Flussi admin

---

### F-A-01 — Login admin

**Attore:** admin  
**Precondizioni:** account admin creato

**Passi:**
1. L'admin apre la pagina di login admin (URL separato o flag ruolo).
2. Inserisce email e password.
3. Il sistema verifica le credenziali e il ruolo `ADMIN`.
4. Reindirizza alla dashboard admin.

**Postcondizioni:** sessione admin attiva.

**Eccezioni:**
- Credenziali errate → messaggio errore.
- Account con ruolo `PARTECIPANTE` che tenta accesso admin → accesso negato.

---

### F-A-02 — Creazione stagione

**Attore:** admin  
**Precondizioni:** nessuna stagione in corso in conflitto (da definire per V1)

**Passi:**
1. L'admin accede a Gestione Stagioni → Nuova stagione.
2. Inserisce: nome, stagione calcistica (es. 2025/26), data inizio iscrizioni, data fine iscrizioni, data inizio stagione, data fine stagione prevista, numero giornate, budget iniziale partecipanti.
3. Configura i parametri regolamentari: commissione acquisto (default 2%), commissione vendita (default 2%), platform fee (default 10%), soglia sopravvivenza (0%), soglia premio (7%), policy SV (default PLAYER_ZERO_TEAM_EXCLUDE).
4. Salva la stagione in stato `CONFIGURATA`.
5. Il sistema registra la creazione nell'audit log.

**Postcondizioni:** stagione creata in stato `CONFIGURATA`.

**Eccezioni:**
- Date non valide (es. fine iscrizioni dopo inizio stagione) → errore di validazione.

---

### F-A-03 — Import quotazioni iniziali

**Attore:** admin  
**Precondizioni:** stagione in stato `CONFIGURATA` o `ISCRIZIONI_APERTE`

**Passi:**
1. L'admin accede a Import Dati → Import Quotazioni.
2. Seleziona la stagione di destinazione.
3. Carica il file (CSV o Excel).
4. Il sistema esegue la validazione:
   - colonne obbligatorie presenti (playerId, nome, ruolo, quotazioneIniziale, squadraReale);
   - ruoli validi (P/D/C/A);
   - quotazioneIniziale > 0 per ogni riga;
   - nessun duplicato playerId per la stessa stagione.
5. Se ci sono errori, il sistema mostra la lista delle righe problematiche con tipo di errore. L'import viene bloccato.
6. Se la validazione passa, mostra l'anteprima: numero giocatori importati per ruolo, range quotazioni.
7. L'admin conferma l'import.
8. Il sistema salva i dati e aggiorna lo stato della stagione in `QUOTAZIONI_CARICATE`.
9. L'operazione viene registrata nell'audit log.

**Postcondizioni:** quotazioni iniziali caricate, stagione in stato `QUOTAZIONI_CARICATE`.

**Eccezioni:**
- File non nel formato atteso → errore con descrizione del formato atteso.
- Validazione fallita → lista errori, import non eseguito.

---

### F-A-04 — Apertura iscrizioni

**Attore:** admin  
**Precondizioni:** stagione in stato `QUOTAZIONI_CARICATE`

**Passi:**
1. L'admin porta la stagione in stato `ISCRIZIONI_APERTE`.
2. I partecipanti possono ora iscriversi.
3. L'admin può monitorare il numero di iscritti in tempo reale.

**Postcondizioni:** stagione aperta alle iscrizioni.

---

### F-A-05 — Import voti giornata

**Attore:** admin  
**Precondizioni:** stagione in stato `IN_CORSO`; i voti della giornata sono disponibili

**Passi:**
1. L'admin accede a Import Dati → Import Voti.
2. Seleziona la stagione e la giornata.
3. Carica il file voti (CSV o Excel).
4. Il sistema esegue la validazione:
   - colonne obbligatorie (stagione, giornata, playerId, voto, votoFantasy);
   - voti nel range valido (es. 0–10);
   - nessun duplicato stagione+giornata+playerId.
5. Se ci sono errori, li elenca. Import bloccato.
6. Se la validazione passa, il sistema mostra l'anteprima:
   - numero giocatori con voto caricato;
   - numero SV derivati per assenza (giocatori in almeno una rosa che non compaiono nel file).
7. L'admin conferma.
8. Il sistema salva i voti e registra gli SV derivati.

**Postcondizioni:** voti della giornata caricati, SV derivati tracciati.

**Eccezioni:**
- Voti già caricati per quella giornata → avviso "Voti già presenti per la giornata X. Vuoi sovrascrivere?".

---

### F-A-06 — Calcolo giornata

**Attore:** admin  
**Precondizioni:** voti della giornata caricati; stagione `IN_CORSO`

**Passi:**
1. L'admin accede a Calcolo Giornata.
2. Seleziona la stagione e la giornata.
3. Il sistema verifica che i voti siano stati caricati per quella giornata.
4. L'admin lancia il calcolo.
5. Il sistema, per ogni partecipante:
   a. Calcola la media squadra sui giocatori con voto valido (escludendo gli SV).
   b. Determina la fascia squadra.
   c. Per ogni giocatore con voto, applica il bonus/malus individuale dalla tabella ufficiale.
   d. Aggiorna il valore corrente di ogni posizione.
   e. Ricalcola il ROI del partecipante.
6. Il sistema mostra il riepilogo: partecipanti processati, variazione media portafoglio, errori eventuali.
7. L'admin conferma la validazione del calcolo.
8. La classifica viene aggiornata.
9. L'operazione viene registrata nell'audit log.

**Postcondizioni:** valori portafogli aggiornati, classifica aggiornata, calcolo tracciato.

**Eccezioni:**
- Voti non caricati → blocco con messaggio "Caricare prima i voti per la giornata X".
- Calcolo già eseguito per quella giornata → avviso con possibilità di rieseguire (dopo correzione dati).

---

### F-A-07 — Chiusura stagione e gestione premi

**Attore:** admin  
**Precondizioni:** ultima giornata calcolata; stagione in stato `IN_CORSO`

**Passi:**
1. L'admin verifica che tutti i calcoli di giornata siano stati eseguiti.
2. Porta la stagione in stato `CHIUSURA`.
3. Il sistema congela la classifica finale.
4. L'admin accede a Gestione Premi.
5. Visualizza la lista dei partecipanti con ROI ≥ 7% (soglia premio).
6. Verifica la struttura premi configurata (posizioni, percentuali).
7. Conferma l'assegnazione premi.
8. Il sistema genera la lista vincitori con importi.
9. L'admin porta la stagione in stato `TERMINATA`.
10. Tutte le operazioni vengono registrate nell'audit log.

**Postcondizioni:** stagione terminata, classifica finale congelata, premi assegnati.

**Eccezioni:**
- Nessun partecipante sopra soglia 7% → il sistema avvisa; i premi possono essere redistribuiti secondo regole alternative definite dall'admin.

---

### F-A-08 — Esportazione report

**Attore:** admin  
**Precondizioni:** stagione esistente (qualsiasi stato)

**Passi:**
1. L'admin accede a Esportazione Report.
2. Seleziona la stagione e il tipo di export:
   - classifica finale con ROI;
   - dettaglio commissioni per partecipante;
   - ricavo piattaforma;
   - storico calcoli giornata per giornata;
   - lista vincitori premi.
3. Seleziona il formato (CSV o JSON).
4. Scarica il file.

**Postcondizioni:** file esportato, operazione registrata nell'audit log.

---

## Flussi di sistema (automatici)

---

### F-S-01 — Apertura mercato per la stagione

**Trigger:** la stagione passa in stato `IN_CORSO` (data inizio stagione raggiunta)  
**Azioni:**
- Il mercato viene aperto ai partecipanti con rosa completa.
- I partecipanti con rosa incompleta ricevono una notifica di avviso.

---

### F-S-02 — Aggiornamento ROI dopo calcolo giornata

**Trigger:** il calcolo della giornata viene confermato dall'admin  
**Azioni:**
- Per ogni partecipante: ricalcolo del valore totale portafoglio e del ROI.
- Aggiornamento classifica.
- Invio notifica ai partecipanti: "Calcolo giornata X completato. Il tuo ROI è [X]%.".

---

### F-S-03 — Avviso overtrading

**Trigger:** un partecipante supera N cambi in M giornate (soglia da definire, es. 5 cambi in 3 giornate)  
**Azioni:**
- Il sistema mostra un avviso nella dashboard del partecipante.
- L'avviso spiega che operare frequentemente tende a ridurre il rendimento a causa dell'accumulo di commissioni.
- L'avviso non blocca le operazioni: è informativo.

---

### F-S-04 — Derivazione SV

**Trigger:** import voti completato  
**Azioni:**
- Per ogni stagione + giornata, il sistema confronta i giocatori nel file voti con i giocatori presenti in almeno una rosa attiva.
- I giocatori in rosa non presenti nel file voti vengono marcati come SV per quella giornata.
- Il numero di SV derivati viene tracciato per ogni giornata.
