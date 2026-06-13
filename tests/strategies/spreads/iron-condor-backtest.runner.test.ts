import {
  IronCondorStrategy,
  runIronCondorBacktest,
} from '../../../src/strategies/spreads/index.js';

const basePuts = [
  { strike: 21_500, premium: 25, delta: 0.05 },
  { strike: 21_850, premium: 80, delta: 0.15 },
];

const baseCalls = [
  { strike: 22_150, premium: 75, delta: 0.15 },
  { strike: 22_500, premium: 20, delta: 0.05 },
];

function chain(underlyingPrice: number, puts: typeof basePuts, calls: typeof baseCalls) {
  return {
    expiryDate: new Date('2024-01-25T00:00:00.000Z'),
    underlyingPrice,
    puts,
    calls,
  };
}

describe('runIronCondorBacktest scenarios', () => {
  const config = {
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    initialCapital: 100_000,
    lotSize: 50,
  };

  it('profit target scenario: condor closes with positive realized pnl', () => {
    const strategy = new IronCondorStrategy();

    const result = runIronCondorBacktest(strategy, config, [
      {
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        close: 22_000,
        optionChain: chain(22_000, basePuts, baseCalls),
      },
      {
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        close: 21_950,
        optionChain: chain(
          21_950,
          [
            { strike: 21_500, premium: 10, delta: 0.05 },
            { strike: 21_850, premium: 20, delta: 0.15 },
          ],
          [
            { strike: 22_150, premium: 25, delta: 0.15 },
            { strike: 22_500, premium: 10, delta: 0.05 },
          ],
        ),
      },
    ]);

    expect(result.trades).toHaveLength(2);
    expect(result.trades[0]?.side).toBe('BUY');
    expect(result.trades[1]?.side).toBe('SELL');
    expect(result.trades[1]?.realizedPnl).toBeGreaterThan(0);
    expect(result.metrics.finalCapital).toBeGreaterThan(100_000);
  });

  it('stop loss scenario: condor closes with negative realized pnl', () => {
    const strategy = new IronCondorStrategy();

    const result = runIronCondorBacktest(strategy, config, [
      {
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        close: 22_000,
        optionChain: chain(22_000, basePuts, baseCalls),
      },
      {
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        close: 21_700,
        optionChain: chain(
          21_700,
          [
            { strike: 21_500, premium: 50, delta: 0.05 },
            { strike: 21_850, premium: 200, delta: 0.15 },
          ],
          [
            { strike: 22_150, premium: 100, delta: 0.15 },
            { strike: 22_500, premium: 30, delta: 0.05 },
          ],
        ),
      },
    ]);

    expect(result.trades).toHaveLength(2);
    expect(result.trades[1]?.realizedPnl).toBeLessThan(0);
    expect(result.metrics.finalCapital).toBeLessThan(100_000);
  });

  it('hold scenario: condor stays open until a later exit signal', () => {
    const strategy = new IronCondorStrategy();

    const result = runIronCondorBacktest(strategy, config, [
      {
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        close: 22_000,
        optionChain: chain(22_000, basePuts, baseCalls),
      },
      {
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        close: 21_980,
        optionChain: chain(
          21_980,
          [
            { strike: 21_500, premium: 22, delta: 0.05 },
            { strike: 21_850, premium: 65, delta: 0.15 },
          ],
          [
            { strike: 22_150, premium: 60, delta: 0.15 },
            { strike: 22_500, premium: 18, delta: 0.05 },
          ],
        ),
      },
      {
        timestamp: new Date('2024-01-17T09:15:00.000Z'),
        close: 21_960,
        optionChain: chain(
          21_960,
          [
            { strike: 21_500, premium: 10, delta: 0.05 },
            { strike: 21_850, premium: 18, delta: 0.15 },
          ],
          [
            { strike: 22_150, premium: 20, delta: 0.15 },
            { strike: 22_500, premium: 8, delta: 0.05 },
          ],
        ),
      },
    ]);

    expect(result.trades).toHaveLength(2);
    expect(result.trades[1]?.timestamp.toISOString()).toBe('2024-01-17T09:15:00.000Z');
    expect(result.equityCurve).toHaveLength(3);
  });

  it('no entry scenario: invalid chain produces no trades', () => {
    const strategy = new IronCondorStrategy();

    const result = runIronCondorBacktest(strategy, config, [
      {
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        close: 22_000,
        optionChain: chain(22_000, basePuts, []),
      },
    ]);

    expect(result.trades).toHaveLength(0);
    expect(result.metrics.finalCapital).toBe(100_000);
  });
});
