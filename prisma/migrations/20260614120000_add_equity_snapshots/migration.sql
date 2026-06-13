-- CreateTable
CREATE TABLE "equity_snapshots" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "backtestRunId" TEXT,
    "timestamp" TIMESTAMPTZ(3) NOT NULL,
    "cashBalance" DECIMAL(18,2) NOT NULL,
    "portfolioValue" DECIMAL(18,2) NOT NULL,
    "realizedPnl" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unrealizedPnl" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "drawdown" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equity_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equity_snapshots_portfolioId_timestamp_idx" ON "equity_snapshots"("portfolioId", "timestamp" ASC);

-- CreateIndex
CREATE INDEX "equity_snapshots_backtestRunId_timestamp_idx" ON "equity_snapshots"("backtestRunId", "timestamp" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "equity_snapshots_portfolioId_timestamp_key" ON "equity_snapshots"("portfolioId", "timestamp");

-- AddForeignKey
ALTER TABLE "equity_snapshots" ADD CONSTRAINT "equity_snapshots_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equity_snapshots" ADD CONSTRAINT "equity_snapshots_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
