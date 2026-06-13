import {
  InvalidSignalError,
  InvalidStrategyEngineError,
  StrategyNotFoundError,
  SignalAction,
  createMarketSnapshot,
  createSignal,
  createStrategyEngine,
  type MarketSnapshot,
  type Strategy,
} from '../../src/strategies/index.js';

class StaticActionStrategy implements Strategy {
  constructor(
    readonly name: string,
    private readonly action: SignalAction,
  ) {}

  evaluate(snapshot: MarketSnapshot) {
    return createSignal({
      action: this.action,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
    });
  }
}

class ThresholdStrategy implements Strategy {
  readonly name = 'threshold';

  constructor(
    private readonly buyAbove: number,
    private readonly sellBelow: number,
  ) {}

  evaluate(snapshot: MarketSnapshot) {
    let action = SignalAction.HOLD;

    if (snapshot.price >= this.buyAbove) {
      action = SignalAction.BUY;
    } else if (snapshot.price <= this.sellBelow) {
      action = SignalAction.SELL;
    }

    return createSignal({
      action,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
      reason: `price=${String(snapshot.price)}`,
    });
  }
}

function snapshot(price: number): MarketSnapshot {
  return createMarketSnapshot({
    timestamp: new Date('2024-01-15T09:15:00.000Z'),
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    price,
    close: price,
  });
}

describe('StrategyEngine', () => {
  it('requires at least one injected strategy', () => {
    expect(() => createStrategyEngine({ strategies: [] })).toThrow(InvalidStrategyEngineError);
  });

  it('rejects duplicate strategy names', () => {
    expect(() =>
      createStrategyEngine({
        strategies: [
          new StaticActionStrategy('dup', SignalAction.HOLD),
          new StaticActionStrategy('dup', SignalAction.BUY),
        ],
      }),
    ).toThrow(InvalidStrategyEngineError);
  });

  it('uses the first strategy as default when none is specified', () => {
    const engine = createStrategyEngine({
      strategies: [
        new StaticActionStrategy('primary', SignalAction.BUY),
        new StaticActionStrategy('secondary', SignalAction.SELL),
      ],
    });

    const signal = engine.generateSignal(snapshot(100));

    expect(signal.action).toBe(SignalAction.BUY);
    expect(signal.strategyName).toBe('primary');
  });

  it('generates BUY, SELL, and HOLD signals via injected strategies', () => {
    const engine = createStrategyEngine({
      strategies: [new ThresholdStrategy(105, 95)],
      defaultStrategyName: 'threshold',
    });

    expect(engine.generateSignal(snapshot(110)).action).toBe(SignalAction.BUY);
    expect(engine.generateSignal(snapshot(90)).action).toBe(SignalAction.SELL);
    expect(engine.generateSignal(snapshot(100)).action).toBe(SignalAction.HOLD);
  });

  it('generates signals for all registered strategies', () => {
    const engine = createStrategyEngine({
      strategies: [
        new StaticActionStrategy('hold-strategy', SignalAction.HOLD),
        new StaticActionStrategy('buy-strategy', SignalAction.BUY),
      ],
    });

    const signals = engine.generateSignals(snapshot(100));

    expect(signals).toHaveLength(2);
    expect(signals.map((item) => item.action).sort()).toEqual(
      [SignalAction.BUY, SignalAction.HOLD].sort(),
    );
  });

  it('lists registered strategy names', () => {
    const engine = createStrategyEngine({
      strategies: [
        new StaticActionStrategy('alpha', SignalAction.HOLD),
        new StaticActionStrategy('beta', SignalAction.SELL),
      ],
    });

    expect(engine.listStrategies()).toEqual(['alpha', 'beta']);
  });

  it('throws when requesting an unknown strategy', () => {
    const engine = createStrategyEngine({
      strategies: [new StaticActionStrategy('known', SignalAction.HOLD)],
    });

    expect(() => engine.generateSignal(snapshot(100), 'missing')).toThrow(StrategyNotFoundError);
  });

  it('rejects invalid signals returned by a strategy', () => {
    const invalidStrategy: Strategy = {
      name: 'invalid',
      evaluate: (marketSnapshot) => ({
        action: 'WAIT' as SignalAction,
        strategyName: 'invalid',
        timestamp: marketSnapshot.timestamp,
        instrumentId: marketSnapshot.instrumentId,
      }),
    };

    const engine = createStrategyEngine({ strategies: [invalidStrategy] });

    expect(() => engine.generateSignal(snapshot(100))).toThrow(InvalidSignalError);
  });

  it('rejects signals with mismatched snapshot metadata', () => {
    const mismatchedStrategy: Strategy = {
      name: 'mismatch',
      evaluate: () =>
        createSignal({
          action: SignalAction.HOLD,
          strategyName: 'mismatch',
          timestamp: new Date('2024-01-16T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
        }),
    };

    const engine = createStrategyEngine({ strategies: [mismatchedStrategy] });

    expect(() => engine.generateSignal(snapshot(100))).toThrow(InvalidSignalError);
  });
});
