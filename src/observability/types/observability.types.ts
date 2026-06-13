export type BacktestRunStatus = 'success' | 'error';

export interface BacktestRunMetricAttributes {
  strategyName: string;
  status: BacktestRunStatus;
}

export interface StrategySignalMetricAttributes {
  strategyName: string;
  signalAction: string;
}

export interface StrategyErrorMetricAttributes {
  strategyName: string;
  errorType: string;
}

export interface OrderExecutedMetricAttributes {
  strategyName: string;
  side: 'buy' | 'sell';
}

export interface PositionOpenedMetricAttributes {
  strategyName: string;
  positionType: 'equity' | 'defined_risk' | 'option' | 'future';
}

export interface PortfolioSnapshotMetricAttributes {
  portfolioId: string;
  portfolioMode: string;
  portfolioValue: number;
  drawdownPercentage: number;
}

export interface PortfolioMetricsPublisher {
  recordPositionOpened(attributes: PositionOpenedMetricAttributes): void;
  recordPortfolioEquity(portfolioValue: number): void;
}

export interface StrategyExecutionMetricAttributes {
  strategyName: string;
}

export interface DbQueryMetricAttributes {
  model?: string;
  operation?: string;
}

export type SpanAttributes = Record<string, string | number | boolean>;
