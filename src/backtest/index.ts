import { StrategyEngine } from '../strategies/engine/strategy-engine.js';
import { BacktestEngine, createBacktestEngine } from './engine/backtest-engine.js';
import { DefaultMetricsCalculator } from './metrics/metrics-calculator.js';
import { PortfolioTracker } from './portfolio/portfolio-tracker.js';
import { createPortfolioState } from './types/portfolio-state.type.js';
import { CandleReplayer } from './replay/candle-replayer.js';
import { DefaultOrderSimulator } from './simulation/order-simulator.js';

export type { BacktestRunRequest, BacktestEngineDependencies } from './engine/backtest-engine.js';
export { BacktestEngine, createBacktestEngine } from './engine/backtest-engine.js';
export { InvalidBacktestRequestError } from './errors/backtest.errors.js';
export type { MetricsCalculator, MetricsCalculatorInput } from './metrics/metrics-calculator.js';
export { DefaultMetricsCalculator } from './metrics/metrics-calculator.js';
export { PortfolioTracker } from './portfolio/portfolio-tracker.js';
export { CandleReplayer } from './replay/candle-replayer.js';
export type { OrderSimulator } from './simulation/order-simulator.js';
export { DefaultOrderSimulator } from './simulation/order-simulator.js';
export { calculateOrderCosts, type OrderCostBreakdown } from './simulation/trading-costs.js';
export type { BacktestCandle } from './types/backtest-candle.type.js';
export { sortCandlesByTime } from './types/backtest-candle.type.js';
export type { BacktestConfig, TradingCostConfig } from './types/backtest-config.type.js';
export { createBacktestConfig, DEFAULT_TRADING_COSTS } from './types/backtest-config.type.js';
export type { BacktestMetrics, BacktestRunResult } from './types/backtest-result.type.js';
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
): BacktestEngine {
  return createBacktestEngine({
    strategyEngine: options.strategyEngine,
    candleReplayer: new CandleReplayer(),
    orderSimulator: new DefaultOrderSimulator(),
    metricsCalculator: new DefaultMetricsCalculator(),
    createPortfolioTracker: (initialCapital: number) =>
      new PortfolioTracker(createPortfolioState(initialCapital)),
  });
}
