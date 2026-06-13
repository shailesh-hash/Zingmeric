import type {
  UpstoxCancelOrderRequest,
  UpstoxOrderResponse,
  UpstoxPlaceOrderRequest,
  UpstoxPositionsResponse,
} from './types/upstox.types.js';

export interface UpstoxApiClient {
  placeOrder(request: UpstoxPlaceOrderRequest): Promise<UpstoxOrderResponse>;
  cancelOrder(request: UpstoxCancelOrderRequest): Promise<UpstoxOrderResponse>;
  getPositions(): Promise<UpstoxPositionsResponse>;
}
