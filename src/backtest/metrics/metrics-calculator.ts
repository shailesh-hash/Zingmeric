import type { BacktestMetrics } from '../types/backtest-result.type.js';
import type { EquityPoint, SimulatedTrade } from '../types/portfolio-state.type.js';
import { calculateBacktestPerformanceMetrics } from '../report/backtest-performance-metrics.js';

export interface MetricsCalculatorInput {
  equityCurve: EquityPoint[];
  trades: SimulatedTrade[];
  initialCapital: number;
  startDate: Date;
  endDate: Date;
  riskFreeRate: number;
}

export interface MetricsCalculator {
  calculate(input: MetricsCalculatorInput): BacktestMetrics;
}

export class DefaultMetricsCalculator implements MetricsCalculator {
  calculate(input: MetricsCalculatorInput): BacktestMetrics {
    return calculateBacktestPerformanceMetrics({
      equityCurve: input.equityCurve,
      trades: input.trades,
      initialCapital: input.initialCapital,
      startDate: input.startDate,
      endDate: input.endDate,
      riskFreeRate: input.riskFreeRate,
    });
  }
}
