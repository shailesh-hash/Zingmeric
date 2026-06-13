import type { Strategy } from '../../strategies/strategy.interface.js';
import type { MarketSnapshot } from '../../strategies/types/market-snapshot.type.js';
import type { Signal } from '../../strategies/types/signal.type.js';

export class BacktestSignalEngine {
  constructor(private readonly strategy: Strategy) {}

  get strategyName(): string {
    return this.strategy.name;
  }

  generateSignal(snapshot: MarketSnapshot): Signal {
    return this.strategy.evaluate(snapshot);
  }
}

export function createBacktestSignalEngine(strategy: Strategy): BacktestSignalEngine {
  return new BacktestSignalEngine(strategy);
}
