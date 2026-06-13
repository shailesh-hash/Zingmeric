import type { BacktestPositionRecord } from '../types/backtest-position.type.js';
import type { EquityPoint, SimulatedTrade } from '../types/portfolio-state.type.js';

export interface BacktestReportGenerateInput {
  instrumentId: string;
  symbol: string;
  strategyName: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  riskFreeRate?: number;
  trades: SimulatedTrade[];
  positions: BacktestPositionRecord[];
  equityCurve: EquityPoint[];
}

export interface BacktestReportExportOptions {
  pretty?: boolean;
}

export interface BacktestReportCsvSections {
  summary: string;
  trades: string;
  positions: string;
  equityCurve: string;
}

export interface BacktestReportCsvBundle {
  summary: string;
  trades: string;
  positions: string;
  equityCurve: string;
  combined: string;
}
