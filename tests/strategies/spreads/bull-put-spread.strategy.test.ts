import { BullPutSpreadStrategy } from '../../../src/strategies/spreads/bull-put-spread.strategy.js';
import { createMarketSnapshot } from '../../../src/strategies/types/market-snapshot.type.js';
import { SignalAction } from '../../../src/strategies/types/signal.type.js';

function snapshot(
  timestamp: string,
  puts: { strike: number; premium: number; delta: number }[],
): ReturnType<typeof createMarketSnapshot> {
  return createMarketSnapshot({
    timestamp: new Date(timestamp),
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    price: 22_000,
    optionChain: {
      expiryDate: new Date('2024-01-25T00:00:00.000Z'),
      underlyingPrice: 22_000,
      puts,
      calls: [],
    },
  });
}

describe('BullPutSpreadStrategy', () => {
  const puts = [
    { strike: 21_500, premium: 25, delta: 0.05 },
    { strike: 21_850, premium: 80, delta: 0.15 },
  ];

  it('opens a bull put spread at 15/5 delta puts', () => {
    const strategy = new BullPutSpreadStrategy();

    const signal = strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts));

    expect(signal.action).toBe(SignalAction.BUY);
    expect(strategy.openPosition).toEqual(
      expect.objectContaining({
        shortStrike: 21_850,
        longStrike: 21_500,
        entryCredit: 55,
      }),
    );
  });

  it('holds when option chain is unavailable', () => {
    const strategy = new BullPutSpreadStrategy();
    const signal = strategy.evaluate(
      createMarketSnapshot({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        price: 22_000,
      }),
    );

    expect(signal.action).toBe(SignalAction.HOLD);
  });

  it('closes at 50% profit target', () => {
    const strategy = new BullPutSpreadStrategy();
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts));

    const signal = strategy.evaluate(
      snapshot('2024-01-16T09:15:00.000Z', [
        { strike: 21_500, premium: 20, delta: 0.05 },
        { strike: 21_850, premium: 25, delta: 0.15 },
      ]),
    );

    expect(signal.action).toBe(SignalAction.SELL);
    expect(signal.reason).toContain('Profit target');
    expect(strategy.openPosition).toBeNull();
  });

  it('closes at 200% premium stop loss', () => {
    const strategy = new BullPutSpreadStrategy();
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts));

    const signal = strategy.evaluate(
      snapshot('2024-01-16T09:15:00.000Z', [
        { strike: 21_500, premium: 10, delta: 0.05 },
        { strike: 21_850, premium: 130, delta: 0.15 },
      ]),
    );

    expect(signal.action).toBe(SignalAction.SELL);
    expect(signal.reason).toContain('Stop loss');
  });

  it('holds while spread is between profit target and stop loss', () => {
    const strategy = new BullPutSpreadStrategy();
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts));

    const signal = strategy.evaluate(
      snapshot('2024-01-16T09:15:00.000Z', [
        { strike: 21_500, premium: 22, delta: 0.05 },
        { strike: 21_850, premium: 60, delta: 0.15 },
      ]),
    );

    expect(signal.action).toBe(SignalAction.HOLD);
    expect(strategy.openPosition).not.toBeNull();
  });
});
