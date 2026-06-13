import { IronCondorStrategy } from '../../../src/strategies/spreads/iron-condor.strategy.js';
import { createMarketSnapshot } from '../../../src/strategies/types/market-snapshot.type.js';
import { SignalAction } from '../../../src/strategies/types/signal.type.js';

const defaultPuts = [
  { strike: 21_500, premium: 25, delta: 0.05 },
  { strike: 21_850, premium: 80, delta: 0.15 },
];

const defaultCalls = [
  { strike: 22_150, premium: 75, delta: 0.15 },
  { strike: 22_500, premium: 20, delta: 0.05 },
];

function snapshot(
  timestamp: string,
  puts: { strike: number; premium: number; delta: number }[],
  calls: { strike: number; premium: number; delta: number }[],
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
      calls,
    },
  });
}

describe('IronCondorStrategy', () => {
  it('opens an iron condor at 15/5 delta on both wings', () => {
    const strategy = new IronCondorStrategy();

    const signal = strategy.evaluate(
      snapshot('2024-01-15T09:15:00.000Z', defaultPuts, defaultCalls),
    );

    expect(signal.action).toBe(SignalAction.BUY);
    expect(strategy.openPosition?.entryCredit).toBe(110);
    expect(strategy.openPosition?.maxLoss).toBe(240);
    expect(strategy.openPosition?.putSpread.shortStrike).toBe(21_850);
    expect(strategy.openPosition?.putSpread.longStrike).toBe(21_500);
    expect(strategy.openPosition?.callSpread.shortStrike).toBe(22_150);
    expect(strategy.openPosition?.callSpread.longStrike).toBe(22_500);
  });

  it('holds when option chain is unavailable', () => {
    const strategy = new IronCondorStrategy();
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

  it('holds when calls are missing from the chain', () => {
    const strategy = new IronCondorStrategy();
    const signal = strategy.evaluate(
      createMarketSnapshot({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        price: 22_000,
        optionChain: {
          expiryDate: new Date('2024-01-25T00:00:00.000Z'),
          underlyingPrice: 22_000,
          puts: defaultPuts,
          calls: [],
        },
      }),
    );

    expect(signal.action).toBe(SignalAction.HOLD);
  });

  it('rejects overlapping put and call wings', () => {
    const strategy = new IronCondorStrategy();
    const signal = strategy.evaluate(
      snapshot('2024-01-15T09:15:00.000Z', defaultPuts, [
        { strike: 21_800, premium: 75, delta: 0.15 },
        { strike: 22_000, premium: 20, delta: 0.05 },
      ]),
    );

    expect(signal.action).toBe(SignalAction.HOLD);
    expect(signal.reason).toContain('overlap');
  });

  it('closes at 50% profit target on total condor debit', () => {
    const strategy = new IronCondorStrategy();
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', defaultPuts, defaultCalls));

    const signal = strategy.evaluate(
      snapshot(
        '2024-01-16T09:15:00.000Z',
        [
          { strike: 21_500, premium: 10, delta: 0.05 },
          { strike: 21_850, premium: 20, delta: 0.15 },
        ],
        [
          { strike: 22_150, premium: 25, delta: 0.15 },
          { strike: 22_500, premium: 10, delta: 0.05 },
        ],
      ),
    );

    expect(signal.action).toBe(SignalAction.SELL);
    expect(signal.reason).toContain('Profit target');
    expect(strategy.openPosition).toBeNull();
  });

  it('closes at 200% premium stop loss on total condor debit', () => {
    const strategy = new IronCondorStrategy();
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', defaultPuts, defaultCalls));

    const signal = strategy.evaluate(
      snapshot(
        '2024-01-16T09:15:00.000Z',
        [
          { strike: 21_500, premium: 50, delta: 0.05 },
          { strike: 21_850, premium: 200, delta: 0.15 },
        ],
        [
          { strike: 22_150, premium: 100, delta: 0.15 },
          { strike: 22_500, premium: 30, delta: 0.05 },
        ],
      ),
    );

    expect(signal.action).toBe(SignalAction.SELL);
    expect(signal.reason).toContain('Stop loss');
  });

  it('holds while condor is between profit target and stop loss', () => {
    const strategy = new IronCondorStrategy();
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', defaultPuts, defaultCalls));

    const signal = strategy.evaluate(
      snapshot(
        '2024-01-16T09:15:00.000Z',
        [
          { strike: 21_500, premium: 20, delta: 0.05 },
          { strike: 21_850, premium: 60, delta: 0.15 },
        ],
        [
          { strike: 22_150, premium: 50, delta: 0.15 },
          { strike: 22_500, premium: 15, delta: 0.05 },
        ],
      ),
    );

    expect(signal.action).toBe(SignalAction.HOLD);
    expect(strategy.openPosition).not.toBeNull();
  });
});
