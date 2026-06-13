import { BacktestEventType } from './backtest-event-type.enum.js';
import { nextEventId, type BaseBacktestEvent } from './base-event.type.js';

export interface MarketEvent extends BaseBacktestEvent {
  readonly type: BacktestEventType.MARKET;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export interface CreateMarketEventParams {
  timestamp: Date;
  instrumentId: string;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  eventId?: string;
}

export function createMarketEvent(params: CreateMarketEventParams): MarketEvent {
  return {
    eventId: params.eventId ?? nextEventId('market'),
    type: BacktestEventType.MARKET,
    timestamp: params.timestamp,
    instrumentId: params.instrumentId,
    symbol: params.symbol,
    open: params.open,
    high: params.high,
    low: params.low,
    close: params.close,
    volume: params.volume,
  };
}
