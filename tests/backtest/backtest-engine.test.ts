import {
  CandleBacktestEngine,
  CandleReplayer,
  createBacktestConfig,
  DefaultMetricsCalculator,
  DefaultOrderSimulator,
  InvalidBacktestRequestError,
  PortfolioTracker,
  createPortfolioState,
  type BacktestCandle,
} from '../../src/backtest/index.js';
import {
  createSignal,
  createStrategyEngine,
  SignalAction,
  type MarketSnapshot,
  type Strategy,
} from '../../src/strategies/index.js';

class AlternatingStrategy implements Strategy {
  readonly name = 'alternating';

  private action: SignalAction = SignalAction.BUY;

  evaluate(snapshot: MarketSnapshot) {
    const signal = createSignal({
      action: this.action,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
    });

    this.action = this.action === SignalAction.BUY ? SignalAction.SELL : SignalAction.BUY;

    return signal;
  }
}

function candle(timestamp: string, close: number): BacktestCandle {
  return {
    timestamp: new Date(timestamp),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1000,
  };
}

describe('CandleBacktestEngine', () => {
  const strategyEngine = createStrategyEngine({
    strategies: [new AlternatingStrategy()],
    defaultStrategyName: 'alternating',
  });

  const engine = new CandleBacktestEngine({
    strategyEngine,
    candleReplayer: new CandleReplayer(),
    orderSimulator: new DefaultOrderSimulator(),
    metricsCalculator: new DefaultMetricsCalculator(),
    createPortfolioTracker: (initialCapital) =>
      new PortfolioTracker(createPortfolioState(initialCapital)),
  });

  it('replays candles chronologically and produces metrics', () => {
    const result = engine.run({
      config: createBacktestConfig({
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        strategyName: 'alternating',
        initialCapital: 100_000,
        quantityPerTrade: 10,
        includeCosts: true,
      }),
      candles: [
        candle('2024-01-15T09:15:00.000Z', 100),
        candle('2024-01-15T09:16:00.000Z', 110),
        candle('2024-01-15T09:17:00.000Z', 105),
        candle('2024-01-15T09:18:00.000Z', 115),
      ],
    });

    expect(result.trades.length).toBeGreaterThan(0);
    expect(result.equityCurve).toHaveLength(4);
    expect(result.metrics.initialCapital).toBe(100_000);
    expect(result.metrics.finalCapital).toBeGreaterThan(0);
    expect(Number.isFinite(result.metrics.cagr)).toBe(true);
    expect(Number.isFinite(result.metrics.sharpeRatio)).toBe(true);
    expect(result.metrics.profitFactor).toBeGreaterThanOrEqual(0);
    expect(result.metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('generates signals and simulates round-trip trades', () => {
    const result = engine.run({
      config: createBacktestConfig({
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        strategyName: 'alternating',
        initialCapital: 100_000,
        quantityPerTrade: 5,
        includeCosts: false,
      }),
      candles: [candle('2024-01-15T09:15:00.000Z', 100), candle('2024-01-15T09:16:00.000Z', 120)],
    });

    expect(result.trades).toEqual([
      expect.objectContaining({ side: 'BUY', quantity: 5, price: 100 }),
      expect.objectContaining({ side: 'SELL', quantity: 5, price: 120, realizedPnl: 100 }),
    ]);
    expect(result.metrics.totalTrades).toBe(1);
    expect(result.metrics.profitFactor).toBeGreaterThan(0);
  });

  it('rejects empty candle input', () => {
    expect(() =>
      engine.run({
        config: createBacktestConfig({
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          strategyName: 'alternating',
        }),
        candles: [],
      }),
    ).toThrow(InvalidBacktestRequestError);
  });

  it('sorts unsorted candles before replay', () => {
    const result = engine.run({
      config: createBacktestConfig({
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        strategyName: 'alternating',
        initialCapital: 100_000,
        quantityPerTrade: 1,
        includeCosts: false,
      }),
      candles: [
        candle('2024-01-15T09:17:00.000Z', 105),
        candle('2024-01-15T09:15:00.000Z', 100),
        candle('2024-01-15T09:16:00.000Z', 110),
      ],
    });

    expect(result.startDate.toISOString()).toBe('2024-01-15T09:15:00.000Z');
    expect(result.endDate.toISOString()).toBe('2024-01-15T09:17:00.000Z');
    expect(result.trades[0]?.side).toBe('BUY');
  });
});
