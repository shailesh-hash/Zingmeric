export interface AnalyticsEquityPointDto {
  timestamp: string;
  equity: number;
  cash: number;
  positionValue: number;
}

export interface AnalyticsTradeDto {
  timestamp: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  slippage: number;
  totalFees: number;
  realizedPnl: number;
}

export interface AnalyticsMetricsRequest {
  initialCapital: number;
  startDate: string;
  endDate: string;
  riskFreeRate?: number;
  equityCurve: AnalyticsEquityPointDto[];
  trades: AnalyticsTradeDto[];
}

export interface AnalyticsMetricsResponse {
  cagr: number;
  winRate: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number | null;
  maxDrawdown: number;
  totalTrades: number;
  finalCapital: number;
  initialCapital: number;
}

export interface AnalyticsDrawdownPointDto {
  timestamp: string;
  equity: number;
  peakEquity: number;
  drawdown: number;
}

export interface AnalyticsReportResponse {
  metrics: AnalyticsMetricsResponse;
  drawdownSeries: AnalyticsDrawdownPointDto[];
}

export interface AnalyticsErrorResponse {
  error: string;
  message: string;
}
