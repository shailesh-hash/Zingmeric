import type {
  BacktestRunMetricAttributes,
  OrderExecutedMetricAttributes,
  PortfolioSnapshotMetricAttributes,
  PositionOpenedMetricAttributes,
  StrategyErrorMetricAttributes,
  StrategySignalMetricAttributes,
} from '../types/observability.types.js';

export class NoOpMetricsService {
  recordBacktestRun(_durationMs: number, _attributes: BacktestRunMetricAttributes): void {
    void _durationMs;
    void _attributes;
  }

  recordStrategySignal(_attributes: StrategySignalMetricAttributes): void {
    void _attributes;
  }

  recordStrategyError(_attributes: StrategyErrorMetricAttributes): void {
    void _attributes;
  }

  recordOrderExecuted(_attributes: OrderExecutedMetricAttributes): void {
    void _attributes;
  }

  recordPositionOpened(_attributes: PositionOpenedMetricAttributes): void {
    void _attributes;
  }

  recordPortfolioSnapshot(_attributes: PortfolioSnapshotMetricAttributes): void {
    void _attributes;
  }
}

export const noOpMetricsService = new NoOpMetricsService();
