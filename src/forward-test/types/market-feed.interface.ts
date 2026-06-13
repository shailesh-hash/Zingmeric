import type { MarketSnapshot } from '../../strategies/types/market-snapshot.type.js';

export interface MarketFeed {
  readonly name: string;
  fetchSnapshot(instrumentId: string): Promise<MarketSnapshot | null>;
}

export interface MarketFeedSnapshotRequest {
  instrumentId: string;
  symbol: string;
  timestamp?: Date;
}
