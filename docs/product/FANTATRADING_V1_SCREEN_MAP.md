# FantaTrading V1 — Mappa Schermate

**Versione:** 1.0  
**Data:** 2026-05-12  
**Stato:** Bozza operativa  
**Destinatari:** sviluppatori, UX designer

---

## Convenzioni

- `[P]` = schermata accessibile solo al partecipante autenticato
- `[A]` = schermata accessibile solo all'admin
- `[PUB]` = schermata pubblica (non richiede login)
- `→` = navigazione diretta (link / pulsante)
- `↩` = ritorno alla schermata precedente
- Ogni schermata ha un ID univoco (es. `SCR-P-01`)

Nota prodotto: il modello base V1 è `FREE_ACCESS_VIRTUAL_CAPITAL`. Le schermate devono comunicare accesso libero, nessuna quota iscrizione obbligatoria, capitale virtuale variabile, classifica principale su ROI% e premi/montepremi solo come scenario opzionale.

---

## Struttura ad alto livello

```
FantaTrading V1
├── Area pubblica
│   ├── Home / Landing page                    [PUB]  SCR-PUB-01
│   ├── Registrazione                          [PUB]  SCR-PUB-02
│   ├── Login                                  [PUB]  SCR-PUB-03
│   └── Recupero password                      [PUB]  SCR-PUB-04
│
├── Area partecipante
│   ├── Dashboard personale                    [P]    SCR-P-01
│   ├── Stagioni disponibili                   [P]    SCR-P-02
│   ├── Mercato                                [P]    SCR-P-03
│   │   └── Dettaglio calciatore               [P]    SCR-P-04
│   ├── Rosa / Portafoglio                     [P]    SCR-P-05
│   │   └── Dettaglio posizione                [P]    SCR-P-06
│   ├── Storico operazioni                     [P]    SCR-P-07
│   ├── Classifica                             [P]    SCR-P-08
│   │   ├── Classifica generale                [P]    SCR-P-08a
│   │   └── Classifica soglia premi            [P]    SCR-P-08b
│   ├── Regolamento                            [P]    SCR-P-09
│   ├── Notifiche                              [P]    SCR-P-10
│   └── Profilo e impostazioni                 [P]    SCR-P-11
│
└── Area admin
    ├── Dashboard admin                        [A]    SCR-A-01
    ├── Gestione stagioni                      [A]    SCR-A-02
    │   ├── Lista stagioni                     [A]    SCR-A-02a
    │   ├── Crea stagione                      [A]    SCR-A-02b
    │   └── Dettaglio stagione                 [A]    SCR-A-02c
    ├── Import dati                            [A]    SCR-A-03
    │   ├── Import quotazioni                  [A]    SCR-A-03a
    │   └── Import voti                        [A]    SCR-A-03b
    ├── Controllo qualità dati                 [A]    SCR-A-04
    ├── Calcolo giornata                       [A]    SCR-A-05
    ├── Gestione utenti                        [A]    SCR-A-06
    │   └── Dettaglio partecipante             [A]    SCR-A-06a
    ├── Gestione premi                         [A]    SCR-A-07
    ├── Audit log                              [A]    SCR-A-08
    └── Esportazione report                    [A]    SCR-A-09
```

---

## Area pubblica

### SCR-PUB-01 — Home / Landing page

**Scopo:** presentare FantaTrading, invitare alla registrazione o al login.

**Contenuto:**
- presentazione del gioco (cos'è FantaTrading, come funziona);
- evidenza accesso libero e capitale virtuale nel pilot;
- stagione corrente in corso (se pubblica): nome, numero partecipanti, giornata corrente;
- pulsante "Registrati" → `SCR-PUB-02`;
- pulsante "Accedi" → `SCR-PUB-03`.

**Navigazione uscita:**
- → Registrazione `SCR-PUB-02`
- → Login `SCR-PUB-03`

---

### SCR-PUB-02 — Registrazione

**Scopo:** creare un nuovo account partecipante.

**Contenuto:**
- campo email, nome, cognome, password, conferma password;
- pulsante "Registrati";
- link "Hai già un account? Accedi" → `SCR-PUB-03`.

**Navigazione uscita:**
- Registrazione riuscita → `SCR-P-01` Dashboard partecipante
- → `SCR-PUB-03` Login

---

### SCR-PUB-03 — Login

**Scopo:** autenticare un utente esistente.

**Contenuto:**
- campo email e password;
- pulsante "Accedi";
- link "Non hai un account? Registrati" → `SCR-PUB-02`;
- link "Password dimenticata?" → `SCR-PUB-04`.

**Navigazione uscita:**
- Login partecipante → `SCR-P-01` Dashboard
- Login admin → `SCR-A-01` Dashboard admin
- → `SCR-PUB-02`, → `SCR-PUB-04`

---

### SCR-PUB-04 — Recupero password

**Scopo:** inviare email di reset password.

**Contenuto:**
- campo email;
- pulsante "Invia link di recupero";
- messaggio di conferma (generico, non rivela se l'email esiste).

---

## Area partecipante

### SCR-P-01 — Dashboard personale

**Scopo:** vista riepilogativa dello stato del partecipante nella stagione corrente.

**Contenuto:**
- nome partecipante, stagione attiva;
- valore totale portafoglio corrente;
- ROI corrente con barra visiva: zona rossa (< 0%), zona gialla (0–7%), zona verde (≥ 7%);
- posizione in classifica (X su N);
- ultime 3–5 operazioni recenti;
- avvisi attivi (overtrading, calcolo giornata completato, avvisi admin);
- prossima giornata prevista (se disponibile).

**Navigazione uscita:**
- → `SCR-P-03` Mercato
- → `SCR-P-05` Rosa / Portafoglio
- → `SCR-P-08` Classifica
- → `SCR-P-07` Storico operazioni
- → `SCR-P-10` Notifiche
- → `SCR-P-02` Stagioni disponibili (se non iscritto a nessuna stagione)

**Stato speciale — nessuna stagione attiva:**
- mostra il messaggio "Nessuna stagione in corso. Iscriviti a una stagione disponibile."
- → `SCR-P-02` Stagioni disponibili

---

### SCR-P-02 — Stagioni disponibili

**Scopo:** mostrare le stagioni disponibili per l'iscrizione.

**Contenuto:**
- lista stagioni in stato `ISCRIZIONI_APERTE`;
- per ogni stagione: nome, data inizio, data fine, modello accesso libero, commissioni, soglia premio opzionale, numero iscritti;
- pulsante "Accedi" o "Partecipa" per ogni stagione.

**Navigazione uscita:**
- Iscrizione confermata → `SCR-P-03` Mercato (per creare la rosa)
- ↩ → `SCR-P-01` Dashboard

---

### SCR-P-03 — Mercato

**Scopo:** permettere al partecipante di cercare e acquistare giocatori.

**Contenuto:**
- barra di ricerca per nome;
- filtri: ruolo (P/D/C/A), fascia di prezzo, disponibilità (non in rosa / in rosa);
- ordinamento: quotazione crescente/decrescente, variazione, nome;
- lista giocatori (card o riga): nome, squadra reale, ruolo, quotazione corrente, variazione dalla quotazione iniziale, costo acquisto (inclusa commissione), pulsante "Acquista" (disabilitato se già in rosa o ruolo al massimo);
- riepilogo fisso in fondo o in sidebar: liquidità virtuale disponibile, capitale virtuale depositato, composizione rosa corrente (es. 3P/8D/5C/4A).

**Modale acquisto:**
- nome giocatore, valore corrente, commissione 2%, costo totale, liquidità dopo l'acquisto, eventuale capitale virtuale aggiunto;
- pulsante "Conferma acquisto" / "Annulla".

**Navigazione uscita:**
- Clic su giocatore → `SCR-P-04` Dettaglio calciatore
- ↩ → `SCR-P-01` Dashboard o `SCR-P-05` Rosa

---

### SCR-P-04 — Dettaglio calciatore

**Scopo:** visualizzare informazioni complete su un singolo giocatore.

**Contenuto:**
- anagrafica: nome, cognome, ruolo, squadra reale;
- quotazione corrente e variazione dall'inizio stagione;
- grafico andamento quotazione giornata per giornata (se disponibile);
- tabella voti stagione corrente: giornata, voto, votoFantasy, bonus/malus ricevuto %;
- se il giocatore è in rosa del partecipante: valore di acquisto, performance della posizione (variazione in %, in crediti);
- pulsante "Acquista" (se non in rosa) oppure "Vendi" (se in rosa).

**Navigazione uscita:**
- ↩ → `SCR-P-03` Mercato

---

### SCR-P-05 — Rosa / Portafoglio

**Scopo:** visualizzare e gestire i giocatori in rosa.

**Contenuto:**
- Sezione per ruolo (Portieri, Difensori, Centrocampisti, Attaccanti):
  - per ogni giocatore: nome, squadra reale, valore di acquisto, valore corrente, variazione in % e in crediti, pulsante "Vendi";
- Riepilogo in fondo:
  - liquidità virtuale disponibile;
  - capitale virtuale depositato;
  - valore totale portafoglio informativo;
  - commissioni cumulative pagate;
  - ROI corrente.

**Modale vendita:**
- nome giocatore, valore corrente, commissione 2%, incasso netto, liquidità virtuale dopo la vendita;
- avviso se la vendita porta la composizione sotto i minimi;
- pulsante "Conferma vendita" / "Annulla".

**Navigazione uscita:**
- Clic su giocatore → `SCR-P-04` Dettaglio calciatore
- → `SCR-P-03` Mercato (pulsante "Vai al mercato")
- ↩ → `SCR-P-01` Dashboard

---

### SCR-P-06 — Dettaglio posizione (opzionale per MVP)

**Scopo:** vista approfondita di una singola posizione nel portafoglio.

**Contenuto:**
- informazioni sul giocatore (come `SCR-P-04`);
- storico della posizione: quando è stato acquistato, a quale prezzo;
- andamento del valore della posizione giornata per giornata;
- contributo al ROI complessivo.

---

### SCR-P-07 — Storico operazioni

**Scopo:** visualizzare tutte le operazioni eseguite dal partecipante.

**Contenuto:**
- lista paginata, ordinata per data decrescente;
- per ogni riga: data/giornata, tipo (Acquisto/Vendita), nome giocatore, ruolo, valore al momento, commissione, saldo budget dopo l'operazione;
- filtri: tipo operazione, periodo, nome giocatore;
- pulsante "Esporta CSV".

**Navigazione uscita:**
- ↩ → `SCR-P-01` Dashboard

---

### SCR-P-08 — Classifica

**Scopo:** mostrare la posizione del partecipante rispetto agli altri.

**Tab 08a — Classifica generale:**
- tutti i partecipanti ordinati per ROI decrescente;
- colonne: posizione, nome (o nickname), ROI, valore portafoglio informativo, capitale virtuale depositato, operazioni;
- evidenziazione della propria riga;
- colorazione per fascia: rosso (< 0%), giallo (0–7%), verde (≥ 7%).

**Tab 08b — Classifica soglia premi:**
- tab opzionale, visibile solo se la stagione abilita premi;
- solo partecipanti con ROI ≥ 7%;
- struttura premi in evidenza (posizione → fascia premio);
- posizione del partecipante nella classifica premi.

**Navigazione uscita:**
- ↩ → `SCR-P-01` Dashboard

---

### SCR-P-09 — Regolamento

**Scopo:** fornire accesso al regolamento V1 completo.

**Contenuto:**
- testo del regolamento V1, organizzato per sezioni con navigazione interna (anchor);
- sezione specifica su accesso libero, capitale virtuale variabile, ROI% come ranking principale e total wealth informativo;
- sezione specifica sull'avviso overtrading;
- non modificabile.

**Navigazione uscita:**
- ↩ → qualsiasi schermata precedente

---

### SCR-P-10 — Notifiche

**Scopo:** raccogliere tutti gli avvisi e le comunicazioni per il partecipante.

**Contenuto:**
- lista cronologica notifiche, con badge "non letto";
- tipi di notifica: calcolo giornata completato, aggiornamento quotazioni, avviso overtrading, avvisi di sistema (inizio/fine iscrizioni, fine stagione);
- pulsante "Segna tutto come letto".

**Navigazione uscita:**
- Clic su notifica → schermata pertinente (es. ROI aggiornato → `SCR-P-05`)
- ↩ → `SCR-P-01` Dashboard

---

### SCR-P-11 — Profilo e impostazioni

**Scopo:** gestione account del partecipante.

**Contenuto:**
- visualizza e modifica: nome, cognome, email;
- modifica password;
- preferenze notifiche.

---

## Area admin

### SCR-A-01 — Dashboard admin

**Scopo:** panoramica operativa della stagione in corso.

**Contenuto:**
- stato stagione: etichetta e ultima giornata processata;
- numero partecipanti totali, con rosa completa, con rosa incompleta;
- percentuale partecipanti sopra soglia 0% e sopra soglia 7%;
- ricavo piattaforma accumulato;
- avvisi pendenti: voti da caricare, calcolo da eseguire, import in errore;
- accesso rapido alle operazioni principali.

**Navigazione uscita:**
- → tutte le sezioni admin

---

### SCR-A-02a — Lista stagioni

**Scopo:** gestire le stagioni esistenti e crearne di nuove.

**Contenuto:**
- lista stagioni con: nome, stato, date, numero partecipanti;
- filtro per stato;
- pulsante "Crea nuova stagione" → `SCR-A-02b`.

**Navigazione uscita:**
- Clic su stagione → `SCR-A-02c` Dettaglio stagione
- → `SCR-A-02b` Crea stagione

---

### SCR-A-02b — Crea stagione

**Scopo:** configurare una nuova stagione.

**Contenuto:**
- form con tutti i parametri della stagione (vedere F-A-02);
- anteprima riepilogativa prima del salvataggio;
- pulsante "Salva e crea".

---

### SCR-A-02c — Dettaglio stagione

**Scopo:** visualizzare e gestire una stagione specifica.

**Contenuto:**
- parametri configurati (non modificabili se stagione in corso);
- stato corrente con possibilità di transizione (es. "Apri iscrizioni", "Avvia stagione", "Chiudi stagione");
- statistiche: partecipanti, giornate processate, ROI medio.

---

### SCR-A-03a — Import quotazioni

**Scopo:** caricare le quotazioni iniziali o gli aggiornamenti.

**Contenuto:**
- selettore stagione;
- selettore tipo import (iniziali / aggiornamento);
- area upload file (drag & drop + selezione);
- risultato validazione in tempo reale;
- anteprima dati (prime N righe + statistiche);
- pulsante "Conferma import" (abilitato solo se validazione ok).

---

### SCR-A-03b — Import voti

**Scopo:** caricare i voti di una giornata.

**Contenuto:**
- selettore stagione e numero giornata;
- area upload file;
- risultato validazione con lista errori se presenti;
- anteprima: numero giocatori con voto, lista SV derivati (giocatori in rosa non nel file);
- pulsante "Conferma import".

---

### SCR-A-04 — Controllo qualità dati

**Scopo:** verificare la coerenza dei dati importati.

**Contenuto:**
- per giornata selezionata:
  - matched (giocatori con sia quotazione che voto);
  - solo quotazione (giocatori con quotazione ma senza voto);
  - solo voto (giocatori con voto ma senza quotazione);
  - SV derivati con breakdown per partecipante;
- anomalie rilevate: voti fuori range, variazioni quotazione eccessive, duplicati.

---

### SCR-A-05 — Calcolo giornata

**Scopo:** eseguire il calcolo bonus/malus per una giornata.

**Contenuto:**
- selettore stagione e giornata;
- stato prerequsiti: voti caricati (sì/no), calcolo già eseguito (sì/no);
- pulsante "Lancia calcolo";
- progress indicator durante il calcolo;
- riepilogo post-calcolo: partecipanti processati, variazione media portafoglio, errori;
- pulsante "Riesegui calcolo" (visibile se già eseguito, con avviso).

---

### SCR-A-06 — Gestione utenti

**Scopo:** monitorare i partecipanti iscritti.

**Contenuto:**
- lista partecipanti con: nome, email, stato iscrizione, composizione rosa, ROI corrente;
- filtri: stato rosa (completa/incompleta), fascia ROI;
- clic su partecipante → `SCR-A-06a` Dettaglio partecipante.

---

### SCR-A-06a — Dettaglio partecipante

**Scopo:** vista admin completa di un partecipante.

**Contenuto:**
- anagrafica;
- portafoglio attuale con valori;
- storico operazioni;
- ROI per giornata;
- azioni admin: disattiva account (con registrazione audit).

---

### SCR-A-07 — Gestione premi

**Scopo:** configurare e assegnare i premi a fine stagione.

**Contenuto:**
- struttura premi: numero posizioni, percentuale montepremi per posizione;
- calcolo montepremi disponibile solo per scenario opzionale/premium a premi;
- lista partecipanti sopra soglia 7% con posizione e importo premio;
- pulsante "Assegna premi" (solo a stagione terminata).

---

### SCR-A-08 — Audit log

**Scopo:** tracciare tutte le operazioni amministrative.

**Contenuto:**
- lista cronologica, non modificabile;
- per ogni entry: timestamp, admin, tipo operazione, dettaglio, stato (successo/errore);
- filtri: tipo operazione, periodo, admin;
- export CSV.

---

### SCR-A-09 — Esportazione report

**Scopo:** esportare i dati della stagione.

**Contenuto:**
- selettore stagione;
- lista tipi di export disponibili con descrizione;
- selettore formato (CSV / JSON);
- pulsante "Genera ed esporta";
- storico degli export precedenti.

---

## Transizioni di stato stagione

```
CONFIGURATA
    │
    ▼ (import quotazioni confermato)
QUOTAZIONI_CARICATE
    │
    ▼ (admin apre iscrizioni)
ISCRIZIONI_APERTE
    │
    ▼ (admin avvia stagione — data inizio)
IN_CORSO
    │
    ▼ (admin chiude stagione — ultima giornata)
CHIUSURA
    │
    ▼ (premi assegnati, se scenario opzionale attivo)
TERMINATA
```

---

## Navigazione globale partecipante

La navigazione principale è sempre accessibile tramite menu fisso:

```
[Dashboard]  [Mercato]  [La mia Rosa]  [Classifica]  [Storico]  [Notifiche]  [Regolamento]
```

Icona profilo in alto a destra: accesso a `SCR-P-11` Profilo e logout.

---

## Navigazione globale admin

La navigazione principale admin è sempre accessibile tramite sidebar:

```
[Dashboard Admin]
[Gestione Stagioni]
[Import Dati]
[Controllo Qualità]
[Calcolo Giornata]
[Gestione Utenti]
[Gestione Premi]
[Audit Log]
[Esportazione Report]
[Logout]
```
