export {
  AnalyticsService,
  createAnalyticsService,
  type AnalyticsReport,
} from './service/analytics.service.js';
export {
  BacktestAnalyticsService,
  createBacktestAnalyticsService,
} from './service/backtest-analytics.service.js';
export { calculateTradeStatistics } from './service/trade-statistics.calculator.js';
export { InvalidAnalyticsRequestError } from './errors/analytics.errors.js';
export { BacktestNotFoundError } from './errors/backtest-analytics.errors.js';
export type {
  BacktestDetailDto,
  BacktestListResponseDto,
  BacktestSummaryDto,
  EquityCurveResponseDto,
  PerformanceMetricsDto,
  PortfolioAnalyticsResponseDto,
  TradeStatisticsDto,
} from './dto/backtest-analytics.dto.js';
export type {
  BacktestAnalyticsRepository,
  BacktestRunRecord,
} from './repository/backtest-analytics.repository.js';
export { createPrismaBacktestAnalyticsRepository } from './repository/prisma-backtest-analytics.repository.js';
export {
  createInMemoryBacktestAnalyticsRepository,
  InMemoryBacktestAnalyticsRepository,
} from './repository/in-memory-backtest-analytics.repository.js';
export {
  createAnalyticsMetricsCalculator,
  DefaultAnalyticsMetricsCalculator,
  type AnalyticsMetricsCalculator,
} from './metrics/analytics-metrics-calculator.js';
export {
  calculateCagr,
  calculateDrawdownSeries,
  calculateMaxDrawdown,
  calculatePeriodReturns,
  calculateProfitFactor,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateWinRate,
} from './metrics/performance-metrics.js';
export {
  DEFAULT_ANALYTICS_CONFIG,
  createAnalyticsInput,
  type AnalyticsConfig,
  type AnalyticsEquityPoint,
  type AnalyticsInput,
  type AnalyticsMetrics,
  type AnalyticsTrade,
  type DrawdownPoint,
} from './types/analytics.types.js';
