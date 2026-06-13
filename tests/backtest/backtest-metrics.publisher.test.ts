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
import {
  BacktestEventType,
  createEngineOrderFilledEvent,
  createEngineSignalEvent,
  createInMemoryEventBus,
  createReplayEngine,
  resetBacktestEventCounter,
} from '../../src/backtest/engine/index.js';
import {
  BacktestMetricsPublisher,
  createBacktestMetricsPublisher,
} from '../../src/backtest/observability/index.js';
import { createSignal, SignalAction } from '../../src/strategies/index.js';
import { noOpTracingService } from '../../src/observability/tracing/noop-tracing.service.js';

describe('BacktestMetricsPublisher', () => {
  beforeEach(() => {
    resetBacktestEventCounter();
    resetMetricRegistryForTests();
    resetPrometheusMetricsForTests();
    registerPrometheusMetrics();
  });

  const context = {
    strategyName: 'bull-put-spread',
    portfolioId: 'inst-nifty-backtest',
    portfolioMode: 'backtest' as const,
  };

  function createPublisher(): BacktestMetricsPublisher {
    const metrics = createMetricsService(registerPrometheusMetrics());

    return createBacktestMetricsPublisher(context, {
      metrics,
      tracing: noOpTracingService,
    });
  }

  it('records backtest duration on finishReplay', async () => {
    const publisher = createPublisher();

    publisher.beginReplay(10);
    publisher.finishReplay('success');

    const payload = await getMetricsPayload();

    expect(payload).toContain(METRIC_NAMES.BACKTEST_DURATION_SECONDS);
    expect(payload).toContain(METRIC_NAMES.BACKTEST_RUNS_TOTAL);
    expect(payload).toContain('strategy="bull-put-spread"');
    expect(payload).toContain('status="success"');
  });

  it('records trades from ORDER_FILLED events', async () => {
    const publisher = createPublisher();

    publisher.handle(
      createEngineOrderFilledEvent({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        orderId: 'ord-1',
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        strategyName: 'bull-put-spread',
        side: 'BUY',
        quantity: 10,
        fillPrice: 100,
      }),
    );

    const payload = await getMetricsPayload();

    expect(payload).toContain(METRIC_NAMES.ORDERS_EXECUTED_TOTAL);
    expect(payload).toContain('side="buy"');
  });

  it('records strategy signals from SIGNAL events', async () => {
    const publisher = createPublisher();

    publisher.handle(
      createEngineSignalEvent({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        signal: createSignal({
          action: SignalAction.BUY,
          strategyName: 'bull-put-spread',
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
        }),
      }),
    );

    const payload = await getMetricsPayload();

    expect(payload).toContain(METRIC_NAMES.STRATEGY_SIGNALS_GENERATED_TOTAL);
    expect(payload).toContain('signal_action="buy"');
  });

  it('records strategy errors explicitly', async () => {
    const publisher = createPublisher();

    publisher.recordStrategyError({
      strategyName: 'bull-put-spread',
      errorType: 'InvalidSignalError',
    });

    const payload = await getMetricsPayload();

    expect(payload).toContain(METRIC_NAMES.STRATEGY_ERRORS_TOTAL);
    expect(payload).toContain('error_type="InvalidSignalError"');
  });

  it('tracks portfolio value and drawdown from equity updates', async () => {
    const publisher = createPublisher();

    publisher.recordPortfolioEquity(100_000);
    publisher.recordPortfolioEquity(105_000);
    publisher.recordPortfolioEquity(94_500);

    const payload = await getMetricsPayload();

    expect(payload).toContain(METRIC_NAMES.PORTFOLIO_VALUE);
    expect(payload).toContain(METRIC_NAMES.DRAWDOWN_PERCENTAGE);
    expect(payload).toContain(
      'portfolio_value{portfolio_id="inst-nifty-backtest",portfolio_mode="backtest"} 94500',
    );
    expect(payload).toContain(
      'drawdown_percentage{portfolio_id="inst-nifty-backtest",portfolio_mode="backtest"} 10',
    );
  });
});

describe('ReplayEngine observability', () => {
  beforeEach(() => {
    resetBacktestEventCounter();
    resetMetricRegistryForTests();
    resetPrometheusMetricsForTests();
    registerPrometheusMetrics();
  });

  it('auto-emits metrics when observability context is provided', async () => {
    const bus = createInMemoryEventBus();
    const engine = createReplayEngine(bus);
    const metrics = createMetricsService(registerPrometheusMetrics());

    const publisher = createBacktestMetricsPublisher(
      {
        strategyName: 'test-strategy',
        portfolioId: 'inst-nifty-backtest',
      },
      { metrics, tracing: noOpTracingService },
    );

    engine.replay(
      {
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        candles: [
          {
            timestamp: new Date('2024-01-15T09:15:00.000Z'),
            open: 22_000,
            high: 22_050,
            low: 21_950,
            close: 22_020,
            volume: 1_000,
          },
        ],
        observability: {
          strategyName: 'test-strategy',
          portfolioId: 'inst-nifty-backtest',
        },
      },
      [
        {
          name: 'signal-emitter',
          handle(event) {
            if (event.type !== BacktestEventType.MARKET) {
              return;
            }

            publisher.handle(
              createEngineSignalEvent({
                timestamp: event.timestamp,
                instrumentId: event.instrumentId,
                symbol: event.symbol,
                signal: createSignal({
                  action: SignalAction.HOLD,
                  strategyName: 'test-strategy',
                  timestamp: event.timestamp,
                  instrumentId: event.instrumentId,
                }),
              }),
            );
          },
        },
      ],
      { metricsPublisher: publisher },
    );

    const payload = await getMetricsPayload();

    expect(payload).toContain(METRIC_NAMES.BACKTEST_RUNS_TOTAL);
    expect(payload).toContain('status="success"');
  });
});
