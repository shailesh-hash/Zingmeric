import { createBacktestReportGenerator } from '../../src/backtest/index.js';
import { PositionStatus } from '../../src/portfolio/types/portfolio.types.js';

describe('BacktestReportGenerator', () => {
  it('generates a report with required metrics', () => {
    const startDate = new Date('2024-01-15T09:15:00.000Z');
    const endDate = new Date('2024-01-16T09:15:00.000Z');
    const generator = createBacktestReportGenerator();

    const report = generator.generate({
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      strategyName: 'bull-put-spread',
      startDate,
      endDate,
      initialCapital: 100_000,
      riskFreeRate: 0.06,
      trades: [
        {
          timestamp: startDate,
          side: 'BUY',
          quantity: 50,
          price: 55,
          brokerage: 0,
          stt: 0,
          exchangeCharges: 0,
          slippage: 0,
          totalFees: 0,
          realizedPnl: 0,
        },
        {
          timestamp: endDate,
          side: 'SELL',
          quantity: 50,
          price: 25,
          brokerage: 0,
          stt: 0,
          exchangeCharges: 0,
          slippage: 0,
          totalFees: 0,
          realizedPnl: 1_500,
        },
      ],
      positions: [
        {
          id: 'spread-1',
          strategyName: 'bull-put-spread',
          instrumentId: 'inst-nifty',
          status: PositionStatus.CLOSED,
          kind: 'DEFINED_RISK',
          quantity: 50,
          openedAt: startDate,
          closedAt: endDate,
        },
      ],
      equityCurve: [
        { timestamp: startDate, equity: 102_750, cash: 102_750, positionValue: 0 },
        { timestamp: endDate, equity: 103_500, cash: 103_500, positionValue: 0 },
      ],
    });

    expect(report.metadata.schemaVersion).toBe('1.0.0');
    expect(report.metrics.cagr).toBeGreaterThan(0);
    expect(report.metrics.profitFactor).toBe(Number.POSITIVE_INFINITY);
    expect(report.metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(report.metrics.sharpeRatio).toBeDefined();
    expect(report.metrics.sortinoRatio).toBeDefined();
    expect(report.trades).toHaveLength(2);
    expect(report.positions).toHaveLength(1);
    expect(report.equityCurve).toHaveLength(2);
  });
});
