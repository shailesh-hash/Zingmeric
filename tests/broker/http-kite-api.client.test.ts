import { createHttpKiteApiClient, OrderRejectedError } from '../../src/broker/index.js';

type FetchResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
};

describe('HttpKiteApiClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('places orders against the kite REST API', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    global.fetch = ((url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: { order_id: '300000001' },
          }),
      } satisfies FetchResponse);
    }) as typeof fetch;

    const client = createHttpKiteApiClient({
      apiKey: 'api-key',
      accessToken: 'access-token',
      baseUrl: 'https://api.kite.trade',
    });

    const response = await client.placeOrder({
      variety: 'regular',
      exchange: 'NFO',
      tradingsymbol: 'NIFTY24JUNFUT',
      transaction_type: 'BUY',
      quantity: 50,
      order_type: 'MARKET',
      product: 'NRML',
    });

    expect(response.orderId).toBe('300000001');
    expect(calls[0]?.url).toBe('https://api.kite.trade/orders/regular');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'token api-key:access-token',
        'X-Kite-Version': '3',
      }),
    );
  });

  it('cancels orders and fetches positions', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    global.fetch = ((url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const path = String(url);

      if (path.endsWith('/portfolio/positions')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'success',
              data: {
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
              },
            }),
        } satisfies FetchResponse);
      }

      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: { order_id: '300000001' },
          }),
      } satisfies FetchResponse);
    }) as typeof fetch;

    const client = createHttpKiteApiClient({
      apiKey: 'api-key',
      accessToken: 'access-token',
      baseUrl: 'https://api.kite.trade',
    });

    await client.cancelOrder({ variety: 'regular', orderId: '300000001' });
    const positions = await client.getPositions();

    expect(calls[0]?.url).toBe('https://api.kite.trade/orders/regular/300000001');
    expect(calls[0]?.init?.method).toBe('DELETE');
    expect(calls[1]?.url).toBe('https://api.kite.trade/portfolio/positions');
    expect(calls[1]?.init?.method).toBe('GET');
    expect(positions.net).toHaveLength(1);
  });

  it('throws OrderRejectedError when kite returns an error payload', async () => {
    global.fetch = (() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'error',
            message: 'Insufficient funds',
            error_type: 'InputException',
          }),
      } satisfies FetchResponse)) as typeof fetch;

    const client = createHttpKiteApiClient({
      apiKey: 'api-key',
      accessToken: 'access-token',
    });

    await expect(
      client.placeOrder({
        variety: 'regular',
        exchange: 'NFO',
        tradingsymbol: 'NIFTY24JUNFUT',
        transaction_type: 'BUY',
        quantity: 50,
        order_type: 'MARKET',
        product: 'NRML',
      }),
    ).rejects.toThrow(OrderRejectedError);
  });
});
