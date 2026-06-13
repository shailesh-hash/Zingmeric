import {
  createLiveBroker,
  createMapUpstoxInstrumentResolver,
  createMapZerodhaInstrumentResolver,
  createPaperBroker,
  OrderSide,
  OrderType,
  type Broker,
  type KiteApiClient,
  type KiteCancelOrderRequest,
  type KiteOrderResponse,
  type KitePlaceOrderRequest,
  type KitePositionsResponse,
  type UpstoxApiClient,
  type UpstoxCancelOrderRequest,
  type UpstoxOrderResponse,
  type UpstoxPlaceOrderRequest,
  type UpstoxPositionsResponse,
} from '../../../src/broker/index.js';

class MockKiteApiClient implements KiteApiClient {
  placeOrder(_request: KitePlaceOrderRequest): Promise<KiteOrderResponse> {
    return Promise.resolve({ orderId: 'kite-1' });
  }

  cancelOrder(_request: KiteCancelOrderRequest): Promise<KiteOrderResponse> {
    return Promise.resolve({ orderId: 'kite-1' });
  }

  getPositions(): Promise<KitePositionsResponse> {
    return Promise.resolve({ net: [] });
  }
}

class MockUpstoxApiClient implements UpstoxApiClient {
  placeOrder(_request: UpstoxPlaceOrderRequest): Promise<UpstoxOrderResponse> {
    return Promise.resolve({ orderId: 'upstox-1' });
  }

  cancelOrder(_request: UpstoxCancelOrderRequest): Promise<UpstoxOrderResponse> {
    return Promise.resolve({ orderId: 'upstox-1' });
  }

  getPositions(): Promise<UpstoxPositionsResponse> {
    return Promise.resolve({ data: [] });
  }
}

describe('createLiveBroker', () => {
  const zerodhaResolver = createMapZerodhaInstrumentResolver({
    'inst-nifty-fut': {
      instrumentId: 'inst-nifty-fut',
      exchange: 'NFO',
      tradingsymbol: 'NIFTY24JUNFUT',
      product: 'NRML',
    },
  });

  const upstoxResolver = createMapUpstoxInstrumentResolver({
    'inst-nifty-fut': {
      instrumentId: 'inst-nifty-fut',
      instrumentToken: '256265',
      exchange: 'NSE_FO',
      tradingsymbol: 'NIFTY24JUNFUT',
      product: 'I',
    },
  });

  it('returns paper broker without exposing implementation to callers', async () => {
    const broker: Broker = createLiveBroker({
      provider: 'paper',
      paper: { initialCapital: 100_000, includeCosts: false },
    });

    const result = await broker.placeOrder({
      instrumentId: 'inst-nifty-fut',
      strategyName: 'equity',
      side: OrderSide.BUY,
      quantity: 1,
      price: 100,
      orderType: OrderType.MARKET,
    });

    expect(result.order.id).toBeDefined();
    expect(broker.getOrders()).toHaveLength(1);
  });

  it('returns zerodha broker through the shared Broker interface', async () => {
    const broker: Broker = createLiveBroker({
      provider: 'zerodha',
      zerodha: {
        client: new MockKiteApiClient(),
        instrumentResolver: zerodhaResolver,
      },
    });

    const result = await broker.placeOrder({
      instrumentId: 'inst-nifty-fut',
      strategyName: 'bull-put-spread',
      side: OrderSide.BUY,
      quantity: 50,
      price: 0,
      orderType: OrderType.MARKET,
    });

    expect(result.order.id).toBe('kite-1');
  });

  it('returns upstox broker through the shared Broker interface', async () => {
    const broker: Broker = createLiveBroker({
      provider: 'upstox',
      upstox: {
        client: new MockUpstoxApiClient(),
        instrumentResolver: upstoxResolver,
      },
    });

    const result = await broker.placeOrder({
      instrumentId: 'inst-nifty-fut',
      strategyName: 'iron-condor',
      side: OrderSide.SELL,
      quantity: 25,
      price: 100,
      orderType: OrderType.LIMIT,
    });

    expect(result.order.id).toBe('upstox-1');
  });

  it('does not require strategy code to import broker implementations', () => {
    const paper: Broker = createPaperBroker({ initialCapital: 50_000, includeCosts: false });
    expect(typeof paper.placeOrder).toBe('function');
    expect(typeof paper.cancelOrder).toBe('function');
    expect(typeof paper.getPositions).toBe('function');
  });
});
