import type { PrismaClient } from '@prisma/client';
import {
  HISTORICAL_PRICE_BATCH_SIZE,
  type HistoricalPriceRecord,
  type HistoricalPriceRepository,
} from './historical-price.repository.js';

export class PrismaHistoricalPriceRepository implements HistoricalPriceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findExistingTimestamps(
    instrumentId: string,
    interval: HistoricalPriceRecord['interval'],
    timestamps: Date[],
  ): Promise<Date[]> {
    if (timestamps.length === 0) {
      return [];
    }

    const existing = await this.prisma.historicalPrice.findMany({
      where: {
        instrumentId,
        interval,
        timestamp: { in: timestamps },
      },
      select: { timestamp: true },
    });

    return existing.map((row) => row.timestamp);
  }

  async createMany(records: HistoricalPriceRecord[]): Promise<number> {
    if (records.length === 0) {
      return 0;
    }

    let imported = 0;

    for (let offset = 0; offset < records.length; offset += HISTORICAL_PRICE_BATCH_SIZE) {
      const batch = records.slice(offset, offset + HISTORICAL_PRICE_BATCH_SIZE);
      const result = await this.prisma.historicalPrice.createMany({
        data: batch.map((record) => ({
          instrumentId: record.instrumentId,
          interval: record.interval,
          timestamp: record.timestamp,
          open: record.open,
          high: record.high,
          low: record.low,
          close: record.close,
          volume: record.volume,
          openInterest: record.openInterest ?? null,
        })),
        skipDuplicates: true,
      });

      imported += result.count;
    }

    return imported;
  }
}
