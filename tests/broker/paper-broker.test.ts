import {
  createPaperBroker,
  InvalidOrderRequestError,
  OrderNotFoundError,
  OrderSide,
  OrderStatus,
  OrderType,
} from '../../src/broker/index.js';

describe('PaperBroker', () => {
  it('implements Broker interface with market order fills', async () => {
    const broker = createPaperBroker({ initialCapital: 10_000, includeCosts: false });
    const timestamp = new Date('2024-01-15T09:15:00.000Z');

    const buy = await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'equity',
      side: OrderSide.BUY,
      quantity: 10,
      price: 100,
      timestamp,
    });

    expect(buy.order.status).toBe(OrderStatus.FILLED);
    expect(buy.fill?.side).toBe(OrderSide.BUY);
    expect(buy.fill?.quantity).toBe(10);

    const positions = await broker.getPositions();
    expect(positions).toHaveLength(1);
    expect(positions[0]?.quantity).toBe(10);
  });

  it('tracks realized pnl on equity sells', async () => {
    const broker = createPaperBroker({ initialCapital: 10_000, includeCosts: false });
    const timestamp = new Date('2024-01-15T09:15:00.000Z');

    await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'equity',
      side: OrderSide.BUY,
      quantity: 10,
      price: 100,
      timestamp,
    });

    await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'equity',
      side: OrderSide.SELL,
      quantity: 10,
      price: 110,
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
    });

    const pnl = broker.getPnlSummary();
    expect(pnl.realizedPnl).toBe(100);
    expect(pnl.unrealizedPnl).toBe(0);
    expect(pnl.totalPnl).toBe(100);
    expect(await broker.getPositions()).toHaveLength(0);
  });

  it('applies trading costs to simulated fills when enabled', async () => {
    const broker = createPaperBroker({ initialCapital: 10_000, includeCosts: true });

    const result = await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'equity',
      side: OrderSide.BUY,
      quantity: 10,
      price: 100,
    });

    expect(result.fill?.totalFees).toBeGreaterThan(0);
    expect(broker.getPnlSummary().cash).toBeLessThan(10_000);
  });

  it('supports pending limit orders and cancellation', async () => {
    const broker = createPaperBroker({ initialCapital: 10_000, includeCosts: false });

    const result = await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'equity',
      side: OrderSide.BUY,
      quantity: 10,
      price: 100,
      orderType: OrderType.LIMIT,
    });

    expect(result.order.status).toBe(OrderStatus.PENDING);
    expect(result.fill).toBeNull();

    const cancelled = await broker.cancelOrder(result.order.id);
    expect(cancelled.cancelled).toBe(true);
    expect(cancelled.order?.status).toBe(OrderStatus.CANCELLED);

    const notCancelled = await broker.cancelOrder(result.order.id);
    expect(notCancelled.cancelled).toBe(false);
  });

  it('rejects invalid orders and missing cancel targets', async () => {
    const broker = createPaperBroker({ initialCapital: 10_000, includeCosts: false });

    await expect(
      broker.placeOrder({
        instrumentId: 'inst-nifty',
        strategyName: 'equity',
        side: OrderSide.BUY,
        quantity: 0,
        price: 100,
      }),
    ).rejects.toThrow(InvalidOrderRequestError);

    await expect(broker.cancelOrder('missing')).rejects.toThrow(OrderNotFoundError);
  });
});
