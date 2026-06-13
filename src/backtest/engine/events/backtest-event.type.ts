import type { MarketEvent } from './market-event.type.js';
import type { OptionChainEvent } from './option-chain-event.type.js';
import type { OrderFilledEvent } from './order-filled-event.type.js';
import type { PositionClosedEvent } from './position-closed-event.type.js';
import type { PositionOpenedEvent } from './position-opened-event.type.js';
import type { SignalEvent } from './signal-event.type.js';

export type BacktestEvent =
  | MarketEvent
  | OptionChainEvent
  | SignalEvent
  | OrderFilledEvent
  | PositionOpenedEvent
  | PositionClosedEvent;

export type HistoricalBacktestEvent = MarketEvent | OptionChainEvent;
