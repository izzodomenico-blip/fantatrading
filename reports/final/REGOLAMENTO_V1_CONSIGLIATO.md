# FantaTrading - Regolamento V1 Consigliato

## 1. Regolamento originale di partenza

Il regolamento originale FantaTrading parte da questi elementi:

- rosa da 25 giocatori;
- composizione rosa: 3 P, 8 D, 8 C, 6 A;
- commissione acquisto: 2%;
- commissione vendita: 1.25%;
- rendimento da quotazione: `(Qt.A - Qt.I) * 5`;
- sell value con floor a zero;
- bonus/malus ufficiale per fascia squadra e voto individuale;
- tabella bonus/malus ufficiale gia inserita in `src/config/teamBandBonusTables.ts`;
- `isOfficial = true`;
- `source = Regolamento FantaTrading originale`.

La tabella ufficiale usa cinque fasce squadra:

| Fascia | Media squadra |
|--------|---------------|
| FASCIA_0 | < 5 |
| FASCIA_1 | >= 5 e < 5.5 |
| FASCIA_2 | >= 5.5 e < 6 |
| FASCIA_3 | >= 6 e < 6.5 |
| FASCIA_4 | >= 6.5 |

La gestione SV non e parte ufficiale della tabella bonus/malus: resta una regola separata e configurabile.

## 2. Problemi emersi dai backtest

Dai backtest full-rules emergono quattro problemi principali:

- la policy SV `ZERO` distrugge il portafoglio, perche ogni SV abbassa anche la media squadra;
- la policy `PLAYER_MALUS_TEAM_EXCLUDE` con malus -5% giornaliero e troppo severa;
- la soglia premio 5% e molto inclusiva e aumenta troppo il numero stimato di vincitori;
- la strategia `VALUE` resta forte e va monitorata, perche potrebbe sfruttare inefficienze visibili solo con dati Qt.I -> Qt.A.

Nel full-rules backtest, `PLAYER_ZERO_TEAM_EXCLUDE` e la policy piu stabile tra quelle coerenti con una gestione prudente degli SV:

| Policy SV | ROI medio full-rules | % > 0 | % > 5 | % > 7 | % > 10 |
|-----------|----------------------|-------|-------|-------|--------|
| PLAYER_ZERO_TEAM_EXCLUDE | -1.19% | 47.32% | 28.76% | 21.60% | 14.32% |
| EXCLUDE | -1.32% | 46.24% | 28.12% | 21.16% | 13.20% |
| FIVE | -2.00% | 44.80% | 27.20% | 20.40% | 12.80% |
| ZERO | -48.29% | 0.00% | 0.00% | 0.00% | 0.00% |
| PLAYER_MALUS_TEAM_EXCLUDE | -40.11% | 0.00% | 0.00% | 0.00% | 0.00% |

## 3. Perche la soglia 5% e troppo bassa

La soglia 5% e troppo bassa per un regolamento V1 per tre motivi:

- genera troppi vincitori stimati;
- aumenta il rischio che strategie forti come `VALUE` raccolgano premi troppo spesso;
- lascia meno margine alla piattaforma se il sistema premi e finanziato principalmente dalle commissioni.

Nel full-rules stress test, con `PLAYER_ZERO_TEAM_EXCLUDE`, soglia 5%, platform fee 15% e sell fee 1.25%, la quota sopra soglia arriva al 27.36%. Questo livello e attrattivo per gli utenti, ma rischia di essere troppo generoso per un regolamento da mettere in produzione.

## 4. Perche si propone soglia 7%

La soglia 7% e un compromesso migliore:

- resta raggiungibile;
- riduce il numero di vincitori rispetto al 5%;
- non diventa selettiva quanto 10% o 12%;
- mantiene attrattivita media senza scaricare troppo rischio economico sulla piattaforma.

Nel full-rules stress test la raccomandazione V1 converge su:

- soglia premio: 7%;
- NoVotePolicy: `PLAYER_ZERO_TEAM_EXCLUDE`;
- commissione vendita: 2%;
- platform fee: 10%.

## 5. Perche commissione vendita 2%

La commissione vendita originale, 1.25%, e coerente con il regolamento di partenza ma debole per sostenere un modello con premi.

La commissione vendita al 2% e proposta perche:

- aumenta moderatamente il ricavo ricorrente;
- non stravolge la struttura originale;
- riduce leggermente ROI eccessivi senza annullare la giocabilita;
- migliora la sostenibilita rispetto al modello originale puro.

La commissione vendita 3% migliora ulteriormente la piattaforma, ma risulta piu aggressiva e peggiora l attrattivita utente. Per V1, 2% e il compromesso piu prudente.

### Conferma dal confronto fee intra-stagione

Il confronto tra commissione vendita 1.25% (scenario A) e 2% (scenario B) condotto con il backtest intra-stagione a quotazioni sintetiche (ROLE_BONUS_SENSITIVE, stagioni 2023/24 e 2024/25) ha prodotto i seguenti risultati quantitativi:

| Metrica | Scenario A (1.25%) | Scenario B (2%) | Delta |
|---------|-------------------|-----------------|-------|
| HOLD ROI medio | 5.30% | 4.50% | -0.80pp |
| Ricavo piattaforma medio | baseline | +21.3% | +21.3% |

La commissione al 2% penalizza il partecipante in HOLD di soli 0.80 punti percentuali, ma aumenta il ricavo medio della piattaforma del 21.3%. Questo rapporto costo/beneficio conferma la scelta per V1. Nota: i valori assoluti derivano da quotazioni sintetiche esplorative, non ufficiali Fantacalcio; la direzione del confronto e tuttavia robusta.

## 6. Perche PLAYER_ZERO_TEAM_EXCLUDE per gli SV

I file voti contengono solo giocatori con voto effettivo. Quindi gli SV devono essere derivati per assenza:

- se un giocatore in rosa non compare in `season + round + playerId`, allora e SV;
- `played=false`;
- `vote=null`;
- `fantasyVote=null`.

La policy consigliata e `PLAYER_ZERO_TEAM_EXCLUDE`:

- lo SV non entra nella media squadra;
- lo SV non abbassa la fascia dei compagni;
- il giocatore SV riceve effetto fantasy giornaliero 0%;
- il numero di SV derivati viene comunque tracciato.

Questa policy e preferibile per V1 perche la gestione SV non e ancora ufficiale. Penalizzare con -5% giornaliero, come in `PLAYER_MALUS_TEAM_EXCLUDE`, e risultato troppo severo nei backtest.

## 7. Rischi residui della strategia VALUE

`VALUE` resta la strategia piu forte o tra le piu forti.

Nel full-rules backtest:

- `VALUE + PLAYER_ZERO_TEAM_EXCLUDE` ha ROI full-rules medio 6.61%;
- `VALUE + PLAYER_ZERO_TEAM_EXCLUDE` supera il 5% nel 57.60% dei casi;
- `VALUE` resta competitiva rispetto a `RANDOM`, con delta medio positivo.

Nel full-rules stress test il rischio dominanza VALUE e classificato MEDIUM nella raccomandazione V1.

Il rischio non e ancora sufficiente per bloccare la strategia, ma e abbastanza chiaro da richiedere ulteriori test con quotazioni giornata per giornata.

## 8. Sostenibilita della piattaforma

Il modello originale puro non e sufficiente per sostenere una piattaforma con premi, perche le commissioni originali sono basse e non trattengono margine rilevante.

Il modello Originale + 10% margine resta fragile se applicato senza aggiustamenti, ma migliora con:

- commissione vendita al 2%;
- soglia premio al 7%;
- platform fee del 10% sulle commissioni;
- policy SV non distruttiva.

La sostenibilita nel report resta classificata LOW perche il modello considera solo la quota piattaforma sulle commissioni. Prima della decisione definitiva servono anche ipotesi su:

- quota iscrizione;
- numero utenti;
- volume medio di compravendite;
- struttura premi finale;
- retention attesa.

## 9. Backtest intra-stagione con quotazioni sintetiche

E stato condotto un backtest intra-stagione usando quotazioni sintetiche round-by-round (modello ROLE_BONUS_SENSITIVE, MAE 1.46 punti) e voti reali per stagioni completed 2023/24 e 2024/25.

**Risultato principale per HOLD:** ROI medio 5.30% (scenario A, vendita 1.25%) e 4.50% (scenario B, vendita 2%). Valori coerenti con il full-rules backtest.

**Il trading attivo non batte HOLD in nessuno scenario testato.** Mediando su tutte le configurazioni di parametri (frequenza, limiti cambi, soglie), la miglior strategia attiva (HYBRID_VALUE_MOMENTUM) arriva a -15.04% vs HOLD 5.30%. Anche prendendo la configurazione ottimale per ogni strategia, il divario e netto.

| Strategia (best config) | ROI scenario A | ROI scenario B |
|------------------------|----------------|----------------|
| HOLD | 5.30% | 4.50% |
| VALUE_ROTATION | -1.86% | -2.46% |
| HYBRID_VALUE_MOMENTUM | -0.24% | -0.94% |
| MOMENTUM | -24.34% | -24.67% |
| TAKE_PROFIT | -29.29% | -29.77% |

**Cambi frequenti e pericolosi.** MOMENTUM con configurazione aggressiva (max 5 cambi ogni 3 giornate) raggiunge ROI medio -57.5%, TAKE_PROFIT -37.4%. Le commissioni rappresentano il principale fattore di erosione del rendimento.

**Conclusione:** I cambi non vanno limitati per regolamento, ma il partecipante deve essere consapevole che ogni cambio ha un costo (acquisto 2% + vendita 2%) e che operare frequentemente tende a ridurre, non aumentare, il rendimento finale.

**Avvertenza:** tutti i valori derivano da quotazioni sintetiche, non ufficiali Fantacalcio. Il backtest e esplorativo. La conferma richiede quotazioni giornata per giornata ufficiali.

## 10. Limiti attuali

Il limite principale e l assenza di quotazioni ufficiali giornata per giornata.

I backtest attuali usano:

- Qt.I a inizio stagione;
- Qt.A a fine stagione;
- voti reali giornata per giornata;
- bonus/malus ufficiale;
- SV derivati per assenza nel round;
- quotazioni sintetiche round-by-round (per backtest intra-stagione esplorativo).

Mancano ancora:

- quotazioni giornata per giornata ufficiali Fantacalcio;
- timing reale di acquisto/vendita;
- effetti di infortuni e trasferimenti sul comportamento degli utenti;
- liquidita e vincoli di mercato;
- verifica della strategia VALUE con prezzi dinamici ufficiali;
- conferma del backtest intra-stagione con dati non sintetici.

Quindi il regolamento V1 e consigliato come baseline, non come versione definitiva blindata.

## 11. Regolamento V1 proposto

### Rosa

- 25 giocatori totali.
- 3 portieri.
- 8 difensori.
- 8 centrocampisti.
- 6 attaccanti.

### Commissioni

- Commissione acquisto: 2%.
- Commissione vendita: 2%.
- Platform fee: 10% delle commissioni.

### Quotazioni

- Rendimento quotazione: `(Qt.A - Qt.I) * 5`.
- Rendimento minimo: -100%.
- Sell value con floor a zero.

### Voti e bonus/malus

- Usare tabella bonus/malus ufficiale FantaTrading.
- Fascia squadra calcolata sulla media dei giocatori con voto valido.
- Bonus/malus individuale applicato in base a fascia squadra + voto individuale.

### Senza voto

Policy consigliata: `PLAYER_ZERO_TEAM_EXCLUDE`.

- Lo SV e derivato per assenza del giocatore nel file voti della giornata.
- Lo SV e escluso da somma/media/fascia squadra.
- Lo SV ha effetto fantasy individuale 0%.
- Gli SV derivati vanno tracciati.

### Cambi durante la stagione

- I cambi sono liberi: non esiste un numero massimo per finestra o per stagione.
- Ogni operazione di vendita seguita da acquisto genera commissione vendita 2% + commissione acquisto 2%.
- Il regolamento deve avvisare esplicitamente che operare frequentemente tende a ridurre il rendimento finale a causa dell accumulo di commissioni.
- Non esiste un limite regolamentare, ma il costo delle commissioni e il freno naturale all overtrading.

### Premi

- Soglia premio consigliata: ROI 7%.
- La soglia 5% resta troppo inclusiva.
- Le soglie 10% e 12% sono piu prudenti ma meno attrattive.

### Stagioni considerate

- 2023/24 e 2024/25 sono le stagioni completed usate per raccomandazioni.
- 2025/26 resta in_progress e non va usata per decisioni definitive.

## 12. Cosa serve prima di considerarlo definitivo

Prima di rendere V1 definitivo servono:

- quotazioni ufficiali Fantacalcio giornata per giornata;
- simulazione di utenti con acquisti e vendite durante la stagione su dati non sintetici;
- stress test con quote iscrizione e montepremi reale;
- validazione economica su numero utenti e volume medio operazioni;
- controllo ulteriore della strategia VALUE su dati dinamici ufficiali;
- decisione ufficiale sulla gestione SV;
- confronto tra soglia premio 7% e 10% con prezzi giornata per giornata ufficiali;
- conferma backtest intra-stagione con quotazioni non sintetiche.

## Aggiornamento modello commissionale 2026-05-12

Il report `reports/real-data/commission_revenue_model_simulation.md` ha testato il modello `COMMISSION_REVENUE_MODEL`, in cui il 100% delle commissioni di acquisto e vendita e trattenuto dal sistema/piattaforma.

Risultato chiave:

- a parita di commissioni 2% acquisto / 2% vendita, il ROI utente non cambia rispetto al modello precedente;
- il ricavo medio per partecipante passa da 0.76 crediti equivalenti nel modello "10% delle commissioni" a 7.57 nel modello "100% commissioni al sistema";
- il modello 100% commissioni e quindi piu coerente e sostenibile per coprire costi di gestione e organizzazione;
- la matrice parametrica indica come miglior equilibrio numerico buy 1.5%, sell 3%, soglia premio 5%, ma questa configurazione e piu aggressiva lato vendita e richiede validazione con comportamento utenti reale;
- per una V1 semplice e spiegabile resta accettabile mantenere 2%/2%/7% come baseline regolamentare, cambiando pero il modello economico: le commissioni non rientrano nel montepremi e sono trattenute dal sistema.

Decisione aggiornata:

- modello economico: 100% delle commissioni trattenute dal sistema;
- commissione acquisto V1 baseline: 2%;
- commissione vendita V1 baseline: 2%;
- soglia premio V1 baseline: 7%;
- alternativa piu conservativa da testare in pilot: 1.5% acquisto / 3% vendita / soglia 5%;
- nessuna platform fee separata del 10%: il concetto viene sostituito da commissioni operative trattenute dal sistema.

## Decisione consigliata

Adottare come baseline di lavoro:

```text
FantaTrading V1 consigliato
Rosa: 25 giocatori, 3 P / 8 D / 8 C / 6 A
Acquisto: 2%
Vendita: 2%
Modello ricavo: 100% delle commissioni trattenute dal sistema
Soglia premio: 7%
SV: PLAYER_ZERO_TEAM_EXCLUDE
Bonus/malus: tabella ufficiale FantaTrading
Cambi: liberi (senza limite massimo)
Avviso overtrading: da inserire nel regolamento utente
```

La commissione vendita 2% e confermata dal confronto fee intra-stagione: penalizza HOLD di soli 0.80pp e aumenta il ricavo piattaforma del 21.3%. I cambi restano liberi perche il costo delle commissioni costituisce gia un freno naturale all overtrading. Il backtest intra-stagione mostra che strategie attive aggressive (MOMENTUM: -57.5%, TAKE_PROFIT: -37.4% mediati su tutte le configurazioni) distruggono valore molto piu di HOLD (+5.30%): questo dato va comunicato ai partecipanti tramite avviso esplicito, non tramite vincolo regolamentare.

Questa configurazione e il miglior compromesso attuale tra coerenza regolamentare, attrattivita per gli utenti e sostenibilita preliminare della piattaforma. Il nuovo modello 100% commissioni al sistema e piu sostenibile del precedente 10% delle commissioni senza modificare il costo netto dell utente a parita di fee. I risultati del backtest intra-stagione derivano da quotazioni sintetiche esplorative: la validazione definitiva richiede quotazioni ufficiali giornata per giornata.
