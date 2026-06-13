-- CreateEnum
CREATE TYPE "Exchange" AS ENUM ('NSE', 'BSE', 'MCX');

-- CreateEnum
CREATE TYPE "InstrumentType" AS ENUM ('INDEX', 'EQUITY', 'ETF', 'FUTURE', 'OPTION', 'COMMODITY');

-- CreateEnum
CREATE TYPE "OptionType" AS ENUM ('CE', 'PE');

-- CreateEnum
CREATE TYPE "PriceInterval" AS ENUM ('MINUTE_1', 'MINUTE_5', 'MINUTE_15', 'HOUR_1', 'DAY_1');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'FILLED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PortfolioMode" AS ENUM ('LIVE', 'PAPER', 'BACKTEST');

-- CreateEnum
CREATE TYPE "BacktestStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "health_checks" ALTER COLUMN "checkedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "instruments" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" "Exchange" NOT NULL,
    "type" "InstrumentType" NOT NULL,
    "segment" TEXT NOT NULL DEFAULT 'NSE',
    "exchangeToken" INTEGER,
    "lotSize" INTEGER NOT NULL DEFAULT 1,
    "tickSize" DECIMAL(10,4) NOT NULL DEFAULT 0.05,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "underlyingInstrumentId" TEXT,
    "strikePrice" DECIMAL(12,2),
    "optionType" "OptionType",
    "expiryDate" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_prices" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "interval" "PriceInterval" NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL,
    "open" DECIMAL(18,4) NOT NULL,
    "high" DECIMAL(18,4) NOT NULL,
    "low" DECIMAL(18,4) NOT NULL,
    "close" DECIMAL(18,4) NOT NULL,
    "volume" BIGINT NOT NULL DEFAULT 0,
    "openInterest" BIGINT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historical_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_chains" (
    "id" TEXT NOT NULL,
    "underlyingInstrumentId" TEXT NOT NULL,
    "contractInstrumentId" TEXT,
    "snapshotAt" TIMESTAMPTZ(3) NOT NULL,
    "expiryDate" DATE NOT NULL,
    "strikePrice" DECIMAL(12,2) NOT NULL,
    "optionType" "OptionType" NOT NULL,
    "bid" DECIMAL(18,4),
    "ask" DECIMAL(18,4),
    "lastPrice" DECIMAL(18,4),
    "volume" BIGINT NOT NULL DEFAULT 0,
    "openInterest" BIGINT NOT NULL DEFAULT 0,
    "impliedVolatility" DECIMAL(8,4),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "option_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "PortfolioMode" NOT NULL DEFAULT 'PAPER',
    "initialCapital" DECIMAL(18,2) NOT NULL,
    "cashBalance" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "backtestRunId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtest_runs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategyName" TEXT NOT NULL,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "status" "BacktestStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "initialCapital" DECIMAL(18,2) NOT NULL,
    "includeCosts" BOOLEAN NOT NULL DEFAULT true,
    "cagr" DECIMAL(10,4),
    "sharpeRatio" DECIMAL(10,4),
    "maxDrawdown" DECIMAL(10,4),
    "profitFactor" DECIMAL(10,4),
    "winRate" DECIMAL(6,4),
    "totalTrades" INTEGER,
    "finalCapital" DECIMAL(18,2),
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "backtest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "backtestRunId" TEXT,
    "side" "TradeSide" NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'FILLED',
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "strategyName" TEXT,
    "legGroupId" TEXT,
    "brokerage" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "exchangeCharges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "slippage" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "executedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "backtestRunId" TEXT,
    "status" "PositionStatus" NOT NULL DEFAULT 'OPEN',
    "quantity" INTEGER NOT NULL,
    "averagePrice" DECIMAL(18,4) NOT NULL,
    "realizedPnl" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unrealizedPnl" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "legGroupId" TEXT,
    "strategyName" TEXT,
    "openedAt" TIMESTAMPTZ(3) NOT NULL,
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instruments_exchangeToken_key" ON "instruments"("exchangeToken");

-- CreateIndex
CREATE INDEX "instruments_type_isActive_idx" ON "instruments"("type", "isActive");

-- CreateIndex
CREATE INDEX "instruments_underlyingInstrumentId_expiryDate_idx" ON "instruments"("underlyingInstrumentId", "expiryDate");

-- CreateIndex
CREATE INDEX "instruments_expiryDate_type_idx" ON "instruments"("expiryDate", "type");

-- CreateIndex
CREATE UNIQUE INDEX "instruments_exchange_symbol_key" ON "instruments"("exchange", "symbol");

-- CreateIndex
CREATE INDEX "historical_prices_instrumentId_timestamp_idx" ON "historical_prices"("instrumentId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "historical_prices_timestamp_idx" ON "historical_prices"("timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "historical_prices_instrumentId_interval_timestamp_key" ON "historical_prices"("instrumentId", "interval", "timestamp");

-- CreateIndex
CREATE INDEX "option_chains_underlyingInstrumentId_snapshotAt_idx" ON "option_chains"("underlyingInstrumentId", "snapshotAt" DESC);

-- CreateIndex
CREATE INDEX "option_chains_underlyingInstrumentId_expiryDate_snapshotAt_idx" ON "option_chains"("underlyingInstrumentId", "expiryDate", "snapshotAt" DESC);

-- CreateIndex
CREATE INDEX "option_chains_snapshotAt_idx" ON "option_chains"("snapshotAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "option_chains_underlyingInstrumentId_snapshotAt_expiryDate__key" ON "option_chains"("underlyingInstrumentId", "snapshotAt", "expiryDate", "strikePrice", "optionType");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_backtestRunId_key" ON "portfolios"("backtestRunId");

-- CreateIndex
CREATE INDEX "portfolios_mode_idx" ON "portfolios"("mode");

-- CreateIndex
CREATE INDEX "backtest_runs_strategyName_status_idx" ON "backtest_runs"("strategyName", "status");

-- CreateIndex
CREATE INDEX "backtest_runs_status_createdAt_idx" ON "backtest_runs"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "backtest_runs_startDate_endDate_idx" ON "backtest_runs"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "trades_portfolioId_executedAt_idx" ON "trades"("portfolioId", "executedAt" DESC);

-- CreateIndex
CREATE INDEX "trades_backtestRunId_executedAt_idx" ON "trades"("backtestRunId", "executedAt" DESC);

-- CreateIndex
CREATE INDEX "trades_instrumentId_executedAt_idx" ON "trades"("instrumentId", "executedAt" DESC);

-- CreateIndex
CREATE INDEX "trades_legGroupId_idx" ON "trades"("legGroupId");

-- CreateIndex
CREATE INDEX "trades_strategyName_executedAt_idx" ON "trades"("strategyName", "executedAt" DESC);

-- CreateIndex
CREATE INDEX "positions_portfolioId_status_idx" ON "positions"("portfolioId", "status");

-- CreateIndex
CREATE INDEX "positions_backtestRunId_status_idx" ON "positions"("backtestRunId", "status");

-- CreateIndex
CREATE INDEX "positions_instrumentId_status_idx" ON "positions"("instrumentId", "status");

-- CreateIndex
CREATE INDEX "positions_legGroupId_idx" ON "positions"("legGroupId");

-- AddForeignKey
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_underlyingInstrumentId_fkey" FOREIGN KEY ("underlyingInstrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_prices" ADD CONSTRAINT "historical_prices_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_chains" ADD CONSTRAINT "option_chains_underlyingInstrumentId_fkey" FOREIGN KEY ("underlyingInstrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_chains" ADD CONSTRAINT "option_chains_contractInstrumentId_fkey" FOREIGN KEY ("contractInstrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
