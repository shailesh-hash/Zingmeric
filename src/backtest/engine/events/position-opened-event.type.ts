import { BacktestEventType } from './backtest-event-type.enum.js';
import { nextEventId, type BaseBacktestEvent } from './base-event.type.js';

export interface PositionOpenedEvent extends BaseBacktestEvent {
  readonly type: BacktestEventType.POSITION_OPENED;
  readonly positionId: string;
  readonly strategyName: string;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly entryValue: number;
}

export interface CreatePositionOpenedEventParams {
  timestamp: Date;
  positionId: string;
  strategyName: string;
  instrumentId: string;
  symbol: string;
  quantity: number;
  entryValue: number;
  eventId?: string;
}

export function createPositionOpenedEvent(
  params: CreatePositionOpenedEventParams,
): PositionOpenedEvent {
  return {
    eventId: params.eventId ?? nextEventId('position-opened'),
    type: BacktestEventType.POSITION_OPENED,
    timestamp: params.timestamp,
    positionId: params.positionId,
    strategyName: params.strategyName,
    instrumentId: params.instrumentId,
    symbol: params.symbol,
    quantity: params.quantity,
    entryValue: params.entryValue,
  };
}
