import type { PrismaClient } from '@prisma/client';
import { PrismaHistoricalPriceRepository } from './repository/prisma-historical-price.repository.js';
import { PrismaInstrumentRepository } from './repository/prisma-instrument.repository.js';
import { MarketDataService } from './service/market-data.service.js';

export type {
  BulkCandleImportRequestDto,
  CandleImportDto,
  ImportHistoricalCandlesResultDto,
  ImportValidationErrorDto,
} from './dto/candle-import.dto.js';
export { InstrumentNotFoundError, InvalidImportRequestError } from './errors/market-data.errors.js';
export type {
  HistoricalPriceRepository,
  HistoricalPriceRecord,
} from './repository/historical-price.repository.js';
export type {
  InstrumentRepository,
  InstrumentSummary,
} from './repository/instrument.repository.js';
export { MarketDataService } from './service/market-data.service.js';
export { deduplicateCandles, validateCandle } from './validation/candle.validator.js';

export function createMarketDataService(prisma: PrismaClient): MarketDataService {
  return new MarketDataService(
    new PrismaInstrumentRepository(prisma),
    new PrismaHistoricalPriceRepository(prisma),
  );
}
