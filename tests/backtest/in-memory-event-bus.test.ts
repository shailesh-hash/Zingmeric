import {
  BacktestEventType,
  createEngineMarketEvent,
  createInMemoryEventBus,
  resetBacktestEventCounter,
} from '../../src/backtest/engine/index.js';

describe('InMemoryEventBus', () => {
  beforeEach(() => {
    resetBacktestEventCounter();
  });

  it('delivers events to typed subscribers', () => {
    const bus = createInMemoryEventBus();
    const received: string[] = [];

    bus.subscribe(BacktestEventType.MARKET, () => {
      received.push('market');
    });
    bus.subscribe(BacktestEventType.OPTION_CHAIN, () => {
      received.push('option-chain');
    });

    bus.publish(
      createEngineMarketEvent({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        open: 22_000,
        high: 22_050,
        low: 21_950,
        close: 22_020,
        volume: 1_000,
      }),
    );

    expect(received).toEqual(['market']);
  });

  it('delivers events to global subscribers', () => {
    const bus = createInMemoryEventBus();
    const received: BacktestEventType[] = [];

    bus.subscribeAll((event) => {
      received.push(event.type);
    });

    bus.publish(
      createEngineMarketEvent({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        open: 22_000,
        high: 22_050,
        low: 21_950,
        close: 22_020,
        volume: 1_000,
      }),
    );

    expect(received).toEqual([BacktestEventType.MARKET]);
  });

  it('unsubscribes handlers', () => {
    const bus = createInMemoryEventBus();
    let count = 0;

    const subscription = bus.subscribe(BacktestEventType.MARKET, () => {
      count += 1;
    });

    bus.publish(
      createEngineMarketEvent({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        open: 22_000,
        high: 22_050,
        low: 21_950,
        close: 22_020,
        volume: 1_000,
      }),
    );
    subscription.unsubscribe();
    bus.publish(
      createEngineMarketEvent({
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        open: 21_900,
        high: 21_950,
        low: 21_850,
        close: 21_920,
        volume: 900,
      }),
    );

    expect(count).toBe(1);
  });

  it('clears all subscriptions', () => {
    const bus = createInMemoryEventBus();
    let count = 0;

    bus.subscribeAll(() => {
      count += 1;
    });
    bus.clear();
    bus.publish(
      createEngineMarketEvent({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        open: 22_000,
        high: 22_050,
        low: 21_950,
        close: 22_020,
        volume: 1_000,
      }),
    );

    expect(count).toBe(0);
  });
});
