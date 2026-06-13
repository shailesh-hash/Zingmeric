import { OrderSide, OrderStatus, OrderType } from '../types/broker.types.js';
import type {
  BrokerFill,
  BrokerOrder,
  BrokerPositionView,
  PlaceOrderRequest,
} from '../types/broker.types.js';
import type { KiteNetPosition, KitePlaceOrderRequest } from './types/zerodha.types.js';
import type { ZerodhaInstrumentReference } from './types/zerodha.types.js';

export function toKiteTransactionType(side: OrderSide): 'BUY' | 'SELL' {
  return side === OrderSide.BUY ? 'BUY' : 'SELL';
}

export function toKiteOrderType(orderType: OrderType): 'MARKET' | 'LIMIT' {
  return orderType === OrderType.LIMIT ? 'LIMIT' : 'MARKET';
}

export function buildKitePlaceOrderRequest(params: {
  request: PlaceOrderRequest;
  instrument: ZerodhaInstrumentReference;
  variety: string;
  defaultProduct: 'CNC' | 'MIS' | 'NRML';
}): KitePlaceOrderRequest {
  const orderType = params.request.orderType ?? OrderType.MARKET;
  const kiteRequest: KitePlaceOrderRequest = {
    variety: params.variety,
    exchange: params.instrument.exchange,
    tradingsymbol: params.instrument.tradingsymbol,
    transaction_type: toKiteTransactionType(params.request.side),
    quantity: params.request.quantity,
    order_type: toKiteOrderType(orderType),
    product: params.instrument.product ?? params.defaultProduct,
    validity: 'DAY',
  };

  if (orderType === OrderType.LIMIT) {
    kiteRequest.price = params.request.price;
  }

  return kiteRequest;
}

export function toBrokerOrder(params: {
  kiteOrderId: string;
  request: PlaceOrderRequest;
  orderType: OrderType;
  status?: OrderStatus;
}): BrokerOrder {
  return {
    id: params.kiteOrderId,
    instrumentId: params.request.instrumentId,
    strategyName: params.request.strategyName,
    side: params.request.side,
    orderType: params.orderType,
    quantity: params.request.quantity,
    price: params.request.price,
    status: params.status ?? OrderStatus.PENDING,
    createdAt: params.request.timestamp ?? new Date(),
    legGroupId: params.request.legGroupId,
  };
}

export function toBrokerPositionView(params: {
  position: KiteNetPosition;
  instrumentId: string;
  strategyName: string;
}): BrokerPositionView {
  const openedAt = new Date();

  return {
    id: `${params.strategyName}:${params.instrumentId}`,
    strategyName: params.strategyName,
    instrumentId: params.instrumentId,
    kind: 'EQUITY',
    quantity: Math.abs(params.position.quantity),
    averagePrice: params.position.average_price,
    markPrice: params.position.last_price,
    unrealizedPnl: params.position.unrealised,
    openedAt,
  };
}

export function createPendingFill(order: BrokerOrder): BrokerFill | null {
  if (order.status !== OrderStatus.FILLED) {
    return null;
  }

  return {
    orderId: order.id,
    timestamp: order.filledAt ?? order.createdAt,
    instrumentId: order.instrumentId,
    strategyName: order.strategyName,
    side: order.side,
    quantity: order.quantity,
    price: order.price,
    brokerage: 0,
    stt: 0,
    exchangeCharges: 0,
    slippage: 0,
    totalFees: 0,
    realizedPnl: 0,
  };
}

export function positionKey(exchange: string, tradingsymbol: string, product: string): string {
  return `${exchange}:${tradingsymbol}:${product}`;
}
