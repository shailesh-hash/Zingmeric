import { StrategyEngine } from '../../src/strategies/engine/strategy-engine.js';
import {
  CandleBacktestEngine,
  createCandleBacktestEngine,
} from './engine/candle-backtest.engine.js';
import { DefaultMetricsCalculator } from './metrics/metrics-calculator.js';
import { PortfolioTracker } from './portfolio/portfolio-tracker.js';
import { createPortfolioState } from './types/portfolio-state.type.js';
import { CandleReplayer } from './replay/candle-replayer.js';
import { DefaultOrderSimulator } from './simulation/order-simulator.js';

export type {
  CandleBacktestRunRequest,
  CandleBacktestEngineDependencies,
} from './engine/candle-backtest.engine.js';
export {
  CandleBacktestEngine,
  createCandleBacktestEngine,
} from './engine/candle-backtest.engine.js';
export type { BacktestPositionRecord } from './types/backtest-position.type.js';
export {
  BacktestExecutionService,
  createBacktestExecutionService,
} from './execution/backtest-execution.service.js';
export { MetricsEngine, createMetricsEngine } from './metrics/metrics-engine.js';
export {
  UnifiedBacktestEngine,
  createUnifiedBacktestEngine,
  createDefaultBacktestEngineDependencies,
} from './engine/unified-backtest.engine.js';
export type {
  BacktestEngineConfig,
  BacktestEngineInput,
  BacktestEngineLegacyInput,
  BacktestEngineResult,
  BacktestEngineDependencies,
  BACKTEST_RISK_CONFIG,
} from './engine/backtest-engine.types.js';
export { BacktestMetricsPublisher, createBacktestMetricsPublisher } from './observability/index.js';
export type {
  BacktestMetricsContext,
  BacktestMetricsPublisherDeps,
  ReplayObservabilityContext,
} from './observability/index.js';
export { InvalidBacktestRequestError } from './errors/backtest.errors.js';
export type { MetricsCalculator, MetricsCalculatorInput } from './metrics/metrics-calculator.js';
export { DefaultMetricsCalculator } from './metrics/metrics-calculator.js';
export { PortfolioTracker } from './portfolio/portfolio-tracker.js';
export { CandleReplayer } from './replay/candle-replayer.js';
export { EventReplayEngine, createEventReplayEngine } from './replay/event-replay-engine.js';
export {
  BacktestEventType,
  ReplayEngine,
  createReplayEngine,
  InMemoryEventBus,
  createInMemoryEventBus,
  HistoricalDataLoaderService,
  createHistoricalDataLoaderService,
  createEngineMarketEvent,
  createEngineOptionChainEvent,
  createEngineSignalEvent,
  createEngineOrderFilledEvent,
  createEnginePositionOpenedEvent,
  createEnginePositionClosedEvent,
  toLegacyMarketEvents,
  fromLegacyMarketEvents,
  resetBacktestEventCounter,
} from './engine/index.js';
export type {
  BacktestEvent,
  HistoricalBacktestEvent,
  EngineMarketEvent,
  EngineOptionChainEvent,
  EngineSignalEvent,
  EngineOrderFilledEvent,
  EnginePositionOpenedEvent,
  EnginePositionClosedEvent,
  EngineOrderSide,
  EventBus,
  EventSubscription,
  BacktestEventHandler,
  ReplayInputDTO,
  ReplayResultDTO,
  HistoricalOptionChainDTO,
  BacktestEventSubscriber,
  HistoricalDataSource,
} from './engine/index.js';
export {
  BacktestSignalEngine,
  createBacktestSignalEngine,
} from './signal/backtest-signal-engine.js';
export type { OrderSimulator } from './simulation/order-simulator.js';
export { DefaultOrderSimulator } from './simulation/order-simulator.js';
export {
  PortfolioSimulator,
  createPortfolioSimulator,
  resetPortfolioSimulatorCounter,
  type PortfolioSimulatorConfig,
} from './simulation/portfolio-simulator.js';
export { calculateOrderCosts, type OrderCostBreakdown } from './simulation/trading-costs.js';
export {
  BacktestReportGenerator,
  createBacktestReportGenerator,
} from './report/backtest-report-generator.js';
export {
  BacktestReportService,
  createBacktestReportService,
} from './report/backtest-report.service.js';
export type {
  BacktestReportGenerateInput,
  BacktestReportExportOptions,
  BacktestReportCsvBundle,
} from './report/backtest-report.dto.js';
export type { BacktestReportInput } from './report/backtest-report-generator.js';
export { calculateBacktestPerformanceMetrics } from './report/backtest-performance-metrics.js';
export {
  serializeBacktestReportJson,
  serializeBacktestReportCsv,
  serializeBacktestReportCsvBundle,
} from './report/backtest-report.export.js';
export {
  EquityCurveGenerator,
  createEquityCurveGenerator,
  type EquitySnapshot,
} from './report/equity-curve-generator.js';
export {
  BullPutSpreadBacktestPipeline,
  createBullPutSpreadBacktestPipeline,
  runBullPutSpreadBacktestV1,
  type BullPutSpreadBacktestConfig,
} from './pipeline/bull-put-spread-backtest.pipeline.js';
export type { BacktestCandle } from './types/backtest-candle.type.js';
export { sortCandlesByTime } from './types/backtest-candle.type.js';
export type { BacktestConfig, TradingCostConfig } from './types/backtest-config.type.js';
export { createBacktestConfig, DEFAULT_TRADING_COSTS } from './types/backtest-config.type.js';
export type { BacktestMetrics, BacktestRunResult } from './types/backtest-result.type.js';
export type { BacktestReport, BacktestReportMetadata } from './types/backtest-report.type.js';
export {
  BACKTEST_REPORT_SCHEMA_VERSION,
  createBacktestReportMetadata,
} from './types/backtest-report.type.js';
export type { MarketEvent } from './types/market-event.type.js';
export { createMarketEvent } from './types/market-event.type.js';
export {
  SimulatedPositionStatus,
  type SimulatedSpreadPosition,
} from './types/simulated-position.type.js';
export type {
  EquityPoint,
  PortfolioState,
  PositionState,
  SimulatedTrade,
} from './types/portfolio-state.type.js';
export { createPortfolioState } from './types/portfolio-state.type.js';

export interface CreateDefaultBacktestEngineOptions {
  strategyEngine: StrategyEngine;
}

export function createDefaultBacktestEngine(
  options: CreateDefaultBacktestEngineOptions,
): CandleBacktestEngine {
  return createCandleBacktestEngine({
    strategyEngine: options.strategyEngine,
    candleReplayer: new CandleReplayer(),
    orderSimulator: new DefaultOrderSimulator(),
    metricsCalculator: new DefaultMetricsCalculator(),
    createPortfolioTracker: (initialCapital: number) =>
      new PortfolioTracker(createPortfolioState(initialCapital)),
  });
}
