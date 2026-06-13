import { InvalidAnalyticsRequestError } from '../errors/analytics.errors.js';
import {
  createAnalyticsMetricsCalculator,
  type AnalyticsMetricsCalculator,
} from '../metrics/analytics-metrics-calculator.js';
import { calculateDrawdownSeries } from '../metrics/performance-metrics.js';
import type { AnalyticsInput, AnalyticsMetrics, DrawdownPoint } from '../types/analytics.types.js';

export interface AnalyticsReport {
  metrics: AnalyticsMetrics;
  drawdownSeries: DrawdownPoint[];
}

export class AnalyticsService {
  constructor(
    private readonly metricsCalculator: AnalyticsMetricsCalculator = createAnalyticsMetricsCalculator(),
  ) {}

  calculateMetrics(input: AnalyticsInput): AnalyticsMetrics {
    this.validateInput(input);
    return this.metricsCalculator.calculate(input);
  }

  generateReport(input: AnalyticsInput): AnalyticsReport {
    this.validateInput(input);

    return {
      metrics: this.metricsCalculator.calculate(input),
      drawdownSeries: calculateDrawdownSeries(input.equityCurve),
    };
  }

  private validateInput(input: AnalyticsInput): void {
    if (input.initialCapital <= 0) {
      throw new InvalidAnalyticsRequestError('initialCapital must be greater than zero');
    }

    if (input.equityCurve.length === 0) {
      throw new InvalidAnalyticsRequestError('equityCurve must contain at least one point');
    }

    if (input.endDate.getTime() < input.startDate.getTime()) {
      throw new InvalidAnalyticsRequestError('endDate must be on or after startDate');
    }
  }
}

export function createAnalyticsService(
  metricsCalculator?: AnalyticsMetricsCalculator,
): AnalyticsService {
  return new AnalyticsService(metricsCalculator);
}
