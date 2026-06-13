import { calculateTradeStatistics } from '../../src/analytics/service/trade-statistics.calculator.js';

describe('calculateTradeStatistics', () => {
  it('derives win/loss statistics from closed positions', () => {
    const stats = calculateTradeStatistics(
      [
        {
          id: 'trade-1',
          side: 'BUY',
          quantity: 50,
          price: 55,
          strategyName: 'bull-put-spread-v1',
          legGroupId: 'spread-1',
          brokerage: 10,
          stt: 0,
          exchangeCharges: 0,
          slippage: 0,
          totalFees: 10,
          executedAt: new Date('2024-01-15T09:15:00.000Z'),
        },
        {
          id: 'trade-2',
          side: 'SELL',
          quantity: 50,
          price: 25,
          strategyName: 'bull-put-spread-v1',
          legGroupId: 'spread-1',
          brokerage: 10,
          stt: 0,
          exchangeCharges: 0,
          slippage: 0,
          totalFees: 10,
          executedAt: new Date('2024-01-18T09:15:00.000Z'),
        },
      ],
      [
        {
          id: 'position-1',
          status: 'CLOSED',
          quantity: 50,
          averagePrice: 55,
          realizedPnl: 1_500,
          unrealizedPnl: 0,
          strategyName: 'bull-put-spread-v1',
          legGroupId: 'spread-1',
          openedAt: new Date('2024-01-15T09:15:00.000Z'),
          closedAt: new Date('2024-01-18T09:15:00.000Z'),
        },
      ],
    );

    expect(stats.totalTrades).toBe(1);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(0);
    expect(stats.winRate).toBe(1);
    expect(stats.netRealizedPnl).toBe(1_500);
    expect(stats.totalFees).toBe(20);
    expect(stats.averageTradeFees).toBe(10);
    expect(stats.profitFactor).toBeNull();
  });
});
