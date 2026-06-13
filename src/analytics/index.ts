export {
  AnalyticsService,
  createAnalyticsService,
  type AnalyticsReport,
} from './service/analytics.service.js';
export { InvalidAnalyticsRequestError } from './errors/analytics.errors.js';
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
