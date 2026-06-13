import { METRIC_NAMES } from '../../src/observability/metrics/metric-definitions.js';
import {
  getMetricsPayload,
  resetMetricRegistryForTests,
} from '../../src/observability/metrics/metric-registry.js';
import {
  createMetricsService,
  registerPrometheusMetrics,
  resetPrometheusMetricsForTests,
} from '../../src/observability/metrics/index.js';

describe('MetricsService', () => {
  beforeEach(() => {
    resetMetricRegistryForTests();
    resetPrometheusMetricsForTests();
    registerPrometheusMetrics();
  });

  it('records backtest metrics in Prometheus format', async () => {
    const metrics = createMetricsService(registerPrometheusMetrics());

    metrics.recordBacktestRun(1500, {
      strategyName: 'bull-put-spread',
      status: 'success',
    });

    const payload = await getMetricsPayload();

    expect(payload).toContain(METRIC_NAMES.BACKTEST_DURATION_SECONDS);
    expect(payload).toContain(METRIC_NAMES.BACKTEST_RUNS_TOTAL);
    expect(payload).toContain('strategy="bull-put-spread"');
    expect(payload).toContain('status="success"');
  });

  it('records strategy, order, position, and portfolio gauges', async () => {
    const metrics = createMetricsService(registerPrometheusMetrics());

    metrics.recordStrategySignal({
      strategyName: 'bull-put-spread',
      signalAction: 'BUY',
    });
    metrics.recordStrategyError({
      strategyName: 'bull-put-spread',
      errorType: 'InvalidSignalError',
    });
    metrics.recordOrderExecuted({
      strategyName: 'bull-put-spread',
      side: 'sell',
    });
    metrics.recordPositionOpened({
      strategyName: 'bull-put-spread',
      positionType: 'defined_risk',
    });
    metrics.recordPortfolioSnapshot({
      portfolioId: 'portfolio-1',
      portfolioMode: 'backtest',
      portfolioValue: 105_000,
      drawdownPercentage: 2.5,
    });

    const payload = await getMetricsPayload();

    expect(payload).toContain(METRIC_NAMES.STRATEGY_SIGNALS_GENERATED_TOTAL);
    expect(payload).toContain(METRIC_NAMES.STRATEGY_ERRORS_TOTAL);
    expect(payload).toContain(METRIC_NAMES.ORDERS_EXECUTED_TOTAL);
    expect(payload).toContain(METRIC_NAMES.POSITIONS_OPENED_TOTAL);
    expect(payload).toContain(METRIC_NAMES.PORTFOLIO_VALUE);
    expect(payload).toContain(METRIC_NAMES.DRAWDOWN_PERCENTAGE);
    expect(payload).toContain(
      'portfolio_value{portfolio_id="portfolio-1",portfolio_mode="backtest"} 105000',
    );
  });
});
