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
  BullPutSpreadStrategyV1,
  createBullPutSpreadStrategyV1,
  runBullPutSpreadBacktest,
  DEFAULT_BULL_PUT_SPREAD_CONFIG,
  DEFAULT_BULL_PUT_SPREAD_V1_CONFIG,
  findPutByTargetDelta,
  findPutInDeltaRange,
  calculateDefinedRiskQuantity,
  calculateSpreadCredit,
  calculateSpreadCloseCost,
  type BullPutSpreadConfig,
  type BullPutSpreadV1Config,
  type BullPutSpreadBacktestCandle,
  type BullPutSpreadBacktestResult,
} from './spreads/index.js';
export {
  IronCondorStrategy,
  DEFAULT_IRON_CONDOR_CONFIG,
  type IronCondorConfig,
} from './spreads/index.js';
export { CoveredCallStrategy, createCoveredCallStrategy } from './equity/covered-call.strategy.js';
export {
  DEFAULT_COVERED_CALL_CONFIG,
  type CoveredCallConfig,
  type CoveredCallPosition,
} from './equity/covered-call.types.js';
export type {
  SignalExecution,
  OpenDefinedRiskExecution,
  CloseDefinedRiskExecution,
  OpenEquityExecution,
  CloseEquityExecution,
  CompositeExecution,
} from './types/signal-execution.type.js';
