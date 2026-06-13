import { BacktestNotFoundError } from '../../src/analytics/errors/backtest-analytics.errors.js';
import {
  BACKTEST_RUN_ID,
  createSeededBacktestAnalyticsService,
} from './backtest-analytics.fixtures.js';

describe('BacktestAnalyticsService', () => {
  it('lists backtests with performance summaries', async () => {
    const { service } = createSeededBacktestAnalyticsService();

    const result = await service.listBacktests();

    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe(BACKTEST_RUN_ID);
    expect(result.items[0]?.strategyName).toBe('bull-put-spread-v1');
    expect(result.items[0]?.status).toBe('COMPLETED');
    expect(result.items[0]?.performanceMetrics?.sortinoRatio).toEqual(expect.any(Number));
    expect(result.items[0]?.performanceMetrics?.sharpeRatio).toEqual(expect.any(Number));
  });

  it('returns backtest detail with performance metrics and trade statistics', async () => {
    const { service } = createSeededBacktestAnalyticsService();

    const detail = await service.getBacktestById(BACKTEST_RUN_ID);

    expect(detail.portfolioId).toBe('portfolio-1');
    expect(detail.performanceMetrics.finalCapital).toBe(103_500);
    expect(detail.performanceMetrics.sortinoRatio).toBeDefined();
    expect(detail.tradeStatistics.totalTrades).toBe(1);
    expect(detail.tradeStatistics.netRealizedPnl).toBe(1_500);
  });

  it('returns equity curve and drawdown series', async () => {
    const { service } = createSeededBacktestAnalyticsService();

    const curve = await service.getEquityCurve(BACKTEST_RUN_ID);

    expect(curve.backtestRunId).toBe(BACKTEST_RUN_ID);
    expect(curve.points).toHaveLength(4);
    expect(curve.drawdownSeries).toHaveLength(4);
    expect(curve.points[0]?.equity).toBe(102_750);
  });

  it('returns portfolio analytics bundle', async () => {
    const { service } = createSeededBacktestAnalyticsService();

    const portfolio = await service.getPortfolioAnalytics(BACKTEST_RUN_ID);

    expect(portfolio.portfolio.id).toBe('portfolio-1');
    expect(portfolio.equityCurve).toHaveLength(4);
    expect(portfolio.closedPositions).toHaveLength(1);
    expect(portfolio.openPositions).toHaveLength(0);
    expect(portfolio.performanceMetrics.cagr).toBeDefined();
    expect(portfolio.tradeStatistics.grossProfit).toBe(1_500);
  });

  it('throws when backtest run is missing', async () => {
    const { service } = createSeededBacktestAnalyticsService();

    await expect(service.getBacktestById('missing-id')).rejects.toBeInstanceOf(
      BacktestNotFoundError,
    );
  });
});
