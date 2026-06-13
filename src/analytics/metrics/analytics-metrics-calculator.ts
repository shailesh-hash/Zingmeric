import {
  calculateCagr,
  calculateMaxDrawdown,
  calculatePeriodReturns,
  calculateProfitFactor,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateWinRate,
} from './performance-metrics.js';
import {
  DEFAULT_ANALYTICS_CONFIG,
  type AnalyticsConfig,
  type AnalyticsInput,
  type AnalyticsMetrics,
} from '../types/analytics.types.js';

export interface AnalyticsMetricsCalculator {
  calculate(input: AnalyticsInput): AnalyticsMetrics;
}

export class DefaultAnalyticsMetricsCalculator implements AnalyticsMetricsCalculator {
  constructor(private readonly config: AnalyticsConfig = DEFAULT_ANALYTICS_CONFIG) {}

  calculate(input: AnalyticsInput): AnalyticsMetrics {
    const riskFreeRate = input.riskFreeRate ?? this.config.riskFreeRate;
    const finalCapital = input.equityCurve.at(-1)?.equity ?? input.initialCapital;
    const returns = calculatePeriodReturns(input.equityCurve);
    const closingTrades = input.trades.filter((trade) => trade.side === 'SELL');

    return {
      cagr: calculateCagr(input.initialCapital, finalCapital, input.startDate, input.endDate),
      winRate: calculateWinRate(input.trades),
      sharpeRatio: calculateSharpeRatio(returns, riskFreeRate, this.config.tradingDaysPerYear),
      sortinoRatio: calculateSortinoRatio(returns, riskFreeRate, this.config.tradingDaysPerYear),
      profitFactor: calculateProfitFactor(input.trades),
      maxDrawdown: calculateMaxDrawdown(input.equityCurve),
      totalTrades: closingTrades.length,
      finalCapital,
      initialCapital: input.initialCapital,
    };
  }
}

export function createAnalyticsMetricsCalculator(
  config?: Partial<AnalyticsConfig>,
): DefaultAnalyticsMetricsCalculator {
  return new DefaultAnalyticsMetricsCalculator({
    ...DEFAULT_ANALYTICS_CONFIG,
    ...config,
  });
}
