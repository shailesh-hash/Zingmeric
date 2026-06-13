import { createPaperBroker } from '../../src/broker/index.js';
import {
  createForwardTestingEngine,
  createInMemoryMarketFeed,
  createForwardTestMetricsCollector,
  summarizeExecutions,
} from '../../src/forward-test/index.js';
import { BullPutSpreadStrategyV1 } from '../../src/strategies/spreads/bull-put-spread-v1.strategy.js';
import { createStrategyEngine } from '../../src/strategies/engine/strategy-engine.js';
import { SignalAction } from '../../src/strategies/types/signal.type.js';
import { createMarketSnapshot } from '../../src/strategies/types/market-snapshot.type.js';

const instrumentId = 'inst-nifty';
const symbol = 'NIFTY';

const optionChain = {
  expiryDate: new Date('2024-01-25T00:00:00.000Z'),
  underlyingPrice: 22_000,
  puts: [
    { strike: 21_500, premium: 25, delta: 0.05 },
    { strike: 21_700, premium: 45, delta: 0.08 },
    { strike: 21_950, premium: 110, delta: 0.18 },
  ],
  calls: [],
};

function createEngine(initialCapital = 2_000_000) {
  const strategy = new BullPutSpreadStrategyV1();
  const broker = createPaperBroker({ initialCapital, includeCosts: true });
  const feed = createInMemoryMarketFeed();

  feed.pushMany(instrumentId, [
    createMarketSnapshot({
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      instrumentId,
      symbol,
      price: 22_000,
      optionChain,
    }),
    createMarketSnapshot({
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
      instrumentId,
      symbol,
      price: 21_950,
      optionChain: {
        ...optionChain,
        underlyingPrice: 21_950,
        puts: [
          { strike: 21_500, premium: 20, delta: 0.05 },
          { strike: 21_700, premium: 18, delta: 0.08 },
          { strike: 21_950, premium: 28, delta: 0.18 },
        ],
      },
    }),
    createMarketSnapshot({
      timestamp: new Date('2024-01-17T09:15:00.000Z'),
      instrumentId,
      symbol,
      price: 21_900,
      optionChain: {
        ...optionChain,
        underlyingPrice: 21_900,
        puts: [
          { strike: 21_500, premium: 18, delta: 0.05 },
          { strike: 21_700, premium: 16, delta: 0.08 },
          { strike: 21_950, premium: 24, delta: 0.18 },
        ],
      },
    }),
  ]);

  const engine = createForwardTestingEngine(
    {
      instrumentId,
      symbol,
      strategyName: strategy.name,
      lotSize: 50,
    },
    {
      marketFeed: feed,
      strategyEngine: createStrategyEngine({ strategies: [strategy] }),
      broker,
    },
  );

  return { engine, broker, strategy };
}

describe('ForwardTestingEngine', () => {
  it('runs a daily session using market feed, strategy, and paper broker', async () => {
    const { engine } = createEngine();

    const day1 = await engine.runDaily(new Date('2024-01-15T09:15:00.000Z'));

    expect(day1.skipped).toBe(false);
    expect(day1.signal?.action).toBe(SignalAction.BUY);
    expect(day1.executions).toHaveLength(1);
    expect(day1.executions[0]?.expectedPrice).toBeGreaterThan(0);
    expect(day1.pnlSummary.equity).toBeGreaterThan(0);

    const day2 = await engine.runDaily(new Date('2024-01-16T09:15:00.000Z'));

    expect(day2.signal?.action).toBe(SignalAction.SELL);
    expect(day2.executions).toHaveLength(1);
    expect(day2.executions[0]?.actualPnl).toBeGreaterThan(0);
    expect(day2.executions[0]?.expectedPnl).toBeGreaterThan(0);
  });

  it('tracks expected pnl, actual pnl, and slippage across a multi-day series', async () => {
    const { engine } = createEngine();

    const results = await engine.runDailySeries([
      new Date('2024-01-15T09:15:00.000Z'),
      new Date('2024-01-16T09:15:00.000Z'),
      new Date('2024-01-17T09:15:00.000Z'),
    ]);

    const executions = results.flatMap((result) => result.executions);
    const summary = summarizeExecutions(executions);
    const metrics = engine.metrics;

    expect(results).toHaveLength(3);
    expect(metrics.totalRuns).toBe(3);
    expect(metrics.totalExecutions).toBeGreaterThanOrEqual(2);
    expect(summary.totalActualPnl).toBeGreaterThan(0);
    expect(metrics.totalSlippageCost).toBeGreaterThanOrEqual(0);
    expect(metrics.pnlVariance).toBe(summary.totalActualPnl - summary.totalExpectedPnl);
    expect(engine.getSession()?.runs).toHaveLength(3);
  });

  it('does not execute real money and uses paper broker portfolio only', async () => {
    const { engine, broker } = createEngine(2_000_000);

    const result = await engine.runDaily(new Date('2024-01-15T09:15:00.000Z'));

    expect(result.skipped).toBe(false);
    expect(broker.getFills().length).toBeGreaterThan(0);
    expect(broker.getPortfolioEngine().snapshot.cash).toBeGreaterThan(2_000_000);
  });
});

describe('ForwardTestMetricsCollector', () => {
  it('aggregates slippage and pnl variance', () => {
    const collector = createForwardTestMetricsCollector();

    collector.recordRun([
      {
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        strategyName: 'test',
        instrumentId: instrumentId,
        side: 'BUY',
        quantity: 10,
        expectedPrice: 100,
        actualPrice: 100.5,
        expectedPnl: 0,
        actualPnl: 0,
        slippage: 0.005,
        slippageCost: 5,
      },
      {
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        strategyName: 'test',
        instrumentId: instrumentId,
        side: 'SELL',
        quantity: 10,
        expectedPrice: 110,
        actualPrice: 109.5,
        expectedPnl: 100,
        actualPnl: 95,
        slippage: 0.0045,
        slippageCost: 10,
      },
    ]);

    const snapshot = collector.snapshot();

    expect(snapshot.totalRuns).toBe(1);
    expect(snapshot.totalExecutions).toBe(2);
    expect(snapshot.totalExpectedPnl).toBe(100);
    expect(snapshot.totalActualPnl).toBe(95);
    expect(snapshot.totalSlippageCost).toBe(15);
    expect(snapshot.pnlVariance).toBe(-5);
  });
});
