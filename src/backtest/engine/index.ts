export type {
  CandleBacktestRunRequest,
  CandleBacktestEngineDependencies,
} from './candle-backtest.engine.js';
export { CandleBacktestEngine, createCandleBacktestEngine } from './candle-backtest.engine.js';
export {
  UnifiedBacktestEngine,
  createUnifiedBacktestEngine,
  createDefaultBacktestEngineDependencies,
  BACKTEST_RISK_CONFIG,
} from './unified-backtest.engine.js';
export type {
  BacktestEngineConfig,
  BacktestEngineInput,
  BacktestEngineLegacyInput,
  BacktestEngineResult,
  BacktestEngineDependencies,
} from './backtest-engine.types.js';
export {
  BacktestSessionHandler,
  createBacktestSessionHandler,
} from './backtest-session.handler.js';

export { BacktestEventType } from './events/backtest-event-type.enum.js';
export { resetBacktestEventCounter } from './events/base-event.type.js';
export {
  createMarketEvent as createEngineMarketEvent,
  type MarketEvent as EngineMarketEvent,
} from './events/market-event.type.js';
export {
  createOptionChainEvent as createEngineOptionChainEvent,
  type OptionChainEvent as EngineOptionChainEvent,
} from './events/option-chain-event.type.js';
export {
  createSignalEvent as createEngineSignalEvent,
  type SignalEvent as EngineSignalEvent,
} from './events/signal-event.type.js';
export {
  createOrderFilledEvent as createEngineOrderFilledEvent,
  type OrderFilledEvent as EngineOrderFilledEvent,
  type OrderSide as EngineOrderSide,
} from './events/order-filled-event.type.js';
export {
  createPositionOpenedEvent as createEnginePositionOpenedEvent,
  type PositionOpenedEvent as EnginePositionOpenedEvent,
} from './events/position-opened-event.type.js';
export {
  createPositionClosedEvent as createEnginePositionClosedEvent,
  type PositionClosedEvent as EnginePositionClosedEvent,
} from './events/position-closed-event.type.js';
export type { BacktestEvent, HistoricalBacktestEvent } from './events/backtest-event.type.js';

export type { BacktestEventHandler, EventBus, EventSubscription } from './event-bus.interface.js';
export { InMemoryEventBus, createInMemoryEventBus } from './in-memory-event-bus.js';
export {
  HistoricalDataLoaderService,
  createHistoricalDataLoaderService,
} from './historical-data-loader.service.js';
export { ReplayEngine, createReplayEngine } from './replay-engine.js';
export type { ReplayOptions } from './replay-engine.js';
export type {
  HistoricalOptionChainDTO,
  ReplayInputDTO,
  ReplayResultDTO,
  BacktestEventSubscriber,
  HistoricalDataSource,
} from './replay-engine.types.js';
export { toLegacyMarketEvents, fromLegacyMarketEvents } from './legacy-market-event.adapter.js';
