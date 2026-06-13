import type { BacktestAnalyticsListQueryDto } from '../dto/backtest-analytics.dto.js';

export interface BacktestRunRecord {
  id: string;
  name: string;
  strategyName: string;
  status: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  includeCosts: boolean;
  cagr: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  profitFactor: number | null;
  winRate: number | null;
  totalTrades: number | null;
  finalCapital: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  portfolioId: string | null;
}

export interface BacktestTradeRecord {
  id: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  strategyName: string | null;
  legGroupId: string | null;
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  slippage: number;
  totalFees: number;
  executedAt: Date;
}

export interface BacktestPositionRecord {
  id: string;
  status: 'OPEN' | 'CLOSED';
  quantity: number;
  averagePrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  strategyName: string | null;
  legGroupId: string | null;
  openedAt: Date;
  closedAt: Date | null;
}

export interface BacktestEquitySnapshotRecord {
  timestamp: Date;
  cashBalance: number;
  portfolioValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  drawdown: number;
}

export interface BacktestPortfolioRecord {
  id: string;
  name: string;
  mode: string;
  initialCapital: number;
  cashBalance: number;
  currency: string;
}

export interface BacktestAnalyticsRepository {
  findMany(
    query: BacktestAnalyticsListQueryDto,
  ): Promise<{ items: BacktestRunRecord[]; total: number }>;
  findById(backtestRunId: string): Promise<BacktestRunRecord | null>;
  findTradesByBacktestRunId(backtestRunId: string): Promise<BacktestTradeRecord[]>;
  findPositionsByBacktestRunId(backtestRunId: string): Promise<BacktestPositionRecord[]>;
  findEquitySnapshotsByBacktestRunId(
    backtestRunId: string,
  ): Promise<BacktestEquitySnapshotRecord[]>;
  findPortfolioByBacktestRunId(backtestRunId: string): Promise<BacktestPortfolioRecord | null>;
}
