export {
  ForwardTestingEngine,
  createForwardTestingEngine,
} from './engine/forward-testing.engine.js';
export type { ForwardTestingEngineDependencies } from './engine/forward-testing.engine.js';
export {
  ForwardSignalExecutionService,
  createForwardSignalExecutionService,
} from './execution/forward-signal-execution.service.js';
export type { ForwardSignalExecutionConfig } from './execution/forward-signal-execution.service.js';
export { InMemoryMarketFeed, createInMemoryMarketFeed } from './feed/in-memory-market-feed.js';
export {
  ForwardTestMetricsCollector,
  createForwardTestMetricsCollector,
  summarizeExecutions,
} from './metrics/forward-test-metrics.collector.js';
export type { MarketFeed, MarketFeedSnapshotRequest } from './types/market-feed.interface.js';
export type {
  ForwardExecutionRecord,
  ForwardTestDailyResult,
  ForwardTestEngineConfig,
  ForwardTestMetricsSnapshot,
  ForwardTestSessionState,
} from './types/forward-test.types.js';
export { ForwardTestError, MarketFeedUnavailableError } from './errors/forward-test.errors.js';
