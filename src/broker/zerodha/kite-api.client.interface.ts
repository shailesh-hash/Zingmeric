import type {
  KiteCancelOrderRequest,
  KiteOrderResponse,
  KitePlaceOrderRequest,
  KitePositionsResponse,
} from './types/zerodha.types.js';

export interface KiteApiClient {
  placeOrder(request: KitePlaceOrderRequest): Promise<KiteOrderResponse>;
  cancelOrder(request: KiteCancelOrderRequest): Promise<KiteOrderResponse>;
  getPositions(): Promise<KitePositionsResponse>;
}
