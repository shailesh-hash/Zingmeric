import {
  createMarketSnapshot,
  type MarketSnapshot,
} from '../../strategies/types/market-snapshot.type.js';
import type { MarketFeed } from '../types/market-feed.interface.js';

export class InMemoryMarketFeed implements MarketFeed {
  readonly name = 'in-memory';

  private readonly snapshots = new Map<string, MarketSnapshot[]>();
  private cursor = new Map<string, number>();

  push(instrumentId: string, snapshot: MarketSnapshot): void {
    const series = this.snapshots.get(instrumentId) ?? [];
    series.push(snapshot);
    this.snapshots.set(instrumentId, series);
  }

  pushMany(instrumentId: string, snapshots: MarketSnapshot[]): void {
    for (const snapshot of snapshots) {
      this.push(instrumentId, snapshot);
    }
  }

  fetchSnapshot(instrumentId: string): Promise<MarketSnapshot | null> {
    const series = this.snapshots.get(instrumentId);
    if (!series || series.length === 0) {
      return Promise.resolve(null);
    }

    const index = this.cursor.get(instrumentId) ?? 0;
    if (index >= series.length) {
      return Promise.resolve(null);
    }

    const snapshot = series[index];
    this.cursor.set(instrumentId, index + 1);

    return Promise.resolve(snapshot);
  }

  peek(instrumentId: string): MarketSnapshot | null {
    const series = this.snapshots.get(instrumentId);
    if (!series || series.length === 0) {
      return null;
    }

    const index = this.cursor.get(instrumentId) ?? 0;
    return series[index] ?? null;
  }

  reset(instrumentId?: string): void {
    if (instrumentId) {
      this.cursor.set(instrumentId, 0);
      return;
    }

    this.cursor.clear();
  }
}

export function createInMemoryMarketFeed(initial?: {
  instrumentId: string;
  symbol: string;
  price: number;
  snapshots?: Partial<MarketSnapshot>[];
}): InMemoryMarketFeed {
  const feed = new InMemoryMarketFeed();

  if (initial) {
    const base = initial.snapshots ?? [{ price: initial.price }];
    for (const partial of base) {
      feed.push(
        initial.instrumentId,
        createMarketSnapshot({
          instrumentId: initial.instrumentId,
          symbol: initial.symbol,
          price: partial.price ?? initial.price,
          timestamp: partial.timestamp,
          accountEquity: partial.accountEquity,
          optionChain: partial.optionChain,
        }),
      );
    }
  }

  return feed;
}
