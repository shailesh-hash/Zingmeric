import type {
  BacktestRunMetricAttributes,
  OrderExecutedMetricAttributes,
  PortfolioSnapshotMetricAttributes,
  PositionOpenedMetricAttributes,
  StrategyErrorMetricAttributes,
  StrategySignalMetricAttributes,
} from '../types/observability.types.js';
import type { PrometheusMetricsBundle } from './prometheus-metrics.js';

export class MetricsService {
  constructor(private readonly metrics: PrometheusMetricsBundle) {}

  recordBacktestRun(durationMs: number, attributes: BacktestRunMetricAttributes): void {
    const labels = {
      strategy: attributes.strategyName,
      status: attributes.status,
    };

    this.metrics.backtestDurationSeconds.observe(labels, durationMs / 1000);
    this.metrics.backtestRunsTotal.inc(labels);
  }

  recordStrategySignal(attributes: StrategySignalMetricAttributes): void {
    this.metrics.strategySignalsGeneratedTotal.inc({
      strategy: attributes.strategyName,
      signal_action: attributes.signalAction.toLowerCase(),
    });
  }

  recordStrategyError(attributes: StrategyErrorMetricAttributes): void {
    this.metrics.strategyErrorsTotal.inc({
      strategy: attributes.strategyName,
      error_type: attributes.errorType,
    });
  }

  recordOrderExecuted(attributes: OrderExecutedMetricAttributes): void {
    this.metrics.ordersExecutedTotal.inc({
      strategy: attributes.strategyName,
      side: attributes.side,
    });
  }

  recordPositionOpened(attributes: PositionOpenedMetricAttributes): void {
    this.metrics.positionsOpenedTotal.inc({
      strategy: attributes.strategyName,
      position_type: attributes.positionType,
    });
  }

  recordPortfolioSnapshot(attributes: PortfolioSnapshotMetricAttributes): void {
    const labels = {
      portfolio_id: attributes.portfolioId,
      portfolio_mode: attributes.portfolioMode,
    };

    this.metrics.portfolioValue.set(labels, attributes.portfolioValue);
    this.metrics.drawdownPercentage.set(labels, attributes.drawdownPercentage);
  }
}

export function createMetricsService(metrics: PrometheusMetricsBundle): MetricsService {
  return new MetricsService(metrics);
}
