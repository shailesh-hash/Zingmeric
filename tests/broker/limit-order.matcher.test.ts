import { OrderSide } from '../../src/broker/types/broker.types.js';
import {
  findFillableLimitOrders,
  resolveLimitFillPrice,
  shouldFillLimitOrder,
} from '../../src/broker/paper/limit-order.matcher.js';

describe('limit-order matcher', () => {
  it('fills buy limits at or below market price', () => {
    expect(shouldFillLimitOrder(OrderSide.BUY, 100, 99)).toBe(true);
    expect(shouldFillLimitOrder(OrderSide.BUY, 100, 100)).toBe(true);
    expect(shouldFillLimitOrder(OrderSide.BUY, 100, 101)).toBe(false);
  });

  it('fills sell limits at or above market price', () => {
    expect(shouldFillLimitOrder(OrderSide.SELL, 110, 111)).toBe(true);
    expect(shouldFillLimitOrder(OrderSide.SELL, 110, 110)).toBe(true);
    expect(shouldFillLimitOrder(OrderSide.SELL, 110, 109)).toBe(false);
  });

  it('uses the limit price as the simulated fill price', () => {
    expect(resolveLimitFillPrice(105)).toBe(105);
  });

  it('finds pending limit orders eligible for a market quote', () => {
    const pending = [
      {
        instrumentId: 'inst-nifty',
        strategyName: 'equity',
        side: OrderSide.BUY,
        quantity: 10,
        price: 100,
        orderType: 'LIMIT' as const,
      },
      {
        instrumentId: 'inst-nifty',
        strategyName: 'equity',
        side: OrderSide.BUY,
        quantity: 10,
        price: 90,
        orderType: 'LIMIT' as const,
      },
      {
        instrumentId: 'inst-reliance',
        strategyName: 'equity',
        side: OrderSide.SELL,
        quantity: 5,
        price: 2_500,
        orderType: 'LIMIT' as const,
      },
    ];

    const fillable = findFillableLimitOrders(pending, {
      instrumentId: 'inst-nifty',
      price: 95,
    });

    expect(fillable).toHaveLength(1);
    expect(fillable[0]?.price).toBe(100);
  });
});
