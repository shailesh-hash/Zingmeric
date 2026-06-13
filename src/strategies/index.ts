export type { Strategy } from './strategy.interface.js';
export {
  StrategyNotFoundError,
  InvalidStrategyEngineError,
  InvalidSignalError,
} from './errors/strategy.errors.js';
export {
  StrategyEngine,
  createStrategyEngine,
  type StrategyEngineDependencies,
} from './engine/strategy-engine.js';
export type {
  MarketSnapshot,
  OptionChainSnapshot,
  OptionPutQuote,
} from './types/market-snapshot.type.js';
export { createMarketSnapshot } from './types/market-snapshot.type.js';
export { SignalAction, createSignal, isSignalAction, type Signal } from './types/signal.type.js';
export {
  BullPutSpreadStrategy,
  runBullPutSpreadBacktest,
  DEFAULT_BULL_PUT_SPREAD_CONFIG,
  findPutByTargetDelta,
  calculateSpreadCredit,
  calculateSpreadCloseCost,
  type BullPutSpreadConfig,
  type BullPutSpreadBacktestCandle,
  type BullPutSpreadBacktestResult,
} from './spreads/index.js';
