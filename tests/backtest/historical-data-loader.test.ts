import {
  BacktestEventType,
  createHistoricalDataLoaderService,
  createEngineMarketEvent,
  createEngineOptionChainEvent,
  resetBacktestEventCounter,
} from '../../src/backtest/engine/index.js';

describe('HistoricalDataLoaderService', () => {
  const loader = createHistoricalDataLoaderService();

  beforeEach(() => {
    resetBacktestEventCounter();
  });

  it('loads candles as MarketEvent objects', () => {
    const events = loader.loadCandles(
      [
        {
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          open: 22_000,
          high: 22_050,
          low: 21_950,
          close: 22_020,
          volume: 1_000,
        },
      ],
      'inst-nifty',
      'NIFTY',
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: BacktestEventType.MARKET,
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      open: 22_000,
      close: 22_020,
      volume: 1_000,
    });
  });

  it('loads option chains as OptionChainEvent objects', () => {
    const chain = {
      expiryDate: new Date('2024-01-25T00:00:00.000Z'),
      underlyingPrice: 22_000,
      puts: [{ strike: 21_800, premium: 120, delta: -0.2 }],
      calls: [{ strike: 22_200, premium: 110, delta: 0.2 }],
    };

    const events = loader.loadOptionChains([
      {
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        chain,
      },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: BacktestEventType.OPTION_CHAIN,
      chain,
    });
  });

  it('sorts events chronologically', () => {
    const events = loader.mergeAndSort(
      [
        createEngineMarketEvent({
          timestamp: new Date('2024-01-17T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          open: 21_900,
          high: 21_950,
          low: 21_850,
          close: 21_920,
          volume: 900,
        }),
      ],
      [
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
      ],
    );

    expect(events[0]?.timestamp.toISOString()).toBe('2024-01-15T09:15:00.000Z');
    expect(events[1]?.timestamp.toISOString()).toBe('2024-01-17T09:15:00.000Z');
  });

  it('orders market events before option chain events at the same timestamp', () => {
    const timestamp = new Date('2024-01-15T09:15:00.000Z');
    const chain = {
      expiryDate: new Date('2024-01-25T00:00:00.000Z'),
      underlyingPrice: 22_000,
      puts: [{ strike: 21_800, premium: 120, delta: -0.2 }],
      calls: [],
    };

    const events = loader.mergeAndSort(
      [
        createEngineOptionChainEvent({
          timestamp,
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          chain,
        }),
      ],
      [
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
      ],
    );

    expect(events[0]?.type).toBe(BacktestEventType.MARKET);
    expect(events[1]?.type).toBe(BacktestEventType.OPTION_CHAIN);
  });
});
