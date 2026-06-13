import type { PrismaClient } from '@prisma/client';
import { PrismaHistoricalPriceRepository } from './repository/prisma-historical-price.repository.js';
import { PrismaInstrumentRepository } from './repository/prisma-instrument.repository.js';
import { PrismaOptionChainRepository } from './repository/prisma-option-chain.repository.js';
import { MarketDataService } from './service/market-data.service.js';
import { OptionChainService, createOptionChainService } from './service/option-chain.service.js';
import {
  OptionChainImportJob,
  createOptionChainImportJob,
} from './jobs/option-chain-import.job.js';

export type {
  BulkCandleImportRequestDto,
  CandleImportDto,
  ImportHistoricalCandlesResultDto,
  ImportValidationErrorDto,
} from './dto/candle-import.dto.js';
export type {
  BulkOptionChainImportRequestDto,
  ImportOptionChainResultDto,
  OptionChainImportValidationErrorDto,
  OptionChainRowImportDto,
} from './dto/option-chain-import.dto.js';
export type {
  OptionChainAtmQueryDto,
  OptionChainDeltaQueryDto,
  OptionChainNearestExpiryQueryDto,
  OptionChainQuoteDto,
  OptionChainSpecificExpiryQueryDto,
} from './dto/option-chain-query.dto.js';
export {
  SUPPORTED_OPTION_UNDERLYINGS,
  isSupportedOptionUnderlying,
} from './constants/underlying-symbols.js';
export type { SupportedOptionUnderlying } from './constants/underlying-symbols.js';
export {
  InstrumentNotFoundError,
  InvalidImportRequestError,
  OptionChainNotFoundError,
  UnsupportedUnderlyingError,
} from './errors/market-data.errors.js';
export type {
  HistoricalPriceRepository,
  HistoricalPriceRecord,
} from './repository/historical-price.repository.js';
export type {
  InstrumentRepository,
  InstrumentSummary,
} from './repository/instrument.repository.js';
export type {
  OptionChainRepository,
  OptionChainRecord,
  OptionChainDbRow,
} from './repository/option-chain.repository.js';
export { OPTION_CHAIN_BATCH_SIZE } from './repository/option-chain.repository.js';
export { MarketDataService } from './service/market-data.service.js';
export { OptionChainService, createOptionChainService } from './service/option-chain.service.js';
export {
  OptionChainImportJob,
  createOptionChainImportJob,
  OPTION_CHAIN_IMPORT_JOB_BATCH_SIZE,
} from './jobs/option-chain-import.job.js';
export type {
  OptionChainImportJobPayload,
  OptionChainImportJobResult,
} from './jobs/option-chain-import.job.js';
export { deduplicateCandles, validateCandle } from './validation/candle.validator.js';
export {
  deduplicateOptionChainRows,
  validateOptionChainRow,
  toOptionChainRowKey,
} from './validation/option-chain.validator.js';

export function createMarketDataService(prisma: PrismaClient): MarketDataService {
  return new MarketDataService(
    new PrismaInstrumentRepository(prisma),
    new PrismaHistoricalPriceRepository(prisma),
  );
}

export function createOptionChainModule(prisma: PrismaClient): {
  optionChainService: OptionChainService;
  optionChainImportJob: OptionChainImportJob;
} {
  const instrumentRepository = new PrismaInstrumentRepository(prisma);
  const optionChainRepository = new PrismaOptionChainRepository(prisma);
  const optionChainService = createOptionChainService(instrumentRepository, optionChainRepository);

  return {
    optionChainService,
    optionChainImportJob: createOptionChainImportJob(optionChainService),
  };
}
