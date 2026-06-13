import type { EquityPoint, SimulatedTrade } from './portfolio-state.type.js';

export interface BacktestMetrics {
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  finalCapital: number;
  initialCapital: number;
}

export interface BacktestRunResult {
  instrumentId: string;
  symbol: string;
  strategyName: string;
  startDate: Date;
  endDate: Date;
  metrics: BacktestMetrics;
  trades: SimulatedTrade[];
  equityCurve: EquityPoint[];
}
