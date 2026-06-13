import { BacktestEventType } from './backtest-event-type.enum.js';
import { nextEventId, type BaseBacktestEvent } from './base-event.type.js';

export type OrderSide = 'BUY' | 'SELL';

export interface OrderFilledEvent extends BaseBacktestEvent {
  readonly type: BacktestEventType.ORDER_FILLED;
  readonly orderId: string;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly strategyName: string;
  readonly side: OrderSide;
  readonly quantity: number;
  readonly fillPrice: number;
}

export interface CreateOrderFilledEventParams {
  timestamp: Date;
  orderId: string;
  instrumentId: string;
  symbol: string;
  strategyName: string;
  side: OrderSide;
  quantity: number;
  fillPrice: number;
  eventId?: string;
}

export function createOrderFilledEvent(params: CreateOrderFilledEventParams): OrderFilledEvent {
  return {
    eventId: params.eventId ?? nextEventId('order-filled'),
    type: BacktestEventType.ORDER_FILLED,
    timestamp: params.timestamp,
    orderId: params.orderId,
    instrumentId: params.instrumentId,
    symbol: params.symbol,
    strategyName: params.strategyName,
    side: params.side,
    quantity: params.quantity,
    fillPrice: params.fillPrice,
  };
}
