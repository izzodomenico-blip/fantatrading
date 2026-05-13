-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PARTICIPANT', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('DRAFT', 'OPEN', 'LOCKED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('GK', 'DEF', 'MID', 'FWD');

-- CreateEnum
CREATE TYPE "NoVotePolicy" AS ENUM ('PLAYER_ZERO_TEAM_EXCLUDE', 'EXCLUDE', 'FIVE', 'ZERO', 'PLAYER_MALUS_TEAM_EXCLUDE');

-- CreateEnum
CREATE TYPE "TeamBand" AS ENUM ('FASCIA_0', 'FASCIA_1', 'FASCIA_2', 'FASCIA_3', 'FASCIA_4');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ROSA_INCOMPLETA', 'ROSA_ATTIVA', 'STAGIONE_CONCLUSA');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('ACTIVE', 'SOLD');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "CalculationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PrizePoolStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'DISTRIBUTED');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('QUOTES_INITIAL', 'QUOTES_UPDATE', 'VOTES');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('SUCCESS', 'ERROR', 'PARTIAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('IMPORT_QUOTES', 'IMPORT_VOTES', 'CALCULATE_ROUND', 'RECALCULATE_ROUND', 'CALCULATE_FINAL_SETTLEMENT', 'OPEN_SEASON', 'CLOSE_SEASON', 'ASSIGN_PRIZES', 'DISABLE_USER', 'EXPORT_REPORT', 'SEASON_STATUS_CHANGE', 'USER_STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PARTICIPANT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "football_season" VARCHAR(10) NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'DRAFT',
    "registration_open_at" TIMESTAMPTZ NOT NULL,
    "registration_close_at" TIMESTAMPTZ NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "total_rounds" SMALLINT NOT NULL,
    "initial_budget" DECIMAL(15,6) NOT NULL,
    "buy_commission_rate" DECIMAL(10,6) NOT NULL DEFAULT 0.020000,
    "sell_commission_rate" DECIMAL(10,6) NOT NULL DEFAULT 0.020000,
    "platform_fee_rate" DECIMAL(10,6) NOT NULL DEFAULT 0.100000,
    "survival_threshold" DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
    "prize_threshold" DECIMAL(10,6) NOT NULL DEFAULT 0.070000,
    "no_vote_policy" "NoVotePolicy" NOT NULL DEFAULT 'PLAYER_ZERO_TEAM_EXCLUDE',
    "roster_gk" SMALLINT NOT NULL DEFAULT 3,
    "roster_def" SMALLINT NOT NULL DEFAULT 8,
    "roster_mid" SMALLINT NOT NULL DEFAULT 8,
    "roster_fwd" SMALLINT NOT NULL DEFAULT 6,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "external_id" VARCHAR(100),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "PlayerRole" NOT NULL,
    "real_team" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "initial_quote" DECIMAL(10,4) NOT NULL,
    "current_quote" DECIMAL(10,4) NOT NULL,
    "final_quote" DECIMAL(10,4),
    "imported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_history" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "round" SMALLINT,
    "old_quote" DECIMAL(10,4) NOT NULL,
    "new_quote" DECIMAL(10,4) NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" UUID NOT NULL,

    CONSTRAINT "quote_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "round" SMALLINT NOT NULL,
    "player_id" UUID NOT NULL,
    "vote" DECIMAL(4,2),
    "fantasy_vote" DECIMAL(4,2),
    "played" BOOLEAN NOT NULL DEFAULT true,
    "is_derived" BOOLEAN NOT NULL DEFAULT false,
    "imported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "status" "TeamStatus" NOT NULL DEFAULT 'ROSA_INCOMPLETA',
    "initial_budget" DECIMAL(15,6) NOT NULL,
    "available_budget" DECIMAL(15,6) NOT NULL,
    "total_commissions_paid" DECIMAL(15,6) NOT NULL DEFAULT 0,
    "current_portfolio_value" DECIMAL(15,6) NOT NULL DEFAULT 0,
    "current_roi" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_positions" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "initial_quote" DECIMAL(10,4) NOT NULL,
    "buy_value" DECIMAL(15,6) NOT NULL,
    "buy_commission" DECIMAL(15,6) NOT NULL,
    "total_buy_cost" DECIMAL(15,6) NOT NULL,
    "fantasy_multiplier" DECIMAL(15,10) NOT NULL DEFAULT 1.0,
    "current_sell_value" DECIMAL(15,6) NOT NULL DEFAULT 0,
    "status" "PositionStatus" NOT NULL DEFAULT 'ACTIVE',
    "bought_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bought_in_round" SMALLINT,

    CONSTRAINT "portfolio_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_operations" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "position_id" UUID NOT NULL,
    "type" "OperationType" NOT NULL,
    "value_at_operation" DECIMAL(15,6) NOT NULL,
    "commission_rate" DECIMAL(10,6) NOT NULL,
    "commission_amount" DECIMAL(15,6) NOT NULL,
    "net_amount" DECIMAL(15,6) NOT NULL,
    "budget_before" DECIMAL(15,6) NOT NULL,
    "budget_after" DECIMAL(15,6) NOT NULL,
    "round" SMALLINT,
    "idempotency_key" UUID,
    "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_calculations" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "round" SMALLINT NOT NULL,
    "status" "CalculationStatus" NOT NULL DEFAULT 'PENDING',
    "total_players_with_vote" INTEGER NOT NULL DEFAULT 0,
    "total_sv_derived" INTEGER NOT NULL DEFAULT 0,
    "avg_portfolio_variation" DECIMAL(10,6),
    "input_data_hash" VARCHAR(64),
    "calculated_at" TIMESTAMPTZ,
    "calculated_by" UUID,
    "notes" TEXT,
    "superseded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_player_results" (
    "id" UUID NOT NULL,
    "round_calculation_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "vote" DECIMAL(4,2),
    "team_avg" DECIMAL(6,4),
    "team_band" "TeamBand",
    "bonus_pct" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "sv_status" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "round_player_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rankings" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "roi" DECIMAL(10,6) NOT NULL,
    "portfolio_value" DECIMAL(15,6) NOT NULL,
    "total_operations" INTEGER NOT NULL DEFAULT 0,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "round" SMALLINT,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prize_pools" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "total_commissions" DECIMAL(15,6) NOT NULL DEFAULT 0,
    "platform_fee_amount" DECIMAL(15,6) NOT NULL DEFAULT 0,
    "prize_pool_amount" DECIMAL(15,6) NOT NULL DEFAULT 0,
    "prize_structure" JSONB NOT NULL DEFAULT '[]',
    "status" "PrizePoolStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "prize_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prize_awards" (
    "id" UUID NOT NULL,
    "prize_pool_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "roi" DECIMAL(10,6) NOT NULL,
    "amount" DECIMAL(15,6) NOT NULL,
    "awarded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prize_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_settlements" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_capital_deposited" DECIMAL(15,6) NOT NULL,
    "initial_roster_cost" DECIMAL(15,6) NOT NULL,
    "virtual_cash_balance" DECIMAL(15,6) NOT NULL,
    "active_positions_value" DECIMAL(15,6) NOT NULL,
    "apply_final_sell_commission" BOOLEAN NOT NULL DEFAULT true,
    "final_sell_commission_rate" DECIMAL(10,6) NOT NULL,
    "final_sell_commission_amount" DECIMAL(15,6) NOT NULL,
    "net_liquidation_value" DECIMAL(15,6) NOT NULL,
    "final_liquidation_value" DECIMAL(15,6) NOT NULL,
    "profit_loss" DECIMAL(15,6) NOT NULL,
    "roi_pct" DECIMAL(10,6) NOT NULL,
    "rank_by_roi" INTEGER,
    "is_prize_eligible" BOOLEAN NOT NULL DEFAULT false,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculated_by" UUID,
    "source" VARCHAR(100) NOT NULL DEFAULT 'FINAL_SETTLEMENT',

    CONSTRAINT "final_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_fees" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "gross_commission" DECIMAL(15,6) NOT NULL,
    "platform_fee_amount" DECIMAL(15,6) NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_logs" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "type" "ImportType" NOT NULL,
    "round" SMALLINT,
    "status" "ImportStatus" NOT NULL,
    "original_filename" VARCHAR(500) NOT NULL,
    "storage_path" VARCHAR(1000) NOT NULL,
    "rows_total" INTEGER NOT NULL DEFAULT 0,
    "rows_imported" INTEGER NOT NULL DEFAULT 0,
    "rows_error" INTEGER NOT NULL DEFAULT 0,
    "error_detail" JSONB,
    "executed_by" UUID NOT NULL,
    "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "user_id" UUID NOT NULL,
    "season_id" UUID,
    "entity_type" VARCHAR(100),
    "entity_id" UUID,
    "detail" JSONB,
    "status" "AuditStatus" NOT NULL,
    "error_message" TEXT,
    "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "seasons_status_idx" ON "seasons"("status");

-- CreateIndex
CREATE INDEX "seasons_football_season_idx" ON "seasons"("football_season");

-- CreateIndex
CREATE INDEX "players_role_idx" ON "players"("role");

-- CreateIndex
CREATE INDEX "players_real_team_idx" ON "players"("real_team");

-- CreateIndex
CREATE INDEX "players_last_name_first_name_idx" ON "players"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "quotes_season_id_idx" ON "quotes"("season_id");

-- CreateIndex
CREATE INDEX "quotes_player_id_idx" ON "quotes"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_season_id_player_id_key" ON "quotes"("season_id", "player_id");

-- CreateIndex
CREATE INDEX "quote_history_quote_id_idx" ON "quote_history"("quote_id");

-- CreateIndex
CREATE INDEX "quote_history_season_id_player_id_idx" ON "quote_history"("season_id", "player_id");

-- CreateIndex
CREATE INDEX "votes_season_id_round_idx" ON "votes"("season_id", "round");

-- CreateIndex
CREATE INDEX "votes_player_id_idx" ON "votes"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_season_id_round_player_id_key" ON "votes"("season_id", "round", "player_id");

-- CreateIndex
CREATE INDEX "teams_season_id_idx" ON "teams"("season_id");

-- CreateIndex
CREATE INDEX "teams_user_id_idx" ON "teams"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_user_id_season_id_key" ON "teams"("user_id", "season_id");

-- CreateIndex
CREATE INDEX "portfolio_positions_team_id_idx" ON "portfolio_positions"("team_id");

-- CreateIndex
CREATE INDEX "portfolio_positions_player_id_idx" ON "portfolio_positions"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "market_operations_idempotency_key_key" ON "market_operations"("idempotency_key");

-- CreateIndex
CREATE INDEX "market_operations_team_id_idx" ON "market_operations"("team_id");

-- CreateIndex
CREATE INDEX "market_operations_player_id_idx" ON "market_operations"("player_id");

-- CreateIndex
CREATE INDEX "round_calculations_season_id_round_idx" ON "round_calculations"("season_id", "round");

-- CreateIndex
CREATE INDEX "round_calculations_status_idx" ON "round_calculations"("status");

-- CreateIndex
CREATE INDEX "round_player_results_round_calculation_id_idx" ON "round_player_results"("round_calculation_id");

-- CreateIndex
CREATE INDEX "round_player_results_team_id_idx" ON "round_player_results"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "round_player_results_round_calculation_id_team_id_player_id_key" ON "round_player_results"("round_calculation_id", "team_id", "player_id");

-- CreateIndex
CREATE INDEX "rankings_season_id_round_position_idx" ON "rankings"("season_id", "round", "position");

-- CreateIndex
CREATE INDEX "rankings_team_id_idx" ON "rankings"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "prize_pools_season_id_key" ON "prize_pools"("season_id");

-- CreateIndex
CREATE INDEX "prize_awards_prize_pool_id_idx" ON "prize_awards"("prize_pool_id");

-- CreateIndex
CREATE INDEX "prize_awards_user_id_idx" ON "prize_awards"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "prize_awards_prize_pool_id_team_id_key" ON "prize_awards"("prize_pool_id", "team_id");

-- CreateIndex
CREATE INDEX "final_settlements_season_id_calculated_at_idx" ON "final_settlements"("season_id", "calculated_at");

-- CreateIndex
CREATE INDEX "final_settlements_team_id_calculated_at_idx" ON "final_settlements"("team_id", "calculated_at");

-- CreateIndex
CREATE INDEX "final_settlements_user_id_idx" ON "final_settlements"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_fees_operation_id_key" ON "platform_fees"("operation_id");

-- CreateIndex
CREATE INDEX "platform_fees_season_id_idx" ON "platform_fees"("season_id");

-- CreateIndex
CREATE INDEX "platform_fees_team_id_idx" ON "platform_fees"("team_id");

-- CreateIndex
CREATE INDEX "import_logs_season_id_idx" ON "import_logs"("season_id");

-- CreateIndex
CREATE INDEX "import_logs_season_id_type_idx" ON "import_logs"("season_id", "type");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_season_id_idx" ON "audit_logs"("season_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_executed_at_idx" ON "audit_logs"("executed_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_history" ADD CONSTRAINT "quote_history_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_history" ADD CONSTRAINT "quote_history_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_history" ADD CONSTRAINT "quote_history_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_history" ADD CONSTRAINT "quote_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "portfolio_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_calculations" ADD CONSTRAINT "round_calculations_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_calculations" ADD CONSTRAINT "round_calculations_calculated_by_fkey" FOREIGN KEY ("calculated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_calculations" ADD CONSTRAINT "round_calculations_superseded_by_fkey" FOREIGN KEY ("superseded_by") REFERENCES "round_calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_player_results" ADD CONSTRAINT "round_player_results_round_calculation_id_fkey" FOREIGN KEY ("round_calculation_id") REFERENCES "round_calculations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_player_results" ADD CONSTRAINT "round_player_results_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_player_results" ADD CONSTRAINT "round_player_results_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_pools" ADD CONSTRAINT "prize_pools_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_pools" ADD CONSTRAINT "prize_pools_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_awards" ADD CONSTRAINT "prize_awards_prize_pool_id_fkey" FOREIGN KEY ("prize_pool_id") REFERENCES "prize_pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_awards" ADD CONSTRAINT "prize_awards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_awards" ADD CONSTRAINT "prize_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_calculated_by_fkey" FOREIGN KEY ("calculated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "market_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_executed_by_fkey" FOREIGN KEY ("executed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
