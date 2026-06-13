import type {
  BulkCandleImportRequestDto,
  CandleImportDto,
  ImportHistoricalCandlesResultDto,
} from '../dto/candle-import.dto.js';
import {
  InstrumentNotFoundError,
  InvalidImportRequestError,
} from '../errors/market-data.errors.js';
import type {
  HistoricalPriceRecord,
  HistoricalPriceRepository,
} from '../repository/historical-price.repository.js';
import type { InstrumentRepository } from '../repository/instrument.repository.js';
import { deduplicateCandles, validateCandle } from '../validation/candle.validator.js';

export class MarketDataService {
  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly historicalPriceRepository: HistoricalPriceRepository,
  ) {}

  async importHistoricalCandles(
    request: BulkCandleImportRequestDto,
  ): Promise<ImportHistoricalCandlesResultDto> {
    if (!request.instrumentId.trim()) {
      throw new InvalidImportRequestError('instrumentId is required');
    }

    if (request.candles.length === 0) {
      throw new InvalidImportRequestError('candles must not be empty');
    }

    const instrument = await this.instrumentRepository.findById(request.instrumentId);
    if (!instrument) {
      throw new InstrumentNotFoundError(request.instrumentId);
    }

    const errors: ImportHistoricalCandlesResultDto['errors'] = [];
    const validCandles: CandleImportDto[] = [];

    for (const candle of request.candles) {
      const validationError = validateCandle(candle);
      if (validationError) {
        errors.push({
          timestamp: candle.timestamp instanceof Date ? candle.timestamp : new Date(NaN),
          message: validationError,
        });
        continue;
      }

      validCandles.push(candle);
    }

    const { unique, duplicateCount: withinBatchDuplicates } = deduplicateCandles(validCandles);

    const existingTimestamps = await this.historicalPriceRepository.findExistingTimestamps(
      request.instrumentId,
      request.interval,
      unique.map((candle) => candle.timestamp),
    );

    const existingKeys = new Set(existingTimestamps.map((timestamp) => timestamp.getTime()));
    const candlesToInsert = unique.filter(
      (candle) => !existingKeys.has(candle.timestamp.getTime()),
    );
    const databaseDuplicateCount = unique.length - candlesToInsert.length;

    const records = candlesToInsert.map((candle) =>
      this.toHistoricalPriceRecord(request.instrumentId, request.interval, candle),
    );

    const imported =
      records.length > 0 ? await this.historicalPriceRepository.createMany(records) : 0;

    return {
      instrumentId: request.instrumentId,
      interval: request.interval,
      requested: request.candles.length,
      imported,
      skippedDuplicates: withinBatchDuplicates + databaseDuplicateCount,
      skippedInvalid: errors.length,
      errors,
    };
  }

  private toHistoricalPriceRecord(
    instrumentId: string,
    interval: BulkCandleImportRequestDto['interval'],
    candle: CandleImportDto,
  ): HistoricalPriceRecord {
    return {
      instrumentId,
      interval,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: BigInt(candle.volume ?? 0),
      openInterest: candle.openInterest !== undefined ? BigInt(candle.openInterest) : null,
    };
  }
}
