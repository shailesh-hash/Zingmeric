import type { BacktestCandle } from '../types/backtest-candle.type.js';
import type { PortfolioState } from '../types/portfolio-state.type.js';

export class PortfolioTracker {
  constructor(private readonly portfolio: PortfolioState) {}

  get state(): PortfolioState {
    return this.portfolio;
  }

  recordTrade(trade: PortfolioState['trades'][number]): void {
    this.portfolio.trades.push(trade);
  }

  markToMarket(candle: BacktestCandle): void {
    const positionValue = this.getPositionValue(candle.close);
    const equity = this.portfolio.cash + positionValue;

    this.portfolio.equityCurve.push({
      timestamp: candle.timestamp,
      equity,
      cash: this.portfolio.cash,
      positionValue,
    });
  }

  getEquity(markPrice: number): number {
    return this.portfolio.cash + this.getPositionValue(markPrice);
  }

  private getPositionValue(markPrice: number): number {
    if (!this.portfolio.position) {
      return 0;
    }

    return this.portfolio.position.quantity * markPrice;
  }
}
