# FantaTrading V1 — Database Schema Draft

**Versione:** 1.0  
**Data:** 2026-05-12  
**Stato:** Bozza — da tradurre in migration Prisma  
**Destinatari:** sviluppatori backend, DBA

---

## Convenzioni

- Tutti i nomi di tabelle e colonne sono in `snake_case`.
- Ogni tabella ha `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- Ogni tabella ha `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- Le tabelle modificabili hanno `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` aggiornato da un trigger.
- I valori monetari (crediti) usano `NUMERIC(15,6)` per evitare errori di arrotondamento floating-point.
- Le percentuali (commissioni, ROI, bonus) usano `NUMERIC(10,6)`: es. `0.020000` per il 2%.
- Le foreign key hanno `ON DELETE RESTRICT` di default salvo diversa indicazione.
- `NOT NULL` è il default: i campi nullable sono indicati esplicitamente.

---

## Enum

```sql
CREATE TYPE user_role AS ENUM ('PARTECIPANTE', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'DISABLED');

CREATE TYPE season_status AS ENUM (
  'CONFIGURATA',
  'QUOTAZIONI_CARICATE',
  'ISCRIZIONI_APERTE',
  'IN_CORSO',
  'CHIUSURA',
  'TERMINATA'
);

CREATE TYPE player_role AS ENUM ('GK', 'DEF', 'MID', 'FWD');

CREATE TYPE no_vote_policy AS ENUM (
  'PLAYER_ZERO_TEAM_EXCLUDE',
  'EXCLUDE',
  'FIVE',
  'ZERO',
  'PLAYER_MALUS_TEAM_EXCLUDE'
);

CREATE TYPE team_band AS ENUM ('FASCIA_0', 'FASCIA_1', 'FASCIA_2', 'FASCIA_3', 'FASCIA_4');

CREATE TYPE team_status AS ENUM ('ROSA_INCOMPLETA', 'ROSA_ATTIVA', 'STAGIONE_CONCLUSA');

CREATE TYPE position_status AS ENUM ('ACTIVE', 'SOLD');

CREATE TYPE operation_type AS ENUM ('BUY', 'SELL');

CREATE TYPE calculation_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'SUPERSEDED');

CREATE TYPE prize_pool_status AS ENUM ('DRAFT', 'CONFIRMED', 'DISTRIBUTED');

CREATE TYPE import_type AS ENUM ('QUOTES_INITIAL', 'QUOTES_UPDATE', 'VOTES');
CREATE TYPE import_status AS ENUM ('SUCCESS', 'ERROR', 'PARTIAL');

CREATE TYPE audit_action AS ENUM (
  'IMPORT_QUOTES',
  'IMPORT_VOTES',
  'CALCULATE_ROUND',
  'RECALCULATE_ROUND',
  'OPEN_SEASON',
  'CLOSE_SEASON',
  'ASSIGN_PRIZES',
  'DISABLE_USER',
  'EXPORT_REPORT',
  'SEASON_STATUS_CHANGE',
  'USER_STATUS_CHANGE'
);

CREATE TYPE audit_status AS ENUM ('SUCCESS', 'ERROR');

CREATE TYPE notification_type AS ENUM (
  'ROUND_CALCULATED',
  'QUOTES_UPDATED',
  'OVERTRADING_WARNING',
  'SEASON_STARTED',
  'SEASON_ENDED',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSING',
  'PRIZE_AWARDED'
);
```

---

## Tabelle

### users

```sql
CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  first_name    VARCHAR(100)  NOT NULL,
  last_name     VARCHAR(100)  NOT NULL,
  role          user_role     NOT NULL DEFAULT 'PARTECIPANTE',
  status        user_status   NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
```

---

### refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    VARCHAR(255)  NOT NULL,
  expires_at    TIMESTAMPTZ   NOT NULL,
  revoked       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);
```

---

### seasons

```sql
CREATE TABLE seasons (
  id                     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(255)    NOT NULL,
  football_season        VARCHAR(10)     NOT NULL,
  status                 season_status   NOT NULL DEFAULT 'CONFIGURATA',
  registration_open_at   TIMESTAMPTZ     NOT NULL,
  registration_close_at  TIMESTAMPTZ     NOT NULL,
  start_date             TIMESTAMPTZ     NOT NULL,
  end_date               TIMESTAMPTZ     NOT NULL,
  total_rounds           SMALLINT        NOT NULL,
  initial_budget         NUMERIC(15,6)   NOT NULL,
  buy_commission_rate    NUMERIC(10,6)   NOT NULL DEFAULT 0.020000,
  sell_commission_rate   NUMERIC(10,6)   NOT NULL DEFAULT 0.020000,
  platform_fee_rate      NUMERIC(10,6)   NOT NULL DEFAULT 0.100000,
  survival_threshold     NUMERIC(10,6)   NOT NULL DEFAULT 0.000000,
  prize_threshold        NUMERIC(10,6)   NOT NULL DEFAULT 0.070000,
  no_vote_policy         no_vote_policy  NOT NULL DEFAULT 'PLAYER_ZERO_TEAM_EXCLUDE',
  roster_gk              SMALLINT        NOT NULL DEFAULT 3,
  roster_def             SMALLINT        NOT NULL DEFAULT 8,
  roster_mid             SMALLINT        NOT NULL DEFAULT 8,
  roster_fwd             SMALLINT        NOT NULL DEFAULT 6,
  created_by             UUID            NOT NULL REFERENCES users(id),
  created_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_seasons_commission_rates
    CHECK (buy_commission_rate >= 0 AND sell_commission_rate >= 0),
  CONSTRAINT chk_seasons_dates
    CHECK (registration_close_at < start_date AND start_date < end_date),
  CONSTRAINT chk_seasons_rounds
    CHECK (total_rounds > 0),
  CONSTRAINT chk_seasons_roster
    CHECK (roster_gk > 0 AND roster_def > 0 AND roster_mid > 0 AND roster_fwd > 0)
);

CREATE INDEX idx_seasons_status ON seasons (status);
CREATE INDEX idx_seasons_football_season ON seasons (football_season);
```

---

### players

```sql
CREATE TABLE players (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  VARCHAR(100) NULL,
  first_name   VARCHAR(100) NOT NULL,
  last_name    VARCHAR(100) NOT NULL,
  role         player_role  NOT NULL,
  real_team    VARCHAR(100) NOT NULL,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_role ON players (role);
CREATE INDEX idx_players_real_team ON players (real_team);
CREATE INDEX idx_players_external_id ON players (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_players_name ON players (last_name, first_name);
```

---

### quotes

```sql
CREATE TABLE quotes (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id      UUID          NOT NULL REFERENCES seasons(id),
  player_id      UUID          NOT NULL REFERENCES players(id),
  initial_quote  NUMERIC(10,4) NOT NULL,
  current_quote  NUMERIC(10,4) NOT NULL,
  final_quote    NUMERIC(10,4) NULL,
  imported_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_quotes_season_player UNIQUE (season_id, player_id),
  CONSTRAINT chk_quotes_initial_positive CHECK (initial_quote > 0),
  CONSTRAINT chk_quotes_current_nonneg CHECK (current_quote >= 0)
);

CREATE INDEX idx_quotes_season_id ON quotes (season_id);
CREATE INDEX idx_quotes_player_id ON quotes (player_id);
CREATE INDEX idx_quotes_season_player ON quotes (season_id, player_id);
```

---

### quote_history

Storico delle variazioni di quotazione. Permette di tracciare l'andamento nel tempo.

```sql
CREATE TABLE quote_history (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID          NOT NULL REFERENCES quotes(id),
  season_id   UUID          NOT NULL REFERENCES seasons(id),
  player_id   UUID          NOT NULL REFERENCES players(id),
  round       SMALLINT      NULL,
  old_quote   NUMERIC(10,4) NOT NULL,
  new_quote   NUMERIC(10,4) NOT NULL,
  changed_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  changed_by  UUID          NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_quote_history_quote_id ON quote_history (quote_id);
CREATE INDEX idx_quote_history_season_player ON quote_history (season_id, player_id);
```

---

### votes

```sql
CREATE TABLE votes (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id      UUID          NOT NULL REFERENCES seasons(id),
  round          SMALLINT      NOT NULL,
  player_id      UUID          NOT NULL REFERENCES players(id),
  vote           NUMERIC(4,2)  NULL,
  fantasy_vote   NUMERIC(4,2)  NULL,
  played         BOOLEAN       NOT NULL DEFAULT TRUE,
  is_derived     BOOLEAN       NOT NULL DEFAULT FALSE,
  imported_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_votes_season_round_player UNIQUE (season_id, round, player_id),
  CONSTRAINT chk_votes_range
    CHECK (vote IS NULL OR (vote >= 0 AND vote <= 10)),
  CONSTRAINT chk_votes_consistency
    CHECK (
      (played = TRUE AND vote IS NOT NULL) OR
      (played = FALSE AND vote IS NULL AND fantasy_vote IS NULL)
    )
);

CREATE INDEX idx_votes_season_round ON votes (season_id, round);
CREATE INDEX idx_votes_player_id ON votes (player_id);
CREATE INDEX idx_votes_season_player ON votes (season_id, player_id);
CREATE INDEX idx_votes_derived ON votes (season_id, round) WHERE is_derived = TRUE;
```

---

### teams

```sql
CREATE TABLE teams (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID          NOT NULL REFERENCES users(id),
  season_id                UUID          NOT NULL REFERENCES seasons(id),
  status                   team_status   NOT NULL DEFAULT 'ROSA_INCOMPLETA',
  initial_budget           NUMERIC(15,6) NOT NULL,
  available_budget         NUMERIC(15,6) NOT NULL,
  total_commissions_paid   NUMERIC(15,6) NOT NULL DEFAULT 0,
  current_portfolio_value  NUMERIC(15,6) NOT NULL DEFAULT 0,
  current_roi              NUMERIC(10,6) NOT NULL DEFAULT 0,
  version                  INTEGER       NOT NULL DEFAULT 1,
  registered_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_teams_user_season UNIQUE (user_id, season_id),
  CONSTRAINT chk_teams_budget_nonneg CHECK (available_budget >= 0),
  CONSTRAINT chk_teams_initial_positive CHECK (initial_budget > 0)
);

CREATE INDEX idx_teams_season_id ON teams (season_id);
CREATE INDEX idx_teams_user_id ON teams (user_id);
CREATE INDEX idx_teams_current_roi ON teams (season_id, current_roi DESC);
```

**Nota sul campo `version`:** usato per il lock ottimistico. Prima di ogni aggiornamento del budget o del portafoglio, si verifica che `version` non sia cambiato dall'ultima lettura. Se è cambiato, la transazione viene ritentata.

---

### portfolio_positions

```sql
CREATE TABLE portfolio_positions (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             UUID            NOT NULL REFERENCES teams(id),
  player_id           UUID            NOT NULL REFERENCES players(id),
  quote_id            UUID            NOT NULL REFERENCES quotes(id),
  initial_quote       NUMERIC(10,4)   NOT NULL,
  buy_value           NUMERIC(15,6)   NOT NULL,
  buy_commission      NUMERIC(15,6)   NOT NULL,
  total_buy_cost      NUMERIC(15,6)   NOT NULL,
  fantasy_multiplier  NUMERIC(15,10)  NOT NULL DEFAULT 1.0000000000,
  current_sell_value  NUMERIC(15,6)   NOT NULL,
  status              position_status NOT NULL DEFAULT 'ACTIVE',
  bought_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  bought_in_round     SMALLINT        NULL,

  CONSTRAINT chk_portfolio_initial_positive CHECK (initial_quote > 0),
  CONSTRAINT chk_portfolio_buy_value_positive CHECK (buy_value > 0),
  CONSTRAINT chk_portfolio_commission_nonneg CHECK (buy_commission >= 0),
  CONSTRAINT chk_portfolio_multiplier_positive CHECK (fantasy_multiplier > 0)
);

-- Un giocatore non può apparire due volte in stato ACTIVE nello stesso team
CREATE UNIQUE INDEX uq_portfolio_active_player
  ON portfolio_positions (team_id, player_id)
  WHERE status = 'ACTIVE';

CREATE INDEX idx_portfolio_team_id ON portfolio_positions (team_id);
CREATE INDEX idx_portfolio_player_id ON portfolio_positions (player_id);
CREATE INDEX idx_portfolio_status ON portfolio_positions (team_id, status);
```

**Nota su `fantasy_multiplier`:** usa precisione a 10 decimali per il prodotto composto su 38 giornate di bonus/malus tipicamente nell'ordine di ±0.5%–±5%. La precisione `NUMERIC(15,10)` garantisce errori di arrotondamento < 0.0001% dopo 38 moltiplicazioni.

---

### market_operations

```sql
CREATE TABLE market_operations (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             UUID            NOT NULL REFERENCES teams(id),
  player_id           UUID            NOT NULL REFERENCES players(id),
  position_id         UUID            NOT NULL REFERENCES portfolio_positions(id),
  type                operation_type  NOT NULL,
  value_at_operation  NUMERIC(15,6)   NOT NULL,
  commission_rate     NUMERIC(10,6)   NOT NULL,
  commission_amount   NUMERIC(15,6)   NOT NULL,
  net_amount          NUMERIC(15,6)   NOT NULL,
  budget_before       NUMERIC(15,6)   NOT NULL,
  budget_after        NUMERIC(15,6)   NOT NULL,
  round               SMALLINT        NULL,
  idempotency_key     UUID            NULL,
  executed_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_market_value_positive CHECK (value_at_operation > 0),
  CONSTRAINT chk_market_commission_nonneg CHECK (commission_amount >= 0)
);

-- Idempotency: stessa operazione non può essere eseguita due volte
CREATE UNIQUE INDEX uq_market_idempotency
  ON market_operations (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_market_team_id ON market_operations (team_id);
CREATE INDEX idx_market_player_id ON market_operations (player_id);
CREATE INDEX idx_market_executed_at ON market_operations (team_id, executed_at DESC);
CREATE INDEX idx_market_type ON market_operations (team_id, type);
```

---

### round_calculations

```sql
CREATE TABLE round_calculations (
  id                       UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id                UUID               NOT NULL REFERENCES seasons(id),
  round                    SMALLINT           NOT NULL,
  status                   calculation_status NOT NULL DEFAULT 'PENDING',
  total_players_with_vote  INTEGER            NOT NULL DEFAULT 0,
  total_sv_derived         INTEGER            NOT NULL DEFAULT 0,
  avg_portfolio_variation  NUMERIC(10,6)      NULL,
  input_data_hash          VARCHAR(64)        NULL,
  calculated_at            TIMESTAMPTZ        NULL,
  calculated_by            UUID               NULL REFERENCES users(id),
  notes                    TEXT               NULL,
  superseded_by            UUID               NULL REFERENCES round_calculations(id),
  created_at               TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_round_calculations_active
  ON round_calculations (season_id, round)
  WHERE status NOT IN ('SUPERSEDED', 'ERROR');

CREATE INDEX idx_round_calc_season ON round_calculations (season_id, round);
CREATE INDEX idx_round_calc_status ON round_calculations (status);
```

---

### round_player_results

```sql
CREATE TABLE round_player_results (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  round_calculation_id  UUID          NOT NULL REFERENCES round_calculations(id),
  team_id               UUID          NOT NULL REFERENCES teams(id),
  player_id             UUID          NOT NULL REFERENCES players(id),
  vote                  NUMERIC(4,2)  NULL,
  team_avg              NUMERIC(6,4)  NULL,
  team_band             team_band     NULL,
  bonus_pct             NUMERIC(10,6) NOT NULL DEFAULT 0,
  sv_status             BOOLEAN       NOT NULL DEFAULT FALSE,

  CONSTRAINT uq_round_player_result UNIQUE (round_calculation_id, team_id, player_id)
);

CREATE INDEX idx_round_results_calc ON round_player_results (round_calculation_id);
CREATE INDEX idx_round_results_team ON round_player_results (team_id);
CREATE INDEX idx_round_results_player ON round_player_results (player_id);
```

---

### rankings

```sql
CREATE TABLE rankings (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id        UUID          NOT NULL REFERENCES seasons(id),
  team_id          UUID          NOT NULL REFERENCES teams(id),
  user_id          UUID          NOT NULL REFERENCES users(id),
  position         INTEGER       NOT NULL,
  roi              NUMERIC(10,6) NOT NULL,
  portfolio_value  NUMERIC(15,6) NOT NULL,
  total_operations INTEGER       NOT NULL DEFAULT 0,
  is_final         BOOLEAN       NOT NULL DEFAULT FALSE,
  round            SMALLINT      NULL,
  calculated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rankings_season_round ON rankings (season_id, round, position);
CREATE INDEX idx_rankings_team ON rankings (team_id);
CREATE INDEX idx_rankings_final ON rankings (season_id, position) WHERE is_final = TRUE;
```

---

### prize_pools

```sql
CREATE TABLE prize_pools (
  id                  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id           UUID              NOT NULL REFERENCES seasons(id),
  total_commissions   NUMERIC(15,6)     NOT NULL DEFAULT 0,
  platform_fee_amount NUMERIC(15,6)     NOT NULL DEFAULT 0,
  prize_pool_amount   NUMERIC(15,6)     NOT NULL DEFAULT 0,
  prize_structure     JSONB             NOT NULL DEFAULT '[]',
  status              prize_pool_status NOT NULL DEFAULT 'DRAFT',
  confirmed_by        UUID              NULL REFERENCES users(id),
  confirmed_at        TIMESTAMPTZ       NULL,
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_prize_pools_season UNIQUE (season_id)
);
```

**Struttura di `prize_structure` (JSONB):**
```json
[
  { "position": 1, "pct": 0.40, "amount": 151.38 },
  { "position": 2, "pct": 0.25, "amount": 94.61 },
  { "position": 3, "pct": 0.15, "amount": 56.77 }
]
```

---

### prize_awards

```sql
CREATE TABLE prize_awards (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_pool_id  UUID          NOT NULL REFERENCES prize_pools(id),
  team_id        UUID          NOT NULL REFERENCES teams(id),
  user_id        UUID          NOT NULL REFERENCES users(id),
  position       INTEGER       NOT NULL,
  roi            NUMERIC(10,6) NOT NULL,
  amount         NUMERIC(15,6) NOT NULL,
  awarded_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_prize_awards_pool_team UNIQUE (prize_pool_id, team_id)
);

CREATE INDEX idx_prize_awards_pool ON prize_awards (prize_pool_id);
CREATE INDEX idx_prize_awards_user ON prize_awards (user_id);
```

---

### platform_fees

```sql
CREATE TABLE platform_fees (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id            UUID          NOT NULL REFERENCES seasons(id),
  team_id              UUID          NOT NULL REFERENCES teams(id),
  operation_id         UUID          NOT NULL REFERENCES market_operations(id),
  gross_commission     NUMERIC(15,6) NOT NULL,
  platform_fee_amount  NUMERIC(15,6) NOT NULL,
  calculated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_platform_fees_operation UNIQUE (operation_id)
);

CREATE INDEX idx_platform_fees_season ON platform_fees (season_id);
CREATE INDEX idx_platform_fees_team ON platform_fees (team_id);
```

---

### import_logs

```sql
CREATE TABLE import_logs (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id         UUID          NOT NULL REFERENCES seasons(id),
  type              import_type   NOT NULL,
  round             SMALLINT      NULL,
  status            import_status NOT NULL,
  original_filename VARCHAR(500)  NOT NULL,
  storage_path      VARCHAR(1000) NOT NULL,
  rows_total        INTEGER       NOT NULL DEFAULT 0,
  rows_imported     INTEGER       NOT NULL DEFAULT 0,
  rows_error        INTEGER       NOT NULL DEFAULT 0,
  error_detail      JSONB         NULL,
  executed_by       UUID          NOT NULL REFERENCES users(id),
  executed_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_logs_season ON import_logs (season_id);
CREATE INDEX idx_import_logs_type ON import_logs (season_id, type);
```

---

### audit_logs

```sql
CREATE TABLE audit_logs (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES users(id),
  season_id     UUID          NULL REFERENCES seasons(id),
  action        audit_action  NOT NULL,
  entity_type   VARCHAR(100)  NULL,
  entity_id     UUID          NULL,
  detail        JSONB         NULL,
  status        audit_status  NOT NULL DEFAULT 'SUCCESS',
  error_message TEXT          NULL,
  ip_address    INET          NULL,
  executed_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Nessun vincolo UNIQUE: ogni evento è un record distinto
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_season ON audit_logs (season_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_executed_at ON audit_logs (executed_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id) WHERE entity_id IS NOT NULL;
```

**Nota di sicurezza:** l'utente applicativo PostgreSQL usato dall'app backend (`fantatrading_app`) non deve avere il permesso `UPDATE` o `DELETE` su questa tabella. La revoca si fa in fase di setup:

```sql
REVOKE UPDATE, DELETE ON audit_logs FROM fantatrading_app;
```

---

### notifications

```sql
CREATE TABLE notifications (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID              NOT NULL REFERENCES users(id),
  season_id   UUID              NULL REFERENCES seasons(id),
  type        notification_type NOT NULL,
  title       VARCHAR(255)      NOT NULL,
  body        TEXT              NULL,
  read        BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, read, created_at DESC);
CREATE INDEX idx_notifications_season ON notifications (season_id) WHERE season_id IS NOT NULL;
```

---

## Trigger: updated_at automatico

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applicare a tutte le tabelle con updated_at:
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prize_pools_updated_at
  BEFORE UPDATE ON prize_pools
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Relazioni: diagramma sintetico

```
users
  ├── 1:N  refresh_tokens      (user_id)
  ├── 1:N  teams               (user_id)
  ├── 1:N  audit_logs          (user_id)
  └── 1:N  notifications       (user_id)

seasons
  ├── 1:N  teams               (season_id)
  ├── 1:N  quotes              (season_id)
  ├── 1:N  votes               (season_id)
  ├── 1:N  round_calculations  (season_id)
  ├── 1:1  prize_pools         (season_id)
  ├── 1:N  import_logs         (season_id)
  ├── 1:N  platform_fees       (season_id)
  └── 1:N  rankings            (season_id)

players
  ├── 1:N  quotes              (player_id)
  ├── 1:N  votes               (player_id)
  └── 1:N  portfolio_positions (player_id)

teams
  ├── 1:N  portfolio_positions (team_id)
  ├── 1:N  market_operations   (team_id)
  ├── 1:N  platform_fees       (team_id)
  └── 1:N  rankings            (team_id)

portfolio_positions
  └── 1:N  market_operations   (position_id)

round_calculations
  └── 1:N  round_player_results (round_calculation_id)

market_operations
  └── 1:1  platform_fees       (operation_id)

prize_pools
  └── 1:N  prize_awards        (prize_pool_id)
```

---

## Vincoli di integrità economica

I seguenti vincoli garantiscono la consistenza dei dati finanziari:

```sql
-- Il budget dopo un'operazione deve essere coerente col budget prima
ALTER TABLE market_operations ADD CONSTRAINT chk_market_budget_nonneg
  CHECK (budget_after >= 0);

-- Il montepremi non può essere negativo
ALTER TABLE prize_pools ADD CONSTRAINT chk_prize_pool_nonneg
  CHECK (prize_pool_amount >= 0 AND platform_fee_amount >= 0);

-- La somma delle percentuali premi non può superare 100%
-- (non implementabile come CHECK puro su JSONB — da validare a livello applicativo)

-- Il valore di acquisto deve essere positivo
ALTER TABLE portfolio_positions ADD CONSTRAINT chk_position_buy_positive
  CHECK (buy_value > 0 AND total_buy_cost > 0);

-- Il sell value corrente non può essere negativo (floor a zero)
ALTER TABLE portfolio_positions ADD CONSTRAINT chk_position_sell_nonneg
  CHECK (current_sell_value >= 0);
```

---

## Campi monetari: riepilogo tipi

| Campo | Tipo | Note |
|-------|------|-------|
| Quotazioni (`initial_quote`, `current_quote`) | `NUMERIC(10,4)` | Fino a 9999.9999 — range realistico per quotazioni Fantacalcio |
| Valori portafoglio, commissioni, costi | `NUMERIC(15,6)` | Fino a 999.999.999,999999 crediti |
| Percentuali (commissioni, ROI, bonus) | `NUMERIC(10,6)` | Es. 0.020000 = 2%, 4.290000 = ROI 4.29% |
| Fantasy multiplier | `NUMERIC(15,10)` | Prodotto composto 38 giornate: alta precisione necessaria |
| Voti | `NUMERIC(4,2)` | Es. 6.50 — range 0.00–10.00 |
| Media squadra | `NUMERIC(6,4)` | Es. 5.9500 |

---

## Utente PostgreSQL applicativo

In produzione, creare un utente dedicato con permessi minimi:

```sql
CREATE USER fantatrading_app WITH PASSWORD 'strong_password_here';

GRANT CONNECT ON DATABASE fantatrading TO fantatrading_app;
GRANT USAGE ON SCHEMA public TO fantatrading_app;

-- Permessi standard su tutte le tabelle (salvo audit_logs)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fantatrading_app;

-- Revoca DELETE/UPDATE su tabelle append-only
REVOKE UPDATE, DELETE ON audit_logs FROM fantatrading_app;
REVOKE DELETE ON market_operations FROM fantatrading_app;
REVOKE DELETE ON import_logs FROM fantatrading_app;

-- Permessi sulle sequenze UUID (se usate)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fantatrading_app;
```

---

## Note per le migration Prisma

Al momento della traduzione in schema Prisma:

1. Usare `@db.Decimal(15,6)` per tutti i campi monetari (Prisma usa `Decimal` che mappa su `NUMERIC`).
2. Le enum Prisma corrispondono alle enum PostgreSQL: dichiararle in `schema.prisma` con la stessa nomenclatura.
3. Il `fantasy_multiplier` richiede `@db.Decimal(15,10)` — verificare che Prisma gestisca correttamente la precisione estesa.
4. L'indice parziale `uq_portfolio_active_player` (solo dove `status = 'ACTIVE'`) richiede `@@index` con clausola `where` in Prisma 5+ oppure uno script SQL raw nella migration.
5. Il trigger `set_updated_at` va aggiunto manualmente nelle migration SQL (non è supportato nativamente da Prisma schema).
6. I permessi di revoca su `audit_logs` e `market_operations` vanno aggiunti come SQL raw nelle migration.
