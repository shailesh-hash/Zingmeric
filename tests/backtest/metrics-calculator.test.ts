import type { EquityPoint, SimulatedTrade } from '../../src/backtest/types/portfolio-state.type.js';
import { DefaultMetricsCalculator } from '../../src/backtest/metrics/metrics-calculator.js';

describe('DefaultMetricsCalculator', () => {
  const calculator = new DefaultMetricsCalculator();

  it('calculates CAGR from initial and final capital', () => {
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
    expect(metrics.finalCapital).toBe(121_000);
  });

  it('calculates max drawdown from equity curve', () => {
    const equityCurve: EquityPoint[] = [
      { timestamp: new Date('2024-01-01T00:00:00.000Z'), equity: 100, cash: 100, positionValue: 0 },
      { timestamp: new Date('2024-01-02T00:00:00.000Z'), equity: 120, cash: 120, positionValue: 0 },
      { timestamp: new Date('2024-01-03T00:00:00.000Z'), equity: 90, cash: 90, positionValue: 0 },
    ];

    const metrics = calculator.calculate({
      equityCurve,
      trades: [],
      initialCapital: 100,
      startDate: equityCurve[0]?.timestamp ?? new Date(),
      endDate: equityCurve.at(-1)?.timestamp ?? new Date(),
      riskFreeRate: 0.06,
    });

    expect(metrics.maxDrawdown).toBeCloseTo(0.25, 4);
  });

  it('calculates profit factor from realized sell trades', () => {
    const trades: SimulatedTrade[] = [
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

    const metrics = calculator.calculate({
      equityCurve: [
        {
          timestamp: new Date('2024-01-01T00:00:00.000Z'),
          equity: 100,
          cash: 100,
          positionValue: 0,
        },
        {
          timestamp: new Date('2024-01-03T00:00:00.000Z'),
          equity: 150,
          cash: 150,
          positionValue: 0,
        },
      ],
      trades,
      initialCapital: 100,
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-03T00:00:00.000Z'),
      riskFreeRate: 0.06,
    });

    expect(metrics.profitFactor).toBe(2);
    expect(metrics.winRate).toBe(0.5);
    expect(metrics.totalTrades).toBe(2);
  });

  it('returns zero sharpe ratio for flat equity curve', () => {
    const timestamp = new Date('2024-01-01T00:00:00.000Z');

    const metrics = calculator.calculate({
      equityCurve: [
        { timestamp, equity: 100, cash: 100, positionValue: 0 },
        {
          timestamp: new Date('2024-01-02T00:00:00.000Z'),
          equity: 100,
          cash: 100,
          positionValue: 0,
        },
      ],
      trades: [],
      initialCapital: 100,
      startDate: timestamp,
      endDate: new Date('2024-01-02T00:00:00.000Z'),
      riskFreeRate: 0.06,
    });

    expect(metrics.sharpeRatio).toBe(0);
  });
});
