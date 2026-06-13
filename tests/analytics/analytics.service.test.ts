import { createAnalyticsService, InvalidAnalyticsRequestError } from '../../src/analytics/index.js';

describe('AnalyticsService', () => {
  const service = createAnalyticsService();
  const startDate = new Date('2023-01-01T00:00:00.000Z');
  const endDate = new Date('2024-01-01T00:00:00.000Z');

  const baseInput = {
    initialCapital: 100_000,
    startDate,
    endDate,
    riskFreeRate: 0.06,
    equityCurve: [
      { timestamp: startDate, equity: 100_000, cash: 100_000, positionValue: 0 },
      { timestamp: endDate, equity: 121_000, cash: 121_000, positionValue: 0 },
    ],
    trades: [
      {
        timestamp: new Date('2023-06-01T00:00:00.000Z'),
        side: 'SELL' as const,
        quantity: 50,
        price: 55,
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        realizedPnl: 1_500,
      },
    ],
  };

  it('calculates metrics from equity curve and trades', () => {
    const metrics = service.calculateMetrics(baseInput);

    expect(metrics.cagr).toBeCloseTo(0.21, 2);
    expect(metrics.winRate).toBe(1);
    expect(metrics.totalTrades).toBe(1);
    expect(metrics.profitFactor).toBe(Number.POSITIVE_INFINITY);
  });

  it('generates a report with drawdown series', () => {
    const report = service.generateReport({
      ...baseInput,
      equityCurve: [
        { timestamp: startDate, equity: 100_000, cash: 100_000, positionValue: 0 },
        {
          timestamp: new Date('2023-07-01T00:00:00.000Z'),
          equity: 110_000,
          cash: 110_000,
          positionValue: 0,
        },
        { timestamp: endDate, equity: 99_000, cash: 99_000, positionValue: 0 },
      ],
    });

    expect(report.metrics.maxDrawdown).toBeCloseTo(0.1, 4);
    expect(report.drawdownSeries).toHaveLength(3);
    expect(report.drawdownSeries.at(-1)?.drawdown).toBeCloseTo(0.1, 4);
  });

  it('rejects invalid analytics input', () => {
    expect(() =>
      service.calculateMetrics({
        ...baseInput,
        initialCapital: 0,
      }),
    ).toThrow(InvalidAnalyticsRequestError);

    expect(() =>
      service.calculateMetrics({
        ...baseInput,
        equityCurve: [],
      }),
    ).toThrow(InvalidAnalyticsRequestError);

    expect(() =>
      service.calculateMetrics({
        ...baseInput,
        endDate: new Date('2022-01-01T00:00:00.000Z'),
      }),
    ).toThrow(InvalidAnalyticsRequestError);
  });
});
