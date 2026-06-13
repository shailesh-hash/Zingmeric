import type { OptionChainSnapshot } from '../../../strategies/types/market-snapshot.type.js';
import { BacktestEventType } from './backtest-event-type.enum.js';
import { nextEventId, type BaseBacktestEvent } from './base-event.type.js';

export interface OptionChainEvent extends BaseBacktestEvent {
  readonly type: BacktestEventType.OPTION_CHAIN;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly chain: OptionChainSnapshot;
}

export interface CreateOptionChainEventParams {
  timestamp: Date;
  instrumentId: string;
  symbol: string;
  chain: OptionChainSnapshot;
  eventId?: string;
}

export function createOptionChainEvent(params: CreateOptionChainEventParams): OptionChainEvent {
  return {
    eventId: params.eventId ?? nextEventId('option-chain'),
    type: BacktestEventType.OPTION_CHAIN,
    timestamp: params.timestamp,
    instrumentId: params.instrumentId,
    symbol: params.symbol,
    chain: params.chain,
  };
}
