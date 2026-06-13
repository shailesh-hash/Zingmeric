import type { SupportedOptionUnderlying } from '../constants/underlying-symbols.js';
import type {
  BulkOptionChainImportRequestDto,
  ImportOptionChainResultDto,
  OptionChainRowImportDto,
} from '../dto/option-chain-import.dto.js';
import { InvalidImportRequestError } from '../errors/market-data.errors.js';
import type { OptionChainService } from '../service/option-chain.service.js';

export interface OptionChainImportJobPayload {
  underlyingSymbol: SupportedOptionUnderlying;
  rows: OptionChainRowImportDto[];
}

export interface OptionChainImportJobResult extends ImportOptionChainResultDto {
  batchesProcessed: number;
}

export const OPTION_CHAIN_IMPORT_JOB_BATCH_SIZE = 10_000;

export class OptionChainImportJob {
  constructor(private readonly optionChainService: OptionChainService) {}

  async run(payload: OptionChainImportJobPayload): Promise<OptionChainImportJobResult> {
    if (payload.rows.length === 0) {
      throw new InvalidImportRequestError('rows must not be empty');
    }

    const aggregated: OptionChainImportJobResult = {
      underlyingSymbol: payload.underlyingSymbol,
      underlyingInstrumentId: '',
      requested: payload.rows.length,
      imported: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: [],
      batchesProcessed: 0,
    };

    for (
      let offset = 0;
      offset < payload.rows.length;
      offset += OPTION_CHAIN_IMPORT_JOB_BATCH_SIZE
    ) {
      const batchRows = payload.rows.slice(offset, offset + OPTION_CHAIN_IMPORT_JOB_BATCH_SIZE);
      const batchResult = await this.optionChainService.importOptionChain(
        this.toImportRequest(payload.underlyingSymbol, batchRows),
      );

      aggregated.underlyingInstrumentId = batchResult.underlyingInstrumentId;
      aggregated.imported += batchResult.imported;
      aggregated.skippedDuplicates += batchResult.skippedDuplicates;
      aggregated.skippedInvalid += batchResult.skippedInvalid;
      aggregated.errors.push(...batchResult.errors);
      aggregated.batchesProcessed += 1;
    }

    return aggregated;
  }

  private toImportRequest(
    underlyingSymbol: SupportedOptionUnderlying,
    rows: OptionChainRowImportDto[],
  ): BulkOptionChainImportRequestDto {
    return {
      underlyingSymbol,
      rows,
    };
  }
}

export function createOptionChainImportJob(
  optionChainService: OptionChainService,
): OptionChainImportJob {
  return new OptionChainImportJob(optionChainService);
}
