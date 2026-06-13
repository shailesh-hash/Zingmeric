import { createMarketEvent, createEventReplayEngine } from '../../src/backtest/index.js';

describe('EventReplayEngine', () => {
  const engine = createEventReplayEngine();

  it('replays market events in chronological order', () => {
    const events = engine.replay([
      createMarketEvent({
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        price: 21_950,
      }),
      createMarketEvent({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        price: 22_000,
      }),
    ]);

    expect(events[0]?.timestamp.toISOString()).toBe('2024-01-15T09:15:00.000Z');
    expect(events[1]?.timestamp.toISOString()).toBe('2024-01-16T09:15:00.000Z');
  });

  it('iterates events in chronological order', () => {
    const timestamps = [
      ...engine.iterate([
        createMarketEvent({
          timestamp: new Date('2024-01-17T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          price: 21_900,
        }),
        createMarketEvent({
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          price: 22_000,
        }),
      ]),
    ].map((event) => event.timestamp.toISOString());

    expect(timestamps).toEqual(['2024-01-15T09:15:00.000Z', '2024-01-17T09:15:00.000Z']);
  });
});
