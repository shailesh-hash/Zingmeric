import { OrderSide, OrderStatus, OrderType } from '../types/broker.types.js';
import type {
  BrokerFill,
  BrokerOrder,
  BrokerPositionView,
  PlaceOrderRequest,
} from '../types/broker.types.js';
import type { UpstoxPlaceOrderRequest, UpstoxPosition } from './types/upstox.types.js';
import type { UpstoxInstrumentReference } from './types/upstox.types.js';

export function toUpstoxTransactionType(side: OrderSide): 'BUY' | 'SELL' {
  return side === OrderSide.BUY ? 'BUY' : 'SELL';
}

export function toUpstoxOrderType(orderType: OrderType): 'MARKET' | 'LIMIT' {
  return orderType === OrderType.LIMIT ? 'LIMIT' : 'MARKET';
}

export function buildUpstoxPlaceOrderRequest(params: {
  request: PlaceOrderRequest;
  instrument: UpstoxInstrumentReference;
  defaultProduct: 'D' | 'I';
  tagPrefix?: string;
}): UpstoxPlaceOrderRequest {
  const orderType = params.request.orderType ?? OrderType.MARKET;
  const upstoxRequest: UpstoxPlaceOrderRequest = {
    quantity: params.request.quantity,
    product: params.instrument.product ?? params.defaultProduct,
    validity: 'DAY',
    price: orderType === OrderType.LIMIT ? params.request.price : 0,
    instrument_token: params.instrument.instrumentToken,
    order_type: toUpstoxOrderType(orderType),
    transaction_type: toUpstoxTransactionType(params.request.side),
  };

  if (params.tagPrefix) {
    upstoxRequest.tag = `${params.tagPrefix}:${params.request.strategyName}`;
  }

  return upstoxRequest;
}

export function toBrokerOrder(params: {
  upstoxOrderId: string;
  request: PlaceOrderRequest;
  orderType: OrderType;
  status?: OrderStatus;
}): BrokerOrder {
  return {
    id: params.upstoxOrderId,
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
  position: UpstoxPosition;
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

export function positionKey(instrumentToken: string, product: string): string {
  return `${instrumentToken}:${product}`;
}
