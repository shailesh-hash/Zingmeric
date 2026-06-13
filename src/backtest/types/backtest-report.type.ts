import type { BacktestMetrics } from './backtest-result.type.js';
import type { BacktestPositionRecord } from './backtest-position.type.js';
import type { EquityPoint, SimulatedTrade } from './portfolio-state.type.js';

export const BACKTEST_REPORT_SCHEMA_VERSION = '1.0.0';

export interface BacktestReportMetadata {
  reportId: string;
  schemaVersion: string;
  generatedAt: Date;
}

export interface BacktestReport {
  metadata: BacktestReportMetadata;
  instrumentId: string;
  symbol: string;
  strategyName: string;
  startDate: Date;
  endDate: Date;
  metrics: BacktestMetrics;
  trades: SimulatedTrade[];
  positions: BacktestPositionRecord[];
  equityCurve: EquityPoint[];
}

export function createBacktestReportMetadata(
  overrides: Partial<BacktestReportMetadata> = {},
): BacktestReportMetadata {
  return {
    reportId: overrides.reportId ?? crypto.randomUUID(),
    schemaVersion: overrides.schemaVersion ?? BACKTEST_REPORT_SCHEMA_VERSION,
    generatedAt: overrides.generatedAt ?? new Date(),
  };
}
