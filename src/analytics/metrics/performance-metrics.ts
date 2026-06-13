import type { AnalyticsEquityPoint, AnalyticsTrade } from '../types/analytics.types.js';
import type { DrawdownPoint } from '../types/analytics.types.js';

export function calculatePeriodReturns(equityCurve: AnalyticsEquityPoint[]): number[] {
  const returns: number[] = [];

  for (let index = 1; index < equityCurve.length; index += 1) {
    const previous = equityCurve[index - 1]?.equity ?? 0;
    const current = equityCurve[index]?.equity ?? 0;

    if (previous > 0) {
      returns.push((current - previous) / previous);
    }
  }

  return returns;
}

export function calculateCagr(
  initialCapital: number,
  finalCapital: number,
  startDate: Date,
  endDate: Date,
): number {
  if (initialCapital <= 0) {
    return 0;
  }

  const elapsedMs = endDate.getTime() - startDate.getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

  if (elapsedDays <= 0) {
    return 0;
  }

  const years = elapsedDays / 365;
  return (finalCapital / initialCapital) ** (1 / years) - 1;
}

export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number,
  tradingDaysPerYear: number,
): number {
  if (returns.length === 0) {
    return 0;
  }

  const dailyRiskFree = riskFreeRate / tradingDaysPerYear;
  const excessReturns = returns.map((value) => value - dailyRiskFree);
  const mean = excessReturns.reduce((sum, value) => sum + value, 0) / excessReturns.length;
  const variance =
    excessReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / excessReturns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return 0;
  }

  return (mean / stdDev) * Math.sqrt(tradingDaysPerYear);
}

export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number,
  tradingDaysPerYear: number,
): number {
  if (returns.length === 0) {
    return 0;
  }

  const dailyRiskFree = riskFreeRate / tradingDaysPerYear;
  const excessReturns = returns.map((value) => value - dailyRiskFree);
  const mean = excessReturns.reduce((sum, value) => sum + value, 0) / excessReturns.length;
  const downsideVariance =
    excessReturns.reduce((sum, value) => sum + Math.min(0, value) ** 2, 0) / excessReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);

  if (downsideDeviation === 0) {
    return 0;
  }

  return (mean / downsideDeviation) * Math.sqrt(tradingDaysPerYear);
}

export function calculateMaxDrawdown(equityCurve: AnalyticsEquityPoint[]): number {
  if (equityCurve.length === 0) {
    return 0;
  }

  let peak = equityCurve[0]?.equity ?? 0;
  let maxDrawdown = 0;

  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);

    if (peak > 0) {
      const drawdown = (peak - point.equity) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }

  return maxDrawdown;
}

export function calculateDrawdownSeries(equityCurve: AnalyticsEquityPoint[]): DrawdownPoint[] {
  if (equityCurve.length === 0) {
    return [];
  }

  let peak = equityCurve[0]?.equity ?? 0;

  return equityCurve.map((point) => {
    peak = Math.max(peak, point.equity);
    const drawdown = peak > 0 ? (peak - point.equity) / peak : 0;

    return {
      timestamp: point.timestamp,
      equity: point.equity,
      peakEquity: peak,
      drawdown,
    };
  });
}

export function calculateProfitFactor(trades: AnalyticsTrade[]): number {
  const closingTrades = trades.filter((trade) => trade.side === 'SELL');
  const grossProfit = closingTrades
    .filter((trade) => trade.realizedPnl > 0)
    .reduce((sum, trade) => sum + trade.realizedPnl, 0);
  const grossLoss = Math.abs(
    closingTrades
      .filter((trade) => trade.realizedPnl < 0)
      .reduce((sum, trade) => sum + trade.realizedPnl, 0),
  );

  if (grossLoss === 0) {
    return grossProfit > 0 ? Number.POSITIVE_INFINITY : 0;
  }

  return grossProfit / grossLoss;
}

export function calculateWinRate(trades: AnalyticsTrade[]): number {
  const closingTrades = trades.filter((trade) => trade.side === 'SELL');

  if (closingTrades.length === 0) {
    return 0;
  }

  const wins = closingTrades.filter((trade) => trade.realizedPnl > 0).length;
  return wins / closingTrades.length;
}
