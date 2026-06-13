import {
  createMapUpstoxInstrumentResolver,
  createUpstoxBroker,
  InstrumentNotFoundError,
  InvalidOrderRequestError,
  OrderNotFoundError,
  OrderRejectedError,
  OrderSide,
  OrderStatus,
  OrderType,
  type UpstoxApiClient,
  type UpstoxCancelOrderRequest,
  type UpstoxOrderResponse,
  type UpstoxPlaceOrderRequest,
  type UpstoxPositionsResponse,
} from '../../src/broker/index.js';

class MockUpstoxApiClient implements UpstoxApiClient {
  placeOrderCalls: UpstoxPlaceOrderRequest[] = [];
  cancelOrderCalls: UpstoxCancelOrderRequest[] = [];
  getPositionsCalls = 0;

  placeOrderResponse: UpstoxOrderResponse = { orderId: '300000001' };
  positionsResponse: UpstoxPositionsResponse = { data: [] };
  placeOrderError: Error | null = null;

  placeOrder(request: UpstoxPlaceOrderRequest): Promise<UpstoxOrderResponse> {
    this.placeOrderCalls.push(request);

    if (this.placeOrderError) {
      return Promise.reject(this.placeOrderError);
    }

    return Promise.resolve(this.placeOrderResponse);
  }

  cancelOrder(request: UpstoxCancelOrderRequest): Promise<UpstoxOrderResponse> {
    this.cancelOrderCalls.push(request);
    return Promise.resolve({ orderId: request.orderId });
  }

  getPositions(): Promise<UpstoxPositionsResponse> {
    this.getPositionsCalls += 1;
    return Promise.resolve(this.positionsResponse);
  }
}

describe('UpstoxBroker', () => {
  const instrumentResolver = createMapUpstoxInstrumentResolver({
    'inst-nifty-fut': {
      instrumentId: 'inst-nifty-fut',
      instrumentToken: '256265',
      exchange: 'NSE_FO',
      tradingsymbol: 'NIFTY24JUNFUT',
      product: 'I',
    },
  });

  it('places orders through the upstox client without strategy engine coupling', async () => {
    const client = new MockUpstoxApiClient();
    const broker = createUpstoxBroker({ client, instrumentResolver });

    const result = await broker.placeOrder({
      instrumentId: 'inst-nifty-fut',
      strategyName: 'bull-put-spread',
      side: OrderSide.BUY,
      quantity: 50,
      price: 0,
      orderType: OrderType.MARKET,
      timestamp: new Date('2024-06-14T09:15:00.000Z'),
    });

    expect(result.order.id).toBe('300000001');
    expect(result.order.status).toBe(OrderStatus.PENDING);
    expect(result.fill).toBeNull();
    expect(client.placeOrderCalls[0]).toEqual(
      expect.objectContaining({
        instrument_token: '256265',
        transaction_type: 'BUY',
        quantity: 50,
        order_type: 'MARKET',
        product: 'I',
      }),
    );
    expect(broker.getOrders()).toHaveLength(1);
  });

  it('cancels orders through the upstox client', async () => {
    const client = new MockUpstoxApiClient();
    const broker = createUpstoxBroker({ client, instrumentResolver });

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
    expect(client.cancelOrderCalls[0]?.orderId).toBe(placed.order.id);
  });

  it('maps upstox positions to broker position views with tracked strategy metadata', async () => {
    const client = new MockUpstoxApiClient();
    const broker = createUpstoxBroker({ client, instrumentResolver });

    await broker.placeOrder({
      instrumentId: 'inst-nifty-fut',
      strategyName: 'iron-condor',
      side: OrderSide.BUY,
      quantity: 50,
      price: 0,
      orderType: OrderType.MARKET,
    });

    client.positionsResponse = {
      data: [
        {
          instrument_token: '256265',
          exchange: 'NSE_FO',
          tradingsymbol: 'NIFTY24JUNFUT',
          product: 'I',
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

    expect(client.getPositionsCalls).toBe(1);
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
    const client = new MockUpstoxApiClient();
    const broker = createUpstoxBroker({ client, instrumentResolver });

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
    ).rejects.toThrow(InstrumentNotFoundError);

    expect(client.placeOrderCalls).toHaveLength(0);
  });

  it('surfaces upstox api failures as order rejected errors', async () => {
    const client = new MockUpstoxApiClient();
    client.placeOrderError = new OrderRejectedError('Insufficient funds');
    const broker = createUpstoxBroker({ client, instrumentResolver });

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
    const broker = createUpstoxBroker({ client: new MockUpstoxApiClient(), instrumentResolver });

    await expect(broker.cancelOrder('missing')).rejects.toThrow(OrderNotFoundError);
  });
});
