import type { OptionType } from '@prisma/client';
import { isSupportedOptionUnderlying } from '../constants/underlying-symbols.js';
import type {
  BulkOptionChainImportRequestDto,
  ImportOptionChainResultDto,
  OptionChainRowImportDto,
} from '../dto/option-chain-import.dto.js';
import type {
  OptionChainAtmQueryDto,
  OptionChainDeltaQueryDto,
  OptionChainNearestExpiryQueryDto,
  OptionChainQuoteDto,
  OptionChainSpecificExpiryQueryDto,
} from '../dto/option-chain-query.dto.js';
import {
  InstrumentNotFoundError,
  InvalidImportRequestError,
  OptionChainNotFoundError,
  UnsupportedUnderlyingError,
} from '../errors/market-data.errors.js';
import type { InstrumentRepository } from '../repository/instrument.repository.js';
import type {
  OptionChainRecord,
  OptionChainRepository,
  OptionChainRowIdentity,
} from '../repository/option-chain.repository.js';
import {
  deduplicateOptionChainRows,
  toOptionChainRowKey,
  validateOptionChainRow,
} from '../validation/option-chain.validator.js';

export class OptionChainService {
  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly optionChainRepository: OptionChainRepository,
  ) {}

  async importOptionChain(
    request: BulkOptionChainImportRequestDto,
  ): Promise<ImportOptionChainResultDto> {
    this.validateImportRequest(request);

    const instrument = await this.instrumentRepository.findBySymbol(request.underlyingSymbol);
    if (!instrument) {
      throw new InstrumentNotFoundError(request.underlyingSymbol);
    }

    const errors: ImportOptionChainResultDto['errors'] = [];
    const validRows: OptionChainRowImportDto[] = [];

    for (const row of request.rows) {
      const validationError = validateOptionChainRow(row);
      if (validationError) {
        errors.push({
          snapshotAt: row.snapshotAt instanceof Date ? row.snapshotAt : new Date(NaN),
          expiryDate: row.expiryDate instanceof Date ? row.expiryDate : new Date(NaN),
          strikePrice: row.strikePrice,
          optionType: row.optionType,
          message: validationError,
        });
        continue;
      }

      validRows.push(row);
    }

    const { unique, duplicateCount: withinBatchDuplicates } = deduplicateOptionChainRows(validRows);

    const identities = unique.map((row) => this.toIdentity(instrument.id, row));
    const existingRows = await this.optionChainRepository.findExistingIdentities(identities);
    const existingKeys = new Set(existingRows.map((row) => toOptionChainRowKey(row)));

    const rowsToInsert = unique.filter((row) => !existingKeys.has(toOptionChainRowKey(row)));
    const databaseDuplicateCount = unique.length - rowsToInsert.length;

    const records = rowsToInsert.map((row) => this.toOptionChainRecord(instrument.id, row));
    const imported = records.length > 0 ? await this.optionChainRepository.createMany(records) : 0;

    return {
      underlyingSymbol: request.underlyingSymbol,
      underlyingInstrumentId: instrument.id,
      requested: request.rows.length,
      imported,
      skippedDuplicates: withinBatchDuplicates + databaseDuplicateCount,
      skippedInvalid: errors.length,
      errors,
    };
  }

  async getNearestExpiryChain(
    query: OptionChainNearestExpiryQueryDto,
  ): Promise<{ expiryDate: Date; quotes: OptionChainQuoteDto[] }> {
    const instrument = await this.requireUnderlyingInstrument(query.underlyingSymbol);
    const expiryDate = await this.optionChainRepository.findNearestExpiryDate(
      instrument.id,
      query.snapshotAt,
    );

    if (!expiryDate) {
      throw new OptionChainNotFoundError(
        `No option chain expiry found for ${query.underlyingSymbol} at ${query.snapshotAt.toISOString()}`,
      );
    }

    const rows = await this.optionChainRepository.findBySnapshotAndExpiry(
      instrument.id,
      query.snapshotAt,
      expiryDate,
      query.optionType,
    );

    return {
      expiryDate,
      quotes: rows.map((row) => this.toQuoteDto(row, instrument.symbol)),
    };
  }

  async getSpecificExpiryChain(
    query: OptionChainSpecificExpiryQueryDto,
  ): Promise<OptionChainQuoteDto[]> {
    const instrument = await this.requireUnderlyingInstrument(query.underlyingSymbol);
    const rows = await this.optionChainRepository.findBySnapshotAndExpiry(
      instrument.id,
      query.snapshotAt,
      query.expiryDate,
      query.optionType,
    );

    if (rows.length === 0) {
      throw new OptionChainNotFoundError(
        `No option chain found for ${query.underlyingSymbol} at ${query.snapshotAt.toISOString()} expiring ${query.expiryDate.toISOString()}`,
      );
    }

    return rows.map((row) => this.toQuoteDto(row, instrument.symbol));
  }

  async getAtmStrikes(query: OptionChainAtmQueryDto): Promise<OptionChainQuoteDto[]> {
    if (!Number.isFinite(query.underlyingPrice) || query.underlyingPrice <= 0) {
      throw new InvalidImportRequestError('underlyingPrice must be a positive number');
    }

    const instrument = await this.requireUnderlyingInstrument(query.underlyingSymbol);
    const expiryDate = await this.optionChainRepository.findNearestExpiryDate(
      instrument.id,
      query.snapshotAt,
    );

    if (!expiryDate) {
      throw new OptionChainNotFoundError(
        `No option chain expiry found for ${query.underlyingSymbol} at ${query.snapshotAt.toISOString()}`,
      );
    }

    const rows = await this.optionChainRepository.findAtmStrikes(
      instrument.id,
      query.snapshotAt,
      expiryDate,
      query.underlyingPrice,
      query.strikeCount ?? 1,
      query.optionType,
    );

    if (rows.length === 0) {
      throw new OptionChainNotFoundError(
        `No ATM strikes found for ${query.underlyingSymbol} at ${query.snapshotAt.toISOString()}`,
      );
    }

    return rows.map((row) => this.toQuoteDto(row, instrument.symbol));
  }

  async getByDeltaRange(query: OptionChainDeltaQueryDto): Promise<OptionChainQuoteDto[]> {
    if (!Number.isFinite(query.minDelta) || !Number.isFinite(query.maxDelta)) {
      throw new InvalidImportRequestError('minDelta and maxDelta must be finite numbers');
    }

    if (query.minDelta > query.maxDelta) {
      throw new InvalidImportRequestError('minDelta must be less than or equal to maxDelta');
    }

    const instrument = await this.requireUnderlyingInstrument(query.underlyingSymbol);
    const rows = await this.optionChainRepository.findByDeltaRange(
      instrument.id,
      query.snapshotAt,
      query.minDelta,
      query.maxDelta,
      query.expiryDate,
      query.optionType,
      query.limit,
    );

    if (rows.length === 0) {
      throw new OptionChainNotFoundError(
        `No option chain rows found for ${query.underlyingSymbol} in delta range [${query.minDelta}, ${query.maxDelta}]`,
      );
    }

    return rows.map((row) => this.toQuoteDto(row, instrument.symbol));
  }

  private validateImportRequest(request: BulkOptionChainImportRequestDto): void {
    if (!isSupportedOptionUnderlying(request.underlyingSymbol)) {
      throw new UnsupportedUnderlyingError(request.underlyingSymbol);
    }

    if (request.rows.length === 0) {
      throw new InvalidImportRequestError('rows must not be empty');
    }
  }

  private async requireUnderlyingInstrument(
    symbol: BulkOptionChainImportRequestDto['underlyingSymbol'],
  ) {
    if (!isSupportedOptionUnderlying(symbol)) {
      throw new UnsupportedUnderlyingError(symbol);
    }

    const instrument = await this.instrumentRepository.findBySymbol(symbol);
    if (!instrument) {
      throw new InstrumentNotFoundError(symbol);
    }

    return instrument;
  }

  private toIdentity(
    underlyingInstrumentId: string,
    row: OptionChainRowImportDto,
  ): OptionChainRowIdentity {
    return {
      underlyingInstrumentId,
      snapshotAt: row.snapshotAt,
      expiryDate: row.expiryDate,
      strikePrice: row.strikePrice,
      optionType: row.optionType,
    };
  }

  private toOptionChainRecord(
    underlyingInstrumentId: string,
    row: OptionChainRowImportDto,
  ): OptionChainRecord {
    return {
      underlyingInstrumentId,
      contractInstrumentId: row.contractInstrumentId ?? null,
      snapshotAt: row.snapshotAt,
      expiryDate: row.expiryDate,
      strikePrice: row.strikePrice,
      optionType: row.optionType,
      bid: row.bid ?? null,
      ask: row.ask ?? null,
      lastPrice: row.lastPrice ?? null,
      volume: BigInt(row.volume ?? 0),
      openInterest: BigInt(row.openInterest ?? 0),
      impliedVolatility: row.impliedVolatility ?? null,
      delta: row.delta ?? null,
    };
  }

  private toQuoteDto(
    row: {
      id: string;
      underlyingInstrumentId: string;
      contractInstrumentId: string | null;
      snapshotAt: Date;
      expiryDate: Date;
      strikePrice: number;
      optionType: OptionType;
      bid: number | null;
      ask: number | null;
      lastPrice: number | null;
      volume: bigint;
      openInterest: bigint;
      impliedVolatility: number | null;
      delta: number | null;
    },
    underlyingSymbol: string,
  ): OptionChainQuoteDto {
    return {
      id: row.id,
      underlyingInstrumentId: row.underlyingInstrumentId,
      underlyingSymbol,
      snapshotAt: row.snapshotAt,
      expiryDate: row.expiryDate,
      strikePrice: row.strikePrice,
      optionType: row.optionType,
      bid: row.bid,
      ask: row.ask,
      lastPrice: row.lastPrice,
      volume: row.volume,
      openInterest: row.openInterest,
      impliedVolatility: row.impliedVolatility,
      delta: row.delta,
      contractInstrumentId: row.contractInstrumentId,
    };
  }
}

export function createOptionChainService(
  instrumentRepository: InstrumentRepository,
  optionChainRepository: OptionChainRepository,
): OptionChainService {
  return new OptionChainService(instrumentRepository, optionChainRepository);
}
