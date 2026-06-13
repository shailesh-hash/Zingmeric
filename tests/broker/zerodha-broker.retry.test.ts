import {
  BrokerRetryExhaustedError,
  BrokerUnavailableError,
  createMapZerodhaInstrumentResolver,
  createZerodhaBroker,
  OrderSide,
  OrderType,
  type KiteApiClient,
  type KiteCancelOrderRequest,
  type KiteOrderResponse,
  type KitePlaceOrderRequest,
  type KitePositionsResponse,
} from '../../src/broker/index.js';

class FlakyKiteApiClient implements KiteApiClient {
  placeOrderCalls = 0;

  constructor(private readonly failUntilAttempt: number) {}

  placeOrder(_request: KitePlaceOrderRequest): Promise<KiteOrderResponse> {
    this.placeOrderCalls += 1;

    if (this.placeOrderCalls < this.failUntilAttempt) {
      return Promise.reject(new BrokerUnavailableError('zerodha', 'placeOrder'));
    }

    return Promise.resolve({ orderId: '200000099' });
  }

  cancelOrder(_request: KiteCancelOrderRequest): Promise<KiteOrderResponse> {
    return Promise.resolve({ orderId: '200000099' });
  }

  getPositions(): Promise<KitePositionsResponse> {
    return Promise.resolve({ net: [] });
  }
}

function createSleepSpy() {
  let calls = 0;
  const sleep = (_ms: number): Promise<void> => {
    calls += 1;
    return Promise.resolve();
  };

  return {
    sleep,
    getCalls: () => calls,
  };
}

describe('ZerodhaBroker retry integration', () => {
  const instrumentResolver = createMapZerodhaInstrumentResolver({
    'inst-nifty-fut': {
      instrumentId: 'inst-nifty-fut',
      exchange: 'NFO',
      tradingsymbol: 'NIFTY24JUNFUT',
      product: 'NRML',
    },
  });

  it('retries transient broker failures before succeeding', async () => {
    const { sleep, getCalls } = createSleepSpy();
    const client = new FlakyKiteApiClient(3);
    const broker = createZerodhaBroker({
      client,
      instrumentResolver,
      retryPolicy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1 },
      sleep,
    });

    const result = await broker.placeOrder({
      instrumentId: 'inst-nifty-fut',
      strategyName: 'equity',
      side: OrderSide.BUY,
      quantity: 1,
      price: 0,
      orderType: OrderType.MARKET,
    });

    expect(result.order.id).toBe('200000099');
    expect(client.placeOrderCalls).toBe(3);
    expect(getCalls()).toBe(2);
  });

  it('throws BrokerRetryExhaustedError when transient failures persist', async () => {
    const { sleep } = createSleepSpy();
    const client = new FlakyKiteApiClient(Number.POSITIVE_INFINITY);
    const broker = createZerodhaBroker({
      client,
      instrumentResolver,
      retryPolicy: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
      sleep,
    });

    await expect(
      broker.placeOrder({
        instrumentId: 'inst-nifty-fut',
        strategyName: 'equity',
        side: OrderSide.BUY,
        quantity: 1,
        price: 0,
        orderType: OrderType.MARKET,
      }),
    ).rejects.toBeInstanceOf(BrokerRetryExhaustedError);
  });
});
