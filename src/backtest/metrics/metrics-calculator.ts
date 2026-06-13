import type { BacktestMetrics } from '../types/backtest-result.type.js';
import type { EquityPoint, SimulatedTrade } from '../types/portfolio-state.type.js';

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
    const finalCapital = input.equityCurve.at(-1)?.equity ?? input.initialCapital;
    const cagr = this.calculateCagr(
      input.initialCapital,
      finalCapital,
      input.startDate,
      input.endDate,
    );
    const sharpeRatio = this.calculateSharpeRatio(input.equityCurve, input.riskFreeRate);
    const profitFactor = this.calculateProfitFactor(input.trades);
    const maxDrawdown = this.calculateMaxDrawdown(input.equityCurve);
    const winRate = this.calculateWinRate(input.trades);
    const sellTrades = input.trades.filter((trade) => trade.side === 'SELL');

    return {
      cagr,
      sharpeRatio,
      profitFactor,
      maxDrawdown,
      winRate,
      totalTrades: sellTrades.length,
      finalCapital,
      initialCapital: input.initialCapital,
    };
  }

  private calculateCagr(
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
    return Math.pow(finalCapital / initialCapital, 1 / years) - 1;
  }

  private calculateSharpeRatio(equityCurve: EquityPoint[], riskFreeRate: number): number {
    if (equityCurve.length < 2) {
      return 0;
    }

    const returns: number[] = [];

    for (let index = 1; index < equityCurve.length; index += 1) {
      const previous = equityCurve[index - 1]?.equity ?? 0;
      const current = equityCurve[index]?.equity ?? 0;

      if (previous > 0) {
        returns.push((current - previous) / previous);
      }
    }

    if (returns.length === 0) {
      return 0;
    }

    const dailyRiskFree = riskFreeRate / 252;
    const excessReturns = returns.map((value) => value - dailyRiskFree);
    const mean = excessReturns.reduce((sum, value) => sum + value, 0) / excessReturns.length;
    const variance =
      excessReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / excessReturns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      return 0;
    }

    return (mean / stdDev) * Math.sqrt(252);
  }

  private calculateProfitFactor(trades: SimulatedTrade[]): number {
    const sellTrades = trades.filter((trade) => trade.side === 'SELL');
    const grossProfit = sellTrades
      .filter((trade) => trade.realizedPnl > 0)
      .reduce((sum, trade) => sum + trade.realizedPnl, 0);
    const grossLoss = Math.abs(
      sellTrades
        .filter((trade) => trade.realizedPnl < 0)
        .reduce((sum, trade) => sum + trade.realizedPnl, 0),
    );

    if (grossLoss === 0) {
      return grossProfit > 0 ? Number.POSITIVE_INFINITY : 0;
    }

    return grossProfit / grossLoss;
  }

  private calculateMaxDrawdown(equityCurve: EquityPoint[]): number {
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

  private calculateWinRate(trades: SimulatedTrade[]): number {
    const sellTrades = trades.filter((trade) => trade.side === 'SELL');

    if (sellTrades.length === 0) {
      return 0;
    }

    const wins = sellTrades.filter((trade) => trade.realizedPnl > 0).length;
    return wins / sellTrades.length;
  }
}
