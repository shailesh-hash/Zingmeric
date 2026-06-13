import { jest } from '@jest/globals';
import type { OptionChainRowImportDto } from '../../src/market-data/dto/option-chain-import.dto.js';
import { InvalidImportRequestError } from '../../src/market-data/errors/market-data.errors.js';
import {
  OPTION_CHAIN_IMPORT_JOB_BATCH_SIZE,
  OptionChainImportJob,
} from '../../src/market-data/jobs/option-chain-import.job.js';
import type { OptionChainService } from '../../src/market-data/service/option-chain.service.js';

function validRow(strikePrice: number): OptionChainRowImportDto {
  return {
    snapshotAt: new Date('2024-01-15T09:15:00.000Z'),
    expiryDate: new Date('2024-01-25T00:00:00.000Z'),
    strikePrice,
    optionType: 'CE',
    lastPrice: 100,
  };
}

describe('OptionChainImportJob', () => {
  it('rejects empty payloads', async () => {
    const optionChainService = {
      importOptionChain: jest.fn(),
    } as unknown as OptionChainService;

    const job = new OptionChainImportJob(optionChainService);

    await expect(
      job.run({
        underlyingSymbol: 'NIFTY',
        rows: [],
      }),
    ).rejects.toThrow(InvalidImportRequestError);
  });

  it('processes large imports in batches', async () => {
    const importOptionChain = jest.fn<OptionChainService['importOptionChain']>();
    importOptionChain.mockResolvedValue({
      underlyingSymbol: 'NIFTY',
      underlyingInstrumentId: 'inst-nifty',
      requested: OPTION_CHAIN_IMPORT_JOB_BATCH_SIZE,
      imported: OPTION_CHAIN_IMPORT_JOB_BATCH_SIZE,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: [],
    });

    const optionChainService = {
      importOptionChain,
    } as unknown as OptionChainService;

    const job = new OptionChainImportJob(optionChainService);
    const rows = Array.from({ length: OPTION_CHAIN_IMPORT_JOB_BATCH_SIZE + 500 }, (_, index) =>
      validRow(22_000 + index),
    );

    const result = await job.run({
      underlyingSymbol: 'NIFTY',
      rows,
    });

    expect(importOptionChain).toHaveBeenCalledTimes(2);
    expect(result.requested).toBe(rows.length);
    expect(result.imported).toBe(OPTION_CHAIN_IMPORT_JOB_BATCH_SIZE * 2);
    expect(result.batchesProcessed).toBe(2);
    expect(result.underlyingInstrumentId).toBe('inst-nifty');
  });
});
