import type { SimulatedTrade } from '../types/portfolio-state.type.js';

export class BacktestTradeLedger {
  private readonly trades: SimulatedTrade[] = [];

  record(trade: SimulatedTrade): void {
    this.trades.push(trade);
  }

  getTrades(): SimulatedTrade[] {
    return [...this.trades];
  }
}

export function createBacktestTradeLedger(): BacktestTradeLedger {
  return new BacktestTradeLedger();
}
