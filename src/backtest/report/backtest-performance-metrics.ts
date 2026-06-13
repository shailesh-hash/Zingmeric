import {
  calculateCagr,
  calculateMaxDrawdown,
  calculatePeriodReturns,
  calculateProfitFactor,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateWinRate,
} from '../../analytics/metrics/performance-metrics.js';
import { DEFAULT_ANALYTICS_CONFIG } from '../../analytics/types/analytics.types.js';
import type { BacktestMetrics } from '../types/backtest-result.type.js';
import type { EquityPoint, SimulatedTrade } from '../types/portfolio-state.type.js';

export interface BacktestPerformanceInput {
  equityCurve: EquityPoint[];
  trades: SimulatedTrade[];
  initialCapital: number;
  startDate: Date;
  endDate: Date;
  riskFreeRate?: number;
  tradingDaysPerYear?: number;
}

export function calculateBacktestPerformanceMetrics(
  input: BacktestPerformanceInput,
): BacktestMetrics {
  const riskFreeRate = input.riskFreeRate ?? DEFAULT_ANALYTICS_CONFIG.riskFreeRate;
  const tradingDaysPerYear =
    input.tradingDaysPerYear ?? DEFAULT_ANALYTICS_CONFIG.tradingDaysPerYear;
  const finalCapital = input.equityCurve.at(-1)?.equity ?? input.initialCapital;
  const returns = calculatePeriodReturns(input.equityCurve);
  const closingTrades = input.trades.filter((trade) => trade.side === 'SELL');

  return {
    cagr: calculateCagr(input.initialCapital, finalCapital, input.startDate, input.endDate),
    sharpeRatio: calculateSharpeRatio(returns, riskFreeRate, tradingDaysPerYear),
    sortinoRatio: calculateSortinoRatio(returns, riskFreeRate, tradingDaysPerYear),
    profitFactor: calculateProfitFactor(input.trades),
    maxDrawdown: calculateMaxDrawdown(input.equityCurve),
    winRate: calculateWinRate(input.trades),
    totalTrades: closingTrades.length,
    finalCapital,
    initialCapital: input.initialCapital,
  };
}
