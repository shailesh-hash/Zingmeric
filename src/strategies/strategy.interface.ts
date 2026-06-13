import type { MarketSnapshot } from './types/market-snapshot.type.js';
import type { Signal } from './types/signal.type.js';

export interface Strategy {
  readonly name: string;
  evaluate(snapshot: MarketSnapshot): Signal;
}
