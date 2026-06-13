import {
  BacktestEventType,
  createInMemoryEventBus,
  createReplayEngine,
  resetBacktestEventCounter,
  type BacktestEvent,
} from '../../src/backtest/engine/index.js';
import { InvalidBacktestRequestError } from '../../src/backtest/errors/backtest.errors.js';

describe('ReplayEngine', () => {
  beforeEach(() => {
    resetBacktestEventCounter();
  });

  const sampleChain = {
    expiryDate: new Date('2024-01-25T00:00:00.000Z'),
    underlyingPrice: 22_000,
    puts: [
      { strike: 21_800, premium: 120, delta: -0.2 },
      { strike: 21_700, premium: 80, delta: -0.12 },
    ],
    calls: [],
  };

  it('loads and sorts historical events without publishing', () => {
    const bus = createInMemoryEventBus();
    const engine = createReplayEngine(bus);

    const events = engine.load({
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      candles: [
        {
          timestamp: new Date('2024-01-16T09:15:00.000Z'),
          open: 21_900,
          high: 21_950,
          low: 21_850,
          close: 21_920,
          volume: 900,
        },
        {
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          open: 22_000,
          high: 22_050,
          low: 21_950,
          close: 22_020,
          volume: 1_000,
        },
      ],
      optionChains: [
        {
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          chain: sampleChain,
        },
      ],
    });

    expect(events).toHaveLength(3);
    expect(events[0]?.type).toBe(BacktestEventType.MARKET);
    expect(events[1]?.type).toBe(BacktestEventType.OPTION_CHAIN);
    expect(events[2]?.type).toBe(BacktestEventType.MARKET);
  });

  it('publishes events to subscribed strategies in order', () => {
    const bus = createInMemoryEventBus();
    const engine = createReplayEngine(bus);
    const received: BacktestEvent[] = [];

    const result = engine.replay(
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
        optionChains: [
          {
            timestamp: new Date('2024-01-15T09:15:00.000Z'),
            instrumentId: 'inst-nifty',
            symbol: 'NIFTY',
            chain: sampleChain,
          },
        ],
      },
      [
        {
          name: 'test-strategy',
          handle(event) {
            received.push(event);
          },
        },
      ],
    );

    expect(received).toHaveLength(2);
    expect(result.marketEventCount).toBe(1);
    expect(result.optionChainEventCount).toBe(1);
    expect(result.startDate.toISOString()).toBe('2024-01-15T09:15:00.000Z');
  });

  it('rejects replay when no historical data is provided', () => {
    const bus = createInMemoryEventBus();
    const engine = createReplayEngine(bus);

    expect(() =>
      engine.load({
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        candles: [],
      }),
    ).toThrow(InvalidBacktestRequestError);
  });

  it('allows replay with option chains only', () => {
    const bus = createInMemoryEventBus();
    const engine = createReplayEngine(bus);

    const result = engine.replay({
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      candles: [],
      optionChains: [
        {
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          chain: sampleChain,
        },
      ],
    });

    expect(result.optionChainEventCount).toBe(1);
    expect(result.marketEventCount).toBe(0);
  });
});
