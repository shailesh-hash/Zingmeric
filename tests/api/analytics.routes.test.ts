import { loadConfig } from '../../src/config/index.js';
import { buildServer } from '../../src/api/server.js';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://algotrader:algotrader@localhost:5432/algotrader';

const samplePayload = {
  initialCapital: 100_000,
  startDate: '2023-01-01T00:00:00.000Z',
  endDate: '2024-01-01T00:00:00.000Z',
  riskFreeRate: 0.06,
  equityCurve: [
    {
      timestamp: '2023-01-01T00:00:00.000Z',
      equity: 100_000,
      cash: 100_000,
      positionValue: 0,
    },
    {
      timestamp: '2024-01-01T00:00:00.000Z',
      equity: 121_000,
      cash: 121_000,
      positionValue: 0,
    },
  ],
  trades: [
    {
      timestamp: '2023-06-01T00:00:00.000Z',
      side: 'SELL',
      quantity: 50,
      price: 55,
      brokerage: 0,
      stt: 0,
      exchangeCharges: 0,
      slippage: 0,
      totalFees: 0,
      realizedPnl: 1500,
    },
  ],
};

describe('analytics API routes', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = databaseUrl;
  });

  it('POST /analytics/metrics returns performance metrics', async () => {
    const app = await buildServer(loadConfig());
    const response = await app.inject({
      method: 'POST',
      url: '/analytics/metrics',
      payload: samplePayload,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      cagr: number;
      winRate: number;
      sharpeRatio: number;
      sortinoRatio: number;
      profitFactor: number | null;
      maxDrawdown: number;
      totalTrades: number;
      finalCapital: number;
      initialCapital: number;
    }>();

    expect(body.cagr).toBeCloseTo(0.21, 2);
    expect(body.winRate).toBe(1);
    expect(body.totalTrades).toBe(1);
    expect(body.finalCapital).toBe(121_000);
    expect(body.initialCapital).toBe(100_000);
    expect(typeof body.sharpeRatio).toBe('number');
    expect(typeof body.sortinoRatio).toBe('number');
    expect(typeof body.maxDrawdown).toBe('number');

    await app.close();
  });

  it('POST /analytics/report returns metrics and drawdown series', async () => {
    const app = await buildServer(loadConfig());
    const response = await app.inject({
      method: 'POST',
      url: '/analytics/report',
      payload: {
        ...samplePayload,
        equityCurve: [
          {
            timestamp: '2023-01-01T00:00:00.000Z',
            equity: 100_000,
            cash: 100_000,
            positionValue: 0,
          },
          {
            timestamp: '2023-07-01T00:00:00.000Z',
            equity: 110_000,
            cash: 110_000,
            positionValue: 0,
          },
          {
            timestamp: '2024-01-01T00:00:00.000Z',
            equity: 99_000,
            cash: 99_000,
            positionValue: 0,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      metrics: { maxDrawdown: number };
      drawdownSeries: { drawdown: number; peakEquity: number }[];
    }>();

    expect(body.metrics.maxDrawdown).toBeCloseTo(0.1, 4);
    expect(body.drawdownSeries).toHaveLength(3);
    expect(body.drawdownSeries.at(-1)?.drawdown).toBeCloseTo(0.1, 4);

    await app.close();
  });

  it('returns 400 for invalid analytics payload', async () => {
    const app = await buildServer(loadConfig());
    const response = await app.inject({
      method: 'POST',
      url: '/analytics/metrics',
      payload: { initialCapital: 100_000 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        error: 'InvalidAnalyticsRequestError',
      }),
    );

    await app.close();
  });
});
