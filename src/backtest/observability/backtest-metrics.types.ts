import type { OrderSide, PositionType } from '../../observability/metrics/metric-definitions.js';
import type { MetricsService } from '../../observability/metrics/metrics.service.js';
import type { BacktestRunStatus } from '../../observability/types/observability.types.js';
import type { TracingService } from '../../observability/tracing/tracing.service.js';

export type BacktestPortfolioMode = 'backtest' | 'paper' | 'live';

export interface BacktestMetricsContext {
  strategyName: string;
  portfolioId: string;
  portfolioMode?: BacktestPortfolioMode;
  instrumentId?: string;
  symbol?: string;
}

export type ReplayObservabilityContext = BacktestMetricsContext;

export interface BacktestMetricsPublisherDeps {
  metrics?: Pick<
    MetricsService,
    | 'recordBacktestRun'
    | 'recordStrategySignal'
    | 'recordStrategyError'
    | 'recordOrderExecuted'
    | 'recordPositionOpened'
    | 'recordPortfolioSnapshot'
  >;
  tracing?: Pick<TracingService, 'withSpanSync'>;
}

export type { BacktestRunStatus, OrderSide, PositionType };
