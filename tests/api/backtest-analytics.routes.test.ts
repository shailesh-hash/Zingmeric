import { loadConfig } from '../../src/config/index.js';
import { buildServer } from '../../src/api/server.js';
import {
  createBacktestAnalyticsService,
  createInMemoryBacktestAnalyticsRepository,
} from '../../src/analytics/index.js';
import { createBacktestAnalyticsController } from '../../src/api/controllers/backtest-analytics.controller.js';
import {
  BACKTEST_RUN_ID,
  seedBacktestAnalyticsRepository,
} from '../analytics/backtest-analytics.fixtures.js';

function createTestBacktestAnalyticsDeps() {
  const repository = createInMemoryBacktestAnalyticsRepository();
  seedBacktestAnalyticsRepository(repository);
  const service = createBacktestAnalyticsService(repository);

  return {
    service,
    controller: createBacktestAnalyticsController(service),
  };
}

describe('backtest analytics API routes', () => {
  it('GET /analytics/backtests returns backtest summaries', async () => {
    const app = await buildServer(loadConfig(), {
      backtestAnalytics: createTestBacktestAnalyticsDeps(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/analytics/backtests',
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{ total: number; items: { id: string }[] }>();
    expect(body.total).toBe(1);
    expect(body.items[0]?.id).toBe(BACKTEST_RUN_ID);

    await app.close();
  });

  it('GET /analytics/backtests/:id returns detail with metrics and trade statistics', async () => {
    const app = await buildServer(loadConfig(), {
      backtestAnalytics: createTestBacktestAnalyticsDeps(),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/analytics/backtests/${BACKTEST_RUN_ID}`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      id: string;
      performanceMetrics: { sortinoRatio: number; sharpeRatio: number };
      tradeStatistics: { totalTrades: number; netRealizedPnl: number };
    }>();

    expect(body.id).toBe(BACKTEST_RUN_ID);
    expect(typeof body.performanceMetrics.sortinoRatio).toBe('number');
    expect(typeof body.performanceMetrics.sharpeRatio).toBe('number');
    expect(body.tradeStatistics.totalTrades).toBe(1);
    expect(body.tradeStatistics.netRealizedPnl).toBe(1_500);

    await app.close();
  });

  it('GET /analytics/equity-curve/:id returns equity curve points', async () => {
    const app = await buildServer(loadConfig(), {
      backtestAnalytics: createTestBacktestAnalyticsDeps(),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/analytics/equity-curve/${BACKTEST_RUN_ID}`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      backtestRunId: string;
      points: unknown[];
      drawdownSeries: unknown[];
    }>();

    expect(body.backtestRunId).toBe(BACKTEST_RUN_ID);
    expect(body.points).toHaveLength(4);
    expect(body.drawdownSeries).toHaveLength(4);

    await app.close();
  });

  it('GET /analytics/portfolio/:id returns portfolio analytics bundle', async () => {
    const app = await buildServer(loadConfig(), {
      backtestAnalytics: createTestBacktestAnalyticsDeps(),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/analytics/portfolio/${BACKTEST_RUN_ID}`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      backtestRunId: string;
      portfolio: { id: string };
      performanceMetrics: { finalCapital: number };
      tradeStatistics: { grossProfit: number };
      equityCurve: unknown[];
      closedPositions: unknown[];
    }>();

    expect(body.backtestRunId).toBe(BACKTEST_RUN_ID);
    expect(body.portfolio.id).toBe('portfolio-1');
    expect(body.performanceMetrics.finalCapital).toBe(103_500);
    expect(body.tradeStatistics.grossProfit).toBe(1_500);
    expect(body.equityCurve).toHaveLength(4);
    expect(body.closedPositions).toHaveLength(1);

    await app.close();
  });

  it('returns 404 when backtest run does not exist', async () => {
    const app = await buildServer(loadConfig(), {
      backtestAnalytics: createTestBacktestAnalyticsDeps(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/analytics/backtests/missing-id',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(
      expect.objectContaining({
        error: 'BacktestNotFoundError',
      }),
    );

    await app.close();
  });
});
