import { getMetricsService, getTracingService } from '../../observability/instrumentation.js';
import type {
  OrderExecutedMetricAttributes,
  PortfolioSnapshotMetricAttributes,
  PositionOpenedMetricAttributes,
  StrategyErrorMetricAttributes,
  StrategySignalMetricAttributes,
} from '../../observability/types/observability.types.js';
import { BacktestEventType } from '../engine/events/backtest-event-type.enum.js';
import type { BacktestEvent } from '../engine/events/backtest-event.type.js';
import type { BacktestEventSubscriber } from '../engine/replay-engine.types.js';
import type {
  BacktestMetricsContext,
  BacktestMetricsPublisherDeps,
  BacktestPortfolioMode,
  BacktestRunStatus,
  OrderSide,
} from './backtest-metrics.types.js';

export class BacktestMetricsPublisher implements BacktestEventSubscriber {
  readonly name = 'backtest-metrics-publisher';

  private replayStartMs: number | null = null;
  private peakPortfolioValue = 0;
  private readonly portfolioMode: BacktestPortfolioMode;

  constructor(
    private readonly context: BacktestMetricsContext,
    private readonly deps: BacktestMetricsPublisherDeps = {},
  ) {
    this.portfolioMode = context.portfolioMode ?? 'backtest';
  }

  beginReplay(_eventCount?: number): void {
    this.replayStartMs = performance.now();
    this.peakPortfolioValue = 0;
  }

  finishReplay(status: BacktestRunStatus): void {
    if (this.replayStartMs === null) {
      return;
    }

    const durationMs = performance.now() - this.replayStartMs;
    this.replayStartMs = null;

    this.getMetrics().recordBacktestRun(durationMs, {
      strategyName: this.context.strategyName,
      status,
    });
  }

  handle(event: BacktestEvent): void {
    this.getTracing().withSpanSync(
      'backtest.event.metrics',
      {
        'backtest.event.type': event.type,
        'strategy.name': this.context.strategyName,
        'portfolio.id': this.context.portfolioId,
      },
      () => {
        switch (event.type) {
          case BacktestEventType.SIGNAL:
            this.recordStrategySignal({
              strategyName: event.signal.strategyName,
              signalAction: event.signal.action,
            });
            break;
          case BacktestEventType.ORDER_FILLED:
            this.recordOrderExecuted({
              strategyName: event.strategyName,
              side: event.side.toLowerCase() as OrderSide,
            });
            break;
          case BacktestEventType.POSITION_OPENED:
            this.recordPositionOpened({
              strategyName: event.strategyName,
              positionType: 'equity',
            });
            break;
          case BacktestEventType.POSITION_CLOSED:
            break;
          default:
            break;
        }
      },
    );
  }

  recordStrategySignal(attributes: StrategySignalMetricAttributes): void {
    this.getMetrics().recordStrategySignal(attributes);
  }

  recordStrategyError(attributes: StrategyErrorMetricAttributes): void {
    this.getMetrics().recordStrategyError(attributes);
  }

  recordOrderExecuted(attributes: OrderExecutedMetricAttributes): void {
    this.getMetrics().recordOrderExecuted(attributes);
  }

  recordPositionOpened(attributes: PositionOpenedMetricAttributes): void {
    this.getMetrics().recordPositionOpened(attributes);
  }

  recordPortfolioEquity(portfolioValue: number): void {
    if (portfolioValue > this.peakPortfolioValue) {
      this.peakPortfolioValue = portfolioValue;
    }

    const drawdownPercentage = this.calculateDrawdownPercentage(
      this.peakPortfolioValue,
      portfolioValue,
    );

    this.recordPortfolioSnapshot({
      portfolioId: this.context.portfolioId,
      portfolioMode: this.portfolioMode,
      portfolioValue,
      drawdownPercentage,
    });
  }

  recordPortfolioSnapshot(attributes: PortfolioSnapshotMetricAttributes): void {
    this.getMetrics().recordPortfolioSnapshot(attributes);
  }

  private calculateDrawdownPercentage(peak: number, current: number): number {
    if (peak <= 0) {
      return 0;
    }

    const drawdown = (peak - current) / peak;
    return Math.max(0, drawdown * 100);
  }

  private getMetrics(): NonNullable<BacktestMetricsPublisherDeps['metrics']> {
    return this.deps.metrics ?? getMetricsService();
  }

  private getTracing(): NonNullable<BacktestMetricsPublisherDeps['tracing']> {
    return this.deps.tracing ?? getTracingService();
  }
}

export function createBacktestMetricsPublisher(
  context: BacktestMetricsContext,
  deps?: BacktestMetricsPublisherDeps,
): BacktestMetricsPublisher {
  return new BacktestMetricsPublisher(context, deps);
}
