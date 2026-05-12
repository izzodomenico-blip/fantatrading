# FantaTrading - Mapping Excel Voti

**Generato il:** 12/05/2026, 08:20:19

## Strategia di mapping

- I file Excel vengono letti ricorsivamente da `data/real/raw/votes/`.
- Stagione e giornata vengono riconosciute automaticamente dal percorso o dal nome file.
- Il foglio primario normalizzato e `Fantacalcio`.
- `Cod.` viene usato come `playerId`; se mancante viene generata una chiave temporanea normalizzata basata su stagione, nome, squadra e ruolo.
- `Voto` viene mappato su `vote`; non esiste una colonna esplicita `fantasyVote`, quindi il campo resta vuoto.
- Non vengono inventati minuti giocati o titolarita: `minutesPlayed` resta vuoto e `starter` resta vuoto quando non presente.
- `SV` o voto vuoto vengono normalizzati con `played=false` e `vote`/`fantasyVote` vuoti.

## Colonne mappate

| Excel | Normalizzato | Nota |
|-------|--------------|------|
| Percorso/nome file | season, round, seasonStatus, sourceFile | 2023/24 e 2024/25 completed; 2025/26 in_progress |
| Riga squadra | club | Valida fino alla squadra successiva |
| Cod. | playerId | Chiave temporanea solo se assente |
| Ruolo | role | P/D/C/A |
| Nome | playerName | Nome dalla fonte |
| Voto | vote | Valore numerico disponibile nel file |
| Gf | goals | Gol segnati |
| Ass | assists | Assist |
| Amm | yellowCards | Ammonizioni |
| Esp | redCards | Espulsioni |
| Rs | penaltiesMissed | Rigori sbagliati |
| Au | ownGoals | Autogol |

## Struttura fogli rilevata

| Foglio | Header rilevate | Colonne utili | Colonne mancanti utili |
|--------|-----------------|---------------|------------------------|
| Fantacalcio | Cod., Ruolo, Nome, Voto, Gf, Gs, Rp, Rs, Rf, Au, Amm, Esp, Ass | Cod., Ruolo, Nome, Voto, Gf, Rs, Au, Amm, Esp, Ass | - |
| Statistico | Cod., Ruolo, Nome, Voto, Gf, Gs, Rp, Rs, Rf, Au, Amm, Esp, Ass | Cod., Ruolo, Nome, Voto, Gf, Rs, Au, Amm, Esp, Ass | - |
| Italia | Cod., Ruolo, Nome, Voto, Gf, Gs, Rp, Rs, Rf, Au, Amm, Esp, Ass | Cod., Ruolo, Nome, Voto, Gf, Rs, Au, Amm, Esp, Ass | - |

## Problemi di mapping

- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_1.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_10.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_11.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_12.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_13.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_14.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_15.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_16.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_17.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_18.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_19.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_2.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_20.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_21.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_22.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_23.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_24.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_25.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_26.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_27.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_28.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_29.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_3.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_30.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_31.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_32.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_33.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_34.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_35.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_36.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_37.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_38.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_4.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_5.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_6.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_7.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_8.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2023_24/Voti_Fantacalcio_Stagione_2023_24_Giornata_9.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_1.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_10.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_11.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_12.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_13.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_14.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_15.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_16.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_17.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_18.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_19.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_2.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_20.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_21.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_22.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_23.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_24.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_25.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_26.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_27.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_28.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_29.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_3.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_30.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_31.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_32.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_33.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_34.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_35.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_36.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_37.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_38.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_4.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_5.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_6.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_7.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_8.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2024_25/Voti_Fantacalcio_Stagione_2024_25_Giornata_9.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_1.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_10.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_11.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_12.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_13.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_14.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_15.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_16.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_17.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_18.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_19.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_2.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_20.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_21.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_22.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_23.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_24.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_25.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_26.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_27.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_28.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_29.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_3.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_30.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_31.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_32.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_33.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_34.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_35.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_36.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_4.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_5.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_6.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_7.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_8.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
- 2025_26/Voti_Fantacalcio_Stagione_2025_26_Giornata_9.xlsx: escluse 20 righe non giocatore con ruolo diverso da P/D/C/A.
