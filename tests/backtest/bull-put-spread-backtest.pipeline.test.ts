import { createMarketEvent } from '../../src/backtest/index.js';
import { createBullPutSpreadBacktestPipeline } from '../../src/backtest/pipeline/bull-put-spread-backtest.pipeline.js';
import { PositionStatus } from '../../src/portfolio/types/portfolio.types.js';
import { BullPutSpreadStrategy } from '../../src/strategies/spreads/bull-put-spread.strategy.js';

const baseOptionChain = {
  expiryDate: new Date('2024-01-25T00:00:00.000Z'),
  underlyingPrice: 22_000,
  puts: [
    { strike: 21_500, premium: 25, delta: 0.05 },
    { strike: 21_850, premium: 80, delta: 0.15 },
  ],
  calls: [] as { strike: number; premium: number; delta: number }[],
};

describe('BullPutSpreadBacktestPipeline', () => {
  it('runs the first complete bull put spread v1 backtest', () => {
    const strategy = new BullPutSpreadStrategy();
    const pipeline = createBullPutSpreadBacktestPipeline();

    const report = pipeline.run(
      {
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        initialCapital: 100_000,
        lotSize: 50,
        includeCosts: false,
      },
      [
        createMarketEvent({
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          price: 22_000,
          optionChain: baseOptionChain,
        }),
        createMarketEvent({
          timestamp: new Date('2024-01-16T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          price: 21_950,
          optionChain: {
            ...baseOptionChain,
            underlyingPrice: 21_950,
            puts: [
              { strike: 21_500, premium: 20, delta: 0.05 },
              { strike: 21_850, premium: 25, delta: 0.15 },
            ],
          },
        }),
      ],
      strategy,
    );

    expect(report.strategyName).toBe('bull-put-spread');
    expect(report.trades).toHaveLength(2);
    expect(report.trades[0]?.side).toBe('BUY');
    expect(report.trades[1]?.side).toBe('SELL');
    expect(report.trades[1]?.realizedPnl).toBeGreaterThan(0);
    expect(report.positions).toHaveLength(1);
    expect(report.positions[0]?.status).toBe(PositionStatus.CLOSED);
    expect(report.equityCurve).toHaveLength(2);
    expect(report.equityCurve[1]?.equity).toBeGreaterThan(100_000);
    expect(report.metrics.cagr).toBeDefined();
    expect(report.metrics.sharpeRatio).toBeDefined();
    expect(report.metrics.profitFactor).toBeGreaterThan(0);
    expect(report.metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(report.metrics.finalCapital).toBeGreaterThan(100_000);
  });

  it('includes trading costs when enabled', () => {
    const strategy = new BullPutSpreadStrategy();
    const pipeline = createBullPutSpreadBacktestPipeline();

    const report = pipeline.run(
      {
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        initialCapital: 100_000,
        lotSize: 50,
        includeCosts: true,
      },
      [
        createMarketEvent({
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          price: 22_000,
          optionChain: baseOptionChain,
        }),
        createMarketEvent({
          timestamp: new Date('2024-01-16T09:15:00.000Z'),
          instrumentId: 'inst-nifty',
          symbol: 'NIFTY',
          price: 21_950,
          optionChain: {
            ...baseOptionChain,
            puts: [
              { strike: 21_500, premium: 20, delta: 0.05 },
              { strike: 21_850, premium: 25, delta: 0.15 },
            ],
          },
        }),
      ],
      strategy,
    );

    expect(report.trades[0]?.totalFees).toBeGreaterThan(0);
    expect(report.trades[1]?.totalFees).toBeGreaterThan(0);
  });
});
