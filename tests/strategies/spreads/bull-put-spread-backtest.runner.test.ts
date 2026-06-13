import {
  BullPutSpreadStrategy,
  runBullPutSpreadBacktest,
} from '../../../src/strategies/spreads/index.js';

describe('runBullPutSpreadBacktest', () => {
  it('runs a full bull put spread backtest example', () => {
    const strategy = new BullPutSpreadStrategy();

    const result = runBullPutSpreadBacktest(
      strategy,
      {
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        initialCapital: 100_000,
        lotSize: 50,
      },
      [
        {
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          close: 22_000,
          optionChain: {
            expiryDate: new Date('2024-01-25T00:00:00.000Z'),
            underlyingPrice: 22_000,
            puts: [
              { strike: 21_500, premium: 25, delta: 0.05 },
              { strike: 21_850, premium: 80, delta: 0.15 },
            ],
            calls: [],
          },
        },
        {
          timestamp: new Date('2024-01-16T09:15:00.000Z'),
          close: 21_950,
          optionChain: {
            expiryDate: new Date('2024-01-25T00:00:00.000Z'),
            underlyingPrice: 21_950,
            puts: [
              { strike: 21_500, premium: 20, delta: 0.05 },
              { strike: 21_850, premium: 25, delta: 0.15 },
            ],
            calls: [],
          },
        },
      ],
    );

    expect(result.trades).toHaveLength(2);
    expect(result.trades[0]?.side).toBe('BUY');
    expect(result.trades[1]?.side).toBe('SELL');
    expect(result.trades[1]?.realizedPnl).toBeGreaterThan(0);
    expect(result.metrics.finalCapital).toBeGreaterThan(100_000);
    expect(result.metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
  });
});
