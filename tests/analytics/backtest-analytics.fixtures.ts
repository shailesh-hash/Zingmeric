import {
  createBacktestAnalyticsService,
  createInMemoryBacktestAnalyticsRepository,
} from '../../src/analytics/index.js';
import type { InMemoryBacktestAnalyticsRepository } from '../../src/analytics/repository/in-memory-backtest-analytics.repository.js';

export const BACKTEST_RUN_ID = 'backtest-run-1';
export const PORTFOLIO_ID = 'portfolio-1';

export function seedBacktestAnalyticsRepository(
  repository: InMemoryBacktestAnalyticsRepository,
): void {
  const startDate = new Date('2024-01-15T09:15:00.000Z');
  const endDate = new Date('2024-01-18T09:15:00.000Z');

  repository.seedRun({
    id: BACKTEST_RUN_ID,
    name: 'Bull Put V1',
    strategyName: 'bull-put-spread-v1',
    status: 'COMPLETED',
    startDate,
    endDate,
    initialCapital: 100_000,
    includeCosts: false,
    cagr: 0.12,
    sharpeRatio: 1.5,
    maxDrawdown: 0.05,
    profitFactor: 2,
    winRate: 1,
    totalTrades: 1,
    finalCapital: 103_500,
    startedAt: startDate,
    completedAt: endDate,
    createdAt: startDate,
    portfolioId: PORTFOLIO_ID,
  });

  repository.seedPortfolio(BACKTEST_RUN_ID, {
    id: PORTFOLIO_ID,
    name: 'Backtest Portfolio',
    mode: 'BACKTEST',
    initialCapital: 100_000,
    cashBalance: 103_500,
    currency: 'INR',
  });

  repository.seedTrades(BACKTEST_RUN_ID, [
    {
      id: 'trade-1',
      side: 'BUY',
      quantity: 50,
      price: 55,
      strategyName: 'bull-put-spread-v1',
      legGroupId: 'spread-1',
      brokerage: 0,
      stt: 0,
      exchangeCharges: 0,
      slippage: 0,
      totalFees: 0,
      executedAt: startDate,
    },
    {
      id: 'trade-2',
      side: 'SELL',
      quantity: 50,
      price: 25,
      strategyName: 'bull-put-spread-v1',
      legGroupId: 'spread-1',
      brokerage: 0,
      stt: 0,
      exchangeCharges: 0,
      slippage: 0,
      totalFees: 0,
      executedAt: endDate,
    },
  ]);

  repository.seedPositions(BACKTEST_RUN_ID, [
    {
      id: 'position-1',
      status: 'CLOSED',
      quantity: 50,
      averagePrice: 55,
      realizedPnl: 1_500,
      unrealizedPnl: 0,
      strategyName: 'bull-put-spread-v1',
      legGroupId: 'spread-1',
      openedAt: startDate,
      closedAt: endDate,
    },
  ]);

  repository.seedEquitySnapshots(BACKTEST_RUN_ID, [
    {
      timestamp: startDate,
      cashBalance: 102_750,
      portfolioValue: 102_750,
      realizedPnl: 0,
      unrealizedPnl: 0,
      drawdown: 0,
    },
    {
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
      cashBalance: 103_000,
      portfolioValue: 103_000,
      realizedPnl: 0,
      unrealizedPnl: 250,
      drawdown: 0,
    },
    {
      timestamp: new Date('2024-01-17T09:15:00.000Z'),
      cashBalance: 102_500,
      portfolioValue: 102_500,
      realizedPnl: 0,
      unrealizedPnl: -250,
      drawdown: 0.0049,
    },
    {
      timestamp: endDate,
      cashBalance: 103_500,
      portfolioValue: 103_500,
      realizedPnl: 1_500,
      unrealizedPnl: 0,
      drawdown: 0,
    },
  ]);
}

export function createSeededBacktestAnalyticsService() {
  const repository = createInMemoryBacktestAnalyticsRepository();
  seedBacktestAnalyticsRepository(repository);
  return {
    repository,
    service: createBacktestAnalyticsService(repository),
  };
}
