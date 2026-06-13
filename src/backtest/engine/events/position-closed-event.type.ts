import { BacktestEventType } from './backtest-event-type.enum.js';
import { nextEventId, type BaseBacktestEvent } from './base-event.type.js';

export interface PositionClosedEvent extends BaseBacktestEvent {
  readonly type: BacktestEventType.POSITION_CLOSED;
  readonly positionId: string;
  readonly strategyName: string;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly exitValue: number;
  readonly realizedPnl: number;
}

export interface CreatePositionClosedEventParams {
  timestamp: Date;
  positionId: string;
  strategyName: string;
  instrumentId: string;
  symbol: string;
  quantity: number;
  exitValue: number;
  realizedPnl: number;
  eventId?: string;
}

export function createPositionClosedEvent(
  params: CreatePositionClosedEventParams,
): PositionClosedEvent {
  return {
    eventId: params.eventId ?? nextEventId('position-closed'),
    type: BacktestEventType.POSITION_CLOSED,
    timestamp: params.timestamp,
    positionId: params.positionId,
    strategyName: params.strategyName,
    instrumentId: params.instrumentId,
    symbol: params.symbol,
    quantity: params.quantity,
    exitValue: params.exitValue,
    realizedPnl: params.realizedPnl,
  };
}
