import type { PriceInterval } from '@prisma/client';

export interface HistoricalPriceRecord {
  instrumentId: string;
  interval: PriceInterval;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: bigint;
  openInterest?: bigint | null;
}

export interface HistoricalPriceRepository {
  findExistingTimestamps(
    instrumentId: string,
    interval: PriceInterval,
    timestamps: Date[],
  ): Promise<Date[]>;

  createMany(records: HistoricalPriceRecord[]): Promise<number>;
}

export const HISTORICAL_PRICE_BATCH_SIZE = 1000;
