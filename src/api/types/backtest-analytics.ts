export interface ApiErrorResponse {
  error: string;
  message: string;
}

export type {
  BacktestDetailDto,
  BacktestListResponseDto,
  BacktestSummaryDto,
  EquityCurveResponseDto,
  PerformanceMetricsDto,
  PortfolioAnalyticsResponseDto,
  TradeStatisticsDto,
} from '../../analytics/dto/backtest-analytics.dto.js';

export interface BacktestListQuerystring {
  strategyName?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface BacktestIdParams {
  id: string;
}
