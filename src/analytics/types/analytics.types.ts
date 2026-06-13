export interface AnalyticsMetrics {
  cagr: number;
  winRate: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  finalCapital: number;
  initialCapital: number;
}

export interface DrawdownPoint {
  timestamp: Date;
  equity: number;
  peakEquity: number;
  drawdown: number;
}

export interface AnalyticsInput {
  equityCurve: AnalyticsEquityPoint[];
  trades: AnalyticsTrade[];
  initialCapital: number;
  startDate: Date;
  endDate: Date;
  riskFreeRate?: number;
}

export interface AnalyticsEquityPoint {
  timestamp: Date;
  equity: number;
  cash: number;
  positionValue: number;
}

export interface AnalyticsTrade {
  timestamp: Date;
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

export interface AnalyticsConfig {
  riskFreeRate: number;
  tradingDaysPerYear: number;
}

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  riskFreeRate: 0.06,
  tradingDaysPerYear: 252,
};

export function createAnalyticsInput(
  overrides: AnalyticsInput & { riskFreeRate?: number },
): AnalyticsInput {
  return {
    equityCurve: overrides.equityCurve,
    trades: overrides.trades,
    initialCapital: overrides.initialCapital,
    startDate: overrides.startDate,
    endDate: overrides.endDate,
    riskFreeRate: overrides.riskFreeRate,
  };
}
