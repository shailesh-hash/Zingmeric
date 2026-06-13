export interface PerformanceMetricsDto {
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  profitFactor: number | null;
  winRate: number;
  totalTrades: number;
  initialCapital: number;
  finalCapital: number;
}

export interface TradeStatisticsDto {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netRealizedPnl: number;
  averageWin: number | null;
  averageLoss: number | null;
  profitFactor: number | null;
  totalFees: number;
  averageTradeFees: number;
}

export interface EquityCurvePointDto {
  timestamp: string;
  equity: number;
  cash: number;
  positionValue: number;
  drawdown: number;
}

export interface DrawdownPointDto {
  timestamp: string;
  equity: number;
  peakEquity: number;
  drawdown: number;
}

export interface BacktestSummaryDto {
  id: string;
  name: string;
  strategyName: string;
  status: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number | null;
  performanceMetrics: PerformanceMetricsDto | null;
  createdAt: string;
  completedAt: string | null;
}

export interface BacktestDetailDto extends BacktestSummaryDto {
  portfolioId: string | null;
  includeCosts: boolean;
  performanceMetrics: PerformanceMetricsDto;
  tradeStatistics: TradeStatisticsDto;
}

export interface BacktestListResponseDto {
  items: BacktestSummaryDto[];
  total: number;
}

export interface EquityCurveResponseDto {
  backtestRunId: string;
  points: EquityCurvePointDto[];
  drawdownSeries: DrawdownPointDto[];
}

export interface PortfolioPositionDto {
  id: string;
  status: string;
  quantity: number;
  averagePrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  strategyName: string | null;
  legGroupId: string | null;
  openedAt: string;
  closedAt: string | null;
}

export interface PortfolioSummaryDto {
  id: string;
  name: string;
  mode: string;
  initialCapital: number;
  cashBalance: number;
  currency: string;
}

export interface PortfolioAnalyticsResponseDto {
  backtestRunId: string;
  portfolio: PortfolioSummaryDto;
  performanceMetrics: PerformanceMetricsDto;
  tradeStatistics: TradeStatisticsDto;
  equityCurve: EquityCurvePointDto[];
  openPositions: PortfolioPositionDto[];
  closedPositions: PortfolioPositionDto[];
}

export interface BacktestAnalyticsListQueryDto {
  strategyName?: string;
  status?: string;
  limit?: number;
  offset?: number;
}
