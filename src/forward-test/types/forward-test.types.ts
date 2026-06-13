import type { BrokerPnlSummary } from '../../broker/types/broker.types.js';
import type { Signal } from '../../strategies/types/signal.type.js';

export interface ForwardExecutionRecord {
  timestamp: Date;
  strategyName: string;
  instrumentId: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  expectedPrice: number;
  actualPrice: number;
  expectedPnl: number;
  actualPnl: number;
  slippage: number;
  slippageCost: number;
}

export interface ForwardTestDailyResult {
  sessionId: string;
  runDate: Date;
  instrumentId: string;
  symbol: string;
  strategyName: string;
  skipped: boolean;
  signal: Signal | null;
  executions: ForwardExecutionRecord[];
  metrics: ForwardTestMetricsSnapshot;
  pnlSummary: BrokerPnlSummary;
}

export interface ForwardTestMetricsSnapshot {
  totalRuns: number;
  totalExecutions: number;
  totalExpectedPnl: number;
  totalActualPnl: number;
  totalSlippageCost: number;
  averageSlippagePerExecution: number;
  pnlVariance: number;
}

export interface ForwardTestSessionState {
  sessionId: string;
  startedAt: Date;
  instrumentId: string;
  symbol: string;
  strategyName: string;
  runs: ForwardTestDailyResult[];
}

export interface ForwardTestEngineConfig {
  instrumentId: string;
  symbol: string;
  strategyName: string;
  lotSize: number;
}
