import { BullPutSpreadStrategyV1 } from '../../../src/strategies/spreads/bull-put-spread-v1.strategy.js';
import { createMarketSnapshot } from '../../../src/strategies/types/market-snapshot.type.js';
import { SignalAction } from '../../../src/strategies/types/signal.type.js';

function snapshot(
  timestamp: string,
  puts: { strike: number; premium: number; delta: number }[],
  accountEquity = 100_000,
): ReturnType<typeof createMarketSnapshot> {
  return createMarketSnapshot({
    timestamp: new Date(timestamp),
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    price: 22_000,
    accountEquity,
    optionChain: {
      expiryDate: new Date('2024-01-25T00:00:00.000Z'),
      underlyingPrice: 22_000,
      puts,
      calls: [],
    },
  });
}

const puts = [
  { strike: 21_500, premium: 25, delta: 0.05 },
  { strike: 21_700, premium: 45, delta: 0.08 },
  { strike: 21_850, premium: 80, delta: 0.15 },
  { strike: 21_950, premium: 110, delta: 0.18 },
  { strike: 22_050, premium: 150, delta: 0.22 },
];

describe('BullPutSpreadStrategyV1', () => {
  it('opens a spread using delta ranges without hardcoded strikes', () => {
    const strategy = new BullPutSpreadStrategyV1({ lotSize: 1, maxRiskPct: 0.01 });

    const signal = strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts));

    expect(signal.action).toBe(SignalAction.BUY);
    expect(strategy.openPosition).toEqual(
      expect.objectContaining({
        shortStrike: 21_950,
        longStrike: 21_700,
        entryCredit: 65,
        quantity: 5,
      }),
    );
    expect(signal.execution).toEqual(
      expect.objectContaining({
        kind: 'OPEN_DEFINED_RISK',
        quantity: 5,
        maxLoss: 185,
      }),
    );
  });

  it('selects puts only within configured delta bands', () => {
    const strategy = new BullPutSpreadStrategyV1({ lotSize: 1, maxRiskPct: 0.01 });
    const outOfRangePuts = [
      { strike: 21_400, premium: 15, delta: 0.03 },
      { strike: 21_600, premium: 35, delta: 0.12 },
      { strike: 22_100, premium: 180, delta: 0.25 },
    ];

    const signal = strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', outOfRangePuts));

    expect(signal.action).toBe(SignalAction.HOLD);
    expect(signal.reason).toContain('delta ranges');
  });

  it('holds when account equity is unavailable', () => {
    const strategy = new BullPutSpreadStrategyV1({ lotSize: 1 });
    const signal = strategy.evaluate(
      createMarketSnapshot({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        price: 22_000,
        optionChain: {
          expiryDate: new Date('2024-01-25T00:00:00.000Z'),
          underlyingPrice: 22_000,
          puts,
          calls: [],
        },
      }),
    );

    expect(signal.action).toBe(SignalAction.HOLD);
    expect(signal.reason).toContain('Account equity');
  });

  it('holds when 1% risk budget cannot fund a full lot', () => {
    const strategy = new BullPutSpreadStrategyV1({ lotSize: 50, maxRiskPct: 0.01 });

    const signal = strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts, 100_000));

    expect(signal.action).toBe(SignalAction.HOLD);
    expect(signal.reason).toContain('minimum lot');
  });

  it('closes at 50% profit target', () => {
    const strategy = new BullPutSpreadStrategyV1({ lotSize: 1, maxRiskPct: 0.01 });
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts));

    const signal = strategy.evaluate(
      snapshot('2024-01-16T09:15:00.000Z', [
        { strike: 21_500, premium: 20, delta: 0.05 },
        { strike: 21_700, premium: 18, delta: 0.08 },
        { strike: 21_850, premium: 25, delta: 0.15 },
        { strike: 21_950, premium: 28, delta: 0.18 },
      ]),
    );

    expect(signal.action).toBe(SignalAction.SELL);
    expect(signal.reason).toContain('Profit target');
    expect(strategy.openPosition).toBeNull();
  });

  it('closes at 200% stop loss', () => {
    const strategy = new BullPutSpreadStrategyV1({ lotSize: 1, maxRiskPct: 0.01 });
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts));

    const signal = strategy.evaluate(
      snapshot('2024-01-16T09:15:00.000Z', [
        { strike: 21_500, premium: 10, delta: 0.05 },
        { strike: 21_700, premium: 12, delta: 0.08 },
        { strike: 21_850, premium: 130, delta: 0.15 },
        { strike: 21_950, premium: 142, delta: 0.18 },
      ]),
    );

    expect(signal.action).toBe(SignalAction.SELL);
    expect(signal.reason).toContain('Stop loss');
  });

  it('closes at expiry', () => {
    const strategy = new BullPutSpreadStrategyV1({ lotSize: 1, maxRiskPct: 0.01 });
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts));

    const signal = strategy.evaluate(snapshot('2024-01-25T09:15:00.000Z', puts));

    expect(signal.action).toBe(SignalAction.SELL);
    expect(signal.reason).toContain('Expiry exit');
    expect(strategy.openPosition).toBeNull();
  });

  it('holds while spread is between profit target and stop loss', () => {
    const strategy = new BullPutSpreadStrategyV1({ lotSize: 1, maxRiskPct: 0.01 });
    strategy.evaluate(snapshot('2024-01-15T09:15:00.000Z', puts));

    const signal = strategy.evaluate(
      snapshot('2024-01-16T09:15:00.000Z', [
        { strike: 21_500, premium: 22, delta: 0.05 },
        { strike: 21_700, premium: 30, delta: 0.08 },
        { strike: 21_850, premium: 60, delta: 0.15 },
        { strike: 21_950, premium: 75, delta: 0.18 },
      ]),
    );

    expect(signal.action).toBe(SignalAction.HOLD);
    expect(strategy.openPosition).not.toBeNull();
  });
});
