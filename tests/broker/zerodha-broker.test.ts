import {
  createMapZerodhaInstrumentResolver,
  createZerodhaBroker,
  InvalidOrderRequestError,
  OrderNotFoundError,
  OrderRejectedError,
  OrderSide,
  OrderStatus,
  OrderType,
  type KiteApiClient,
  type KiteCancelOrderRequest,
  type KiteOrderResponse,
  type KitePlaceOrderRequest,
  type KitePositionsResponse,
} from '../../src/broker/index.js';

class MockKiteApiClient implements KiteApiClient {
  placeOrderCalls: KitePlaceOrderRequest[] = [];
  cancelOrderCalls: KiteCancelOrderRequest[] = [];
  getPositionsCalls = 0;

  placeOrderResponse: KiteOrderResponse = { orderId: '200000001' };
  positionsResponse: KitePositionsResponse = { net: [] };
  placeOrderError: Error | null = null;

  placeOrder(request: KitePlaceOrderRequest): Promise<KiteOrderResponse> {
    this.placeOrderCalls.push(request);

    if (this.placeOrderError) {
      return Promise.reject(this.placeOrderError);
    }

    return Promise.resolve(this.placeOrderResponse);
  }

  cancelOrder(request: KiteCancelOrderRequest): Promise<KiteOrderResponse> {
    this.cancelOrderCalls.push(request);
    return Promise.resolve({ orderId: request.orderId });
  }

  getPositions(): Promise<KitePositionsResponse> {
    this.getPositionsCalls += 1;
    return Promise.resolve(this.positionsResponse);
  }
}

describe('ZerodhaBroker', () => {
  const instrumentResolver = createMapZerodhaInstrumentResolver({
    'inst-nifty-fut': {
      instrumentId: 'inst-nifty-fut',
      exchange: 'NFO',
      tradingsymbol: 'NIFTY24JUNFUT',
      product: 'NRML',
    },
  });

  it('places orders through the kite client without strategy engine coupling', async () => {
    const kiteClient = new MockKiteApiClient();
    const broker = createZerodhaBroker({ client: kiteClient, instrumentResolver });

    const result = await broker.placeOrder({
      instrumentId: 'inst-nifty-fut',
      strategyName: 'bull-put-spread',
      side: OrderSide.BUY,
      quantity: 50,
      price: 0,
      orderType: OrderType.MARKET,
      timestamp: new Date('2024-06-14T09:15:00.000Z'),
    });

    expect(result.order.id).toBe('200000001');
    expect(result.order.status).toBe(OrderStatus.PENDING);
    expect(result.fill).toBeNull();
    expect(kiteClient.placeOrderCalls[0]).toEqual(
      expect.objectContaining({
        exchange: 'NFO',
        tradingsymbol: 'NIFTY24JUNFUT',
        transaction_type: 'BUY',
        quantity: 50,
        order_type: 'MARKET',
        product: 'NRML',
      }),
    );
    expect(broker.getOrders()).toHaveLength(1);
  });

  it('cancels orders through the kite client', async () => {
    const kiteClient = new MockKiteApiClient();
    const broker = createZerodhaBroker({ client: kiteClient, instrumentResolver });

    const placed = await broker.placeOrder({
      instrumentId: 'inst-nifty-fut',
      strategyName: 'bull-put-spread',
      side: OrderSide.SELL,
      quantity: 25,
      price: 100,
      orderType: OrderType.LIMIT,
    });

    const cancelled = await broker.cancelOrder(placed.order.id);

    expect(cancelled.cancelled).toBe(true);
    expect(cancelled.order?.status).toBe(OrderStatus.CANCELLED);
    expect(kiteClient.cancelOrderCalls[0]?.orderId).toBe(placed.order.id);
    expect(kiteClient.cancelOrderCalls[0]?.variety).toBe('regular');
  });

  it('maps kite positions to broker position views with tracked strategy metadata', async () => {
    const kiteClient = new MockKiteApiClient();
    const broker = createZerodhaBroker({ client: kiteClient, instrumentResolver });

    await broker.placeOrder({
      instrumentId: 'inst-nifty-fut',
      strategyName: 'iron-condor',
      side: OrderSide.BUY,
      quantity: 50,
      price: 0,
      orderType: OrderType.MARKET,
    });

    kiteClient.positionsResponse = {
      net: [
        {
          tradingsymbol: 'NIFTY24JUNFUT',
          exchange: 'NFO',
          product: 'NRML',
          quantity: 50,
          average_price: 22_000,
          last_price: 22_100,
          pnl: 5_000,
          unrealised: 5_000,
          realised: 0,
        },
      ],
    };

    const positions = await broker.getPositions();

    expect(kiteClient.getPositionsCalls).toBe(1);
    expect(positions).toHaveLength(1);
    expect(positions[0]).toEqual(
      expect.objectContaining({
        instrumentId: 'inst-nifty-fut',
        strategyName: 'iron-condor',
        quantity: 50,
        averagePrice: 22_000,
        markPrice: 22_100,
        unrealizedPnl: 5_000,
      }),
    );
  });

  it('rejects defined-risk orders and unknown instruments', async () => {
    const kiteClient = new MockKiteApiClient();
    const broker = createZerodhaBroker({ client: kiteClient, instrumentResolver });

    await expect(
      broker.placeOrder({
        instrumentId: 'inst-nifty-fut',
        strategyName: 'bull-put-spread',
        side: OrderSide.BUY,
        quantity: 50,
        price: 55,
        definedRisk: { entryCredit: 55, maxLoss: 295 },
      }),
    ).rejects.toThrow(InvalidOrderRequestError);

    await expect(
      broker.placeOrder({
        instrumentId: 'unknown',
        strategyName: 'equity',
        side: OrderSide.BUY,
        quantity: 1,
        price: 100,
      }),
    ).rejects.toThrow(InvalidOrderRequestError);

    expect(kiteClient.placeOrderCalls).toHaveLength(0);
  });

  it('surfaces kite api failures as order rejected errors', async () => {
    const kiteClient = new MockKiteApiClient();
    kiteClient.placeOrderError = new OrderRejectedError('Insufficient funds');
    const broker = createZerodhaBroker({ client: kiteClient, instrumentResolver });

    await expect(
      broker.placeOrder({
        instrumentId: 'inst-nifty-fut',
        strategyName: 'equity',
        side: OrderSide.BUY,
        quantity: 1,
        price: 0,
        orderType: OrderType.MARKET,
      }),
    ).rejects.toThrow(OrderRejectedError);
  });

  it('throws when cancelling unknown orders', async () => {
    const broker = createZerodhaBroker({ client: new MockKiteApiClient(), instrumentResolver });

    await expect(broker.cancelOrder('missing')).rejects.toThrow(OrderNotFoundError);
  });
});
