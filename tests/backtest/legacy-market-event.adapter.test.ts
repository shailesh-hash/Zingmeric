import {
  BacktestEventType,
  createEngineMarketEvent,
  createEngineOptionChainEvent,
  fromLegacyMarketEvents,
  toLegacyMarketEvents,
  resetBacktestEventCounter,
} from '../../src/backtest/engine/index.js';
import { createMarketEvent } from '../../src/backtest/types/market-event.type.js';

describe('legacy market event adapter', () => {
  beforeEach(() => {
    resetBacktestEventCounter();
  });

  it('splits legacy events into market and option chain events', () => {
    const chain = {
      expiryDate: new Date('2024-01-25T00:00:00.000Z'),
      underlyingPrice: 22_000,
      puts: [{ strike: 21_800, premium: 120, delta: -0.2 }],
      calls: [],
    };

    const events = fromLegacyMarketEvents([
      createMarketEvent({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        price: 22_020,
        close: 22_020,
        optionChain: chain,
      }),
    ]);

    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe(BacktestEventType.MARKET);
    expect(events[1]?.type).toBe(BacktestEventType.OPTION_CHAIN);
  });

  it('merges market and option chain events back to legacy format', () => {
    const timestamp = new Date('2024-01-15T09:15:00.000Z');
    const chain = {
      expiryDate: new Date('2024-01-25T00:00:00.000Z'),
      underlyingPrice: 22_000,
      puts: [{ strike: 21_800, premium: 120, delta: -0.2 }],
      calls: [],
    };

    const legacy = toLegacyMarketEvents([
      createEngineMarketEvent({
        timestamp,
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        open: 22_000,
        high: 22_050,
        low: 21_950,
        close: 22_020,
        volume: 1_000,
      }),
      createEngineOptionChainEvent({
        timestamp,
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        chain,
      }),
    ]);

    expect(legacy).toHaveLength(1);
    expect(legacy[0]?.optionChain).toEqual(chain);
    expect(legacy[0]?.close).toBe(22_020);
  });
});
