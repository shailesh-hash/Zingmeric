import type {
  BrokerFill,
  BrokerOrder,
  BrokerPnlSummary,
  BrokerPositionView,
  CancelOrderResult,
  PlaceOrderRequest,
  PlaceOrderResult,
} from '../types/broker.types.js';

export interface Broker {
  placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult>;
  cancelOrder(orderId: string): Promise<CancelOrderResult>;
  getPositions(): Promise<BrokerPositionView[]>;
  getPnlSummary(): BrokerPnlSummary;
  getFills(): BrokerFill[];
  getOrders(): BrokerOrder[];
}
