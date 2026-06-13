import type { BacktestCandle } from '../types/backtest-candle.type.js';
import type { TradingCostConfig } from '../types/backtest-config.type.js';
import type { BacktestReport } from '../types/backtest-report.type.js';
import type { MarketEvent } from '../types/market-event.type.js';
import type { EventBus } from './event-bus.interface.js';
import type { HistoricalOptionChainDTO } from './replay-engine.types.js';
import type { MetricsEngine } from '../metrics/metrics-engine.js';
import type { PortfolioEngine } from '../../portfolio/engine/portfolio-engine.js';
import type { RiskEngine } from '../../risk/engine/risk-engine.js';
import type { Strategy } from '../../strategies/strategy.interface.js';
import type { ReplayEngine } from './replay-engine.js';

import type { RiskEngineConfig } from '../../risk/types/risk.types.js';

export interface BacktestEngineConfig {
  instrumentId: string;
  symbol: string;
  strategyName: string;
  initialCapital: number;
  lotSize?: number;
  riskFreeRate?: number;
  includeCosts?: boolean;
  costs?: TradingCostConfig;
  requireOptionChain?: boolean;
  riskConfig?: RiskEngineConfig;
}

/** Permissive defaults so historical replays are not blocked by live-trading risk limits. */
export const BACKTEST_RISK_CONFIG: RiskEngineConfig = {
  maxRiskPerTradePct: 0.99,
  hardStopRiskPerTradePct: 1,
  maxPortfolioDrawdownPct: 1,
};

export interface BacktestEngineInput {
  config: BacktestEngineConfig;
  strategy: Strategy;
  candles: BacktestCandle[];
  optionChains?: HistoricalOptionChainDTO[];
}

export interface BacktestEngineLegacyInput {
  config: BacktestEngineConfig;
  strategy: Strategy;
  events: MarketEvent[];
}

export type BacktestEngineResult = BacktestReport;

export interface BacktestEngineDependencies {
  replayEngine: ReplayEngine;
  eventBus: EventBus;
  createPortfolioEngine: (initialCapital: number) => PortfolioEngine;
  createRiskEngine: (riskConfig?: RiskEngineConfig) => RiskEngine;
  createMetricsEngine: () => MetricsEngine;
}
