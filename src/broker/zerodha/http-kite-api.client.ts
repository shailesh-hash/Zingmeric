import { OrderRejectedError } from '../errors/broker.errors.js';
import type { KiteApiClient } from './kite-api.client.interface.js';
import type {
  KiteApiClientConfig,
  KiteApiResponse,
  KiteCancelOrderRequest,
  KiteOrderResponse,
  KitePlaceOrderRequest,
  KitePositionsResponse,
  KiteRawOrderResponse,
} from './types/zerodha.types.js';

const DEFAULT_BASE_URL = 'https://api.kite.trade';

export class HttpKiteApiClient implements KiteApiClient {
  constructor(private readonly config: KiteApiClientConfig) {}

  async placeOrder(request: KitePlaceOrderRequest): Promise<KiteOrderResponse> {
    const variety = request.variety;
    const { variety: _variety, ...body } = request;

    const data = await this.request<KiteRawOrderResponse>(`/orders/${variety}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { orderId: data.order_id };
  }

  async cancelOrder(request: KiteCancelOrderRequest): Promise<KiteOrderResponse> {
    const data = await this.request<KiteRawOrderResponse>(
      `/orders/${request.variety}/${request.orderId}`,
      {
        method: 'DELETE',
      },
    );

    return { orderId: data.order_id };
  }

  async getPositions(): Promise<KitePositionsResponse> {
    return this.request<KitePositionsResponse>('/portfolio/positions', {
      method: 'GET',
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL;
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'X-Kite-Version': '3',
        Authorization: `token ${this.config.apiKey}:${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = (await response.json()) as KiteApiResponse<T>;

    if (!response.ok || payload.status === 'error') {
      const message =
        payload.status === 'error'
          ? payload.message
          : `Kite API request failed: ${response.status}`;
      throw new OrderRejectedError(message);
    }

    return payload.data;
  }
}

export function createHttpKiteApiClient(config: KiteApiClientConfig): HttpKiteApiClient {
  return new HttpKiteApiClient(config);
}
