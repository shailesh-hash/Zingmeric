import type { Signal } from '../../../strategies/types/signal.type.js';
import { BacktestEventType } from './backtest-event-type.enum.js';
import { nextEventId, type BaseBacktestEvent } from './base-event.type.js';

export interface SignalEvent extends BaseBacktestEvent {
  readonly type: BacktestEventType.SIGNAL;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly signal: Signal;
}

export interface CreateSignalEventParams {
  timestamp: Date;
  instrumentId: string;
  symbol: string;
  signal: Signal;
  eventId?: string;
}

export function createSignalEvent(params: CreateSignalEventParams): SignalEvent {
  return {
    eventId: params.eventId ?? nextEventId('signal'),
    type: BacktestEventType.SIGNAL,
    timestamp: params.timestamp,
    instrumentId: params.instrumentId,
    symbol: params.symbol,
    signal: params.signal,
  };
}
