import type { AnalyticsEquityPoint, AnalyticsTrade } from '../../src/analytics/index.js';
import {
  calculateCagr,
  calculateDrawdownSeries,
  calculateMaxDrawdown,
  calculatePeriodReturns,
  calculateProfitFactor,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateWinRate,
  createAnalyticsMetricsCalculator,
} from '../../src/analytics/index.js';

describe('performance metrics', () => {
  it('calculates CAGR from initial and final capital', () => {
    const cagr = calculateCagr(
      100_000,
      121_000,
      new Date('2023-01-01T00:00:00.000Z'),
      new Date('2024-01-01T00:00:00.000Z'),
    );

    expect(cagr).toBeCloseTo(0.21, 2);
  });

  it('calculates max drawdown and drawdown series', () => {
    const equityCurve: AnalyticsEquityPoint[] = [
      { timestamp: new Date('2024-01-01T00:00:00.000Z'), equity: 100, cash: 100, positionValue: 0 },
      { timestamp: new Date('2024-01-02T00:00:00.000Z'), equity: 120, cash: 120, positionValue: 0 },
      { timestamp: new Date('2024-01-03T00:00:00.000Z'), equity: 90, cash: 90, positionValue: 0 },
    ];

    expect(calculateMaxDrawdown(equityCurve)).toBeCloseTo(0.25, 4);

    const series = calculateDrawdownSeries(equityCurve);
    expect(series[2]?.drawdown).toBeCloseTo(0.25, 4);
    expect(series[2]?.peakEquity).toBe(120);
  });

  it('calculates profit factor and win rate from sell trades', () => {
    const trades: AnalyticsTrade[] = [
      {
        timestamp: new Date('2024-01-02T00:00:00.000Z'),
        side: 'SELL',
        quantity: 1,
        price: 110,
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        realizedPnl: 100,
      },
      {
        timestamp: new Date('2024-01-03T00:00:00.000Z'),
        side: 'SELL',
        quantity: 1,
        price: 90,
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        realizedPnl: -50,
      },
    ];

    expect(calculateProfitFactor(trades)).toBe(2);
    expect(calculateWinRate(trades)).toBe(0.5);
  });

  it('calculates sharpe and sortino ratios from period returns', () => {
    const equityCurve: AnalyticsEquityPoint[] = [
      { timestamp: new Date('2024-01-01T00:00:00.000Z'), equity: 100, cash: 100, positionValue: 0 },
      { timestamp: new Date('2024-01-02T00:00:00.000Z'), equity: 102, cash: 102, positionValue: 0 },
      { timestamp: new Date('2024-01-03T00:00:00.000Z'), equity: 98, cash: 98, positionValue: 0 },
      { timestamp: new Date('2024-01-04T00:00:00.000Z'), equity: 103, cash: 103, positionValue: 0 },
    ];
    const returns = calculatePeriodReturns(equityCurve);

    const sharpe = calculateSharpeRatio(returns, 0.06, 252);
    const sortino = calculateSortinoRatio(returns, 0.06, 252);

    expect(sharpe).not.toBe(0);
    expect(sortino).not.toBe(0);
    expect(sortino).toBeGreaterThan(sharpe);
  });

  it('returns zero sortino ratio when there is no downside deviation', () => {
    const returns = [0.01, 0.015, 0.008];

    expect(calculateSortinoRatio(returns, 0.06, 252)).toBe(0);
  });
});

describe('DefaultAnalyticsMetricsCalculator', () => {
  const calculator = createAnalyticsMetricsCalculator();

  it('returns all requested analytics metrics', () => {
    const startDate = new Date('2023-01-01T00:00:00.000Z');
    const endDate = new Date('2024-01-01T00:00:00.000Z');

    const metrics = calculator.calculate({
      equityCurve: [
        { timestamp: startDate, equity: 100_000, cash: 100_000, positionValue: 0 },
        { timestamp: endDate, equity: 121_000, cash: 121_000, positionValue: 0 },
      ],
      trades: [],
      initialCapital: 100_000,
      startDate,
      endDate,
      riskFreeRate: 0.06,
    });

    expect(metrics.cagr).toBeCloseTo(0.21, 2);
    expect(metrics.winRate).toBe(0);
    expect(metrics.sharpeRatio).toBe(0);
    expect(metrics.sortinoRatio).toBe(0);
    expect(metrics.profitFactor).toBe(0);
    expect(metrics.maxDrawdown).toBe(0);
    expect(metrics.totalTrades).toBe(0);
    expect(metrics.finalCapital).toBe(121_000);
    expect(metrics.initialCapital).toBe(100_000);
  });
});
