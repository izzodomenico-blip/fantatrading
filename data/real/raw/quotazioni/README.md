# Quotazioni Fantacalcio — File Sorgente

Questa cartella contiene i file Excel originali delle quotazioni Fantacalcio,
**non tracciati da git** (aggiunti a `.gitignore`).

## File attesi

| File                      | Stagione  | Status      |
|---------------------------|-----------|-------------|
| `quotazioni_2019_20.xlsx` | 2019/20   | completed   |
| `quotazioni_2020_21.xlsx` | 2020/21   | completed   |
| `quotazioni_2021_22.xlsx` | 2021/22   | completed   |
| `quotazioni_2022_23.xlsx` | 2022/23   | completed   |
| `quotazioni_2023_24.xlsx` | 2023/24   | completed   |
| `quotazioni_2024_25.xlsx` | 2024/25   | completed   |
| `quotazioni_2025_26.xlsx` | 2025/26   | in_progress |

Il naming dei file è flessibile: l'importer rileva la stagione automaticamente
da pattern come `2019_20`, `201920`, `2019-20`, `2019_2020`.

## Formato Excel atteso

Foglio: **Tutti**

| Colonna | Descrizione |
|---------|-------------|
| `Id`    | Identificativo univoco giocatore |
| `R`     | Ruolo breve (P/D/C/A) |
| `RM`    | Ruolo esteso (es. Dc, T, A, W…) |
| `Nome`  | Nome giocatore |
| `Squadra` | Club |
| `Qt.I`  | Quotazione Iniziale (inizio stagione) |
| `Qt.A`  | Quotazione Attuale / Fine stagione |
| `Diff.` | Differenza Qt.A − Qt.I |
| `Qt.I M` | Quota iniziale Mantra |
| `Qt.A M` | Quota attuale Mantra |
| `Diff.M` | Differenza Mantra |
| `FVM`   | Fantavalore di Mercato |
| `FVM M` | Fantavalore di Mercato Mantra |

## Comandi

```bash
npm run import:real-quotes    # Importa e normalizza tutti i file Excel
npm run analyze:real-quotes   # Genera analisi storica e report Markdown
```

Gli output vanno in `data/real/processed/`.
