import { jest } from '@jest/globals';
import type {
  BulkOptionChainImportRequestDto,
  OptionChainRowImportDto,
} from '../../src/market-data/dto/option-chain-import.dto.js';
import {
  InstrumentNotFoundError,
  InvalidImportRequestError,
  OptionChainNotFoundError,
  UnsupportedUnderlyingError,
} from '../../src/market-data/errors/market-data.errors.js';
import type { InstrumentRepository } from '../../src/market-data/repository/instrument.repository.js';
import type {
  OptionChainDbRow,
  OptionChainRecord,
  OptionChainRepository,
  OptionChainRowIdentity,
} from '../../src/market-data/repository/option-chain.repository.js';
import { OptionChainService } from '../../src/market-data/service/option-chain.service.js';

const underlyingInstrumentId = 'inst-nifty';
const snapshotAt = new Date('2024-01-15T09:15:00.000Z');
const expiryDate = new Date('2024-01-25T00:00:00.000Z');

function validRow(overrides: Partial<OptionChainRowImportDto> = {}): OptionChainRowImportDto {
  return {
    snapshotAt,
    expiryDate,
    strikePrice: 22_000,
    optionType: 'CE',
    bid: 120,
    ask: 125,
    lastPrice: 122,
    volume: 1000,
    openInterest: 5000,
    impliedVolatility: 0.18,
    delta: 0.45,
    ...overrides,
  };
}

function createDbRow(overrides: Partial<OptionChainDbRow> = {}): OptionChainDbRow {
  return {
    id: 'oc-1',
    underlyingInstrumentId,
    contractInstrumentId: null,
    snapshotAt,
    expiryDate,
    strikePrice: 22_000,
    optionType: 'CE',
    bid: 120,
    ask: 125,
    lastPrice: 122,
    volume: 1000n,
    openInterest: 5000n,
    impliedVolatility: 0.18,
    delta: 0.45,
    ...overrides,
  };
}

function createMocks() {
  const instrumentRepository: jest.Mocked<InstrumentRepository> = {
    findById: jest.fn(),
    findBySymbol: jest.fn(),
  };

  const optionChainRepository: jest.Mocked<OptionChainRepository> = {
    findExistingIdentities: jest.fn(),
    createMany: jest.fn(),
    findNearestExpiryDate: jest.fn(),
    findBySnapshotAndExpiry: jest.fn(),
    findAtmStrikes: jest.fn(),
    findByDeltaRange: jest.fn(),
  };

  const service = new OptionChainService(instrumentRepository, optionChainRepository);

  return { service, instrumentRepository, optionChainRepository };
}

function getCreateManyRecords(
  optionChainRepository: jest.Mocked<OptionChainRepository>,
): OptionChainRecord[] {
  const calls = optionChainRepository.createMany.mock.calls;
  if (calls.length === 0) {
    return [];
  }
  return calls[0][0];
}

describe('OptionChainService', () => {
  const request: BulkOptionChainImportRequestDto = {
    underlyingSymbol: 'NIFTY',
    rows: [validRow(), validRow({ strikePrice: 22_100, optionType: 'PE', delta: -0.35 })],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unsupported underlyings', async () => {
    const { service } = createMocks();

    await expect(
      service.importOptionChain({ underlyingSymbol: 'SENSEX' as 'NIFTY', rows: [validRow()] }),
    ).rejects.toThrow(UnsupportedUnderlyingError);
  });

  it('throws when underlying instrument does not exist', async () => {
    const { service, instrumentRepository } = createMocks();
    instrumentRepository.findBySymbol.mockResolvedValue(null);

    await expect(service.importOptionChain(request)).rejects.toThrow(InstrumentNotFoundError);
  });

  it('imports valid rows in bulk with deduplication', async () => {
    const { service, instrumentRepository, optionChainRepository } = createMocks();

    instrumentRepository.findBySymbol.mockResolvedValue({
      id: underlyingInstrumentId,
      symbol: 'NIFTY',
    });
    optionChainRepository.findExistingIdentities.mockResolvedValue([]);
    optionChainRepository.createMany.mockResolvedValue(2);

    const result = await service.importOptionChain(request);

    expect(result).toEqual({
      underlyingSymbol: 'NIFTY',
      underlyingInstrumentId,
      requested: 2,
      imported: 2,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: [],
    });

    expect(getCreateManyRecords(optionChainRepository)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          underlyingInstrumentId,
          strikePrice: 22_000,
          optionType: 'CE',
          volume: 1000n,
          openInterest: 5000n,
          delta: 0.45,
        }),
      ]),
    );
  });

  it('skips duplicates within batch and in database', async () => {
    const { service, instrumentRepository, optionChainRepository } = createMocks();
    const duplicateIdentity: OptionChainRowIdentity = {
      underlyingInstrumentId,
      snapshotAt,
      expiryDate,
      strikePrice: 22_000,
      optionType: 'CE',
    };

    instrumentRepository.findBySymbol.mockResolvedValue({
      id: underlyingInstrumentId,
      symbol: 'NIFTY',
    });
    optionChainRepository.findExistingIdentities.mockResolvedValue([duplicateIdentity]);
    optionChainRepository.createMany.mockResolvedValue(1);

    const result = await service.importOptionChain({
      underlyingSymbol: 'NIFTY',
      rows: [validRow(), validRow(), validRow({ strikePrice: 22_100, optionType: 'PE' })],
    });

    expect(result.requested).toBe(3);
    expect(result.imported).toBe(1);
    expect(result.skippedDuplicates).toBe(2);
  });

  it('reports invalid rows without importing them', async () => {
    const { service, instrumentRepository, optionChainRepository } = createMocks();

    instrumentRepository.findBySymbol.mockResolvedValue({
      id: underlyingInstrumentId,
      symbol: 'NIFTY',
    });
    optionChainRepository.findExistingIdentities.mockResolvedValue([]);
    optionChainRepository.createMany.mockResolvedValue(1);

    const result = await service.importOptionChain({
      underlyingSymbol: 'NIFTY',
      rows: [validRow(), validRow({ strikePrice: -100 })],
    });

    expect(result.imported).toBe(1);
    expect(result.skippedInvalid).toBe(1);
    expect(result.errors[0]?.message).toBe('strikePrice must be a positive number');
  });

  it('returns nearest expiry chain', async () => {
    const { service, instrumentRepository, optionChainRepository } = createMocks();

    instrumentRepository.findBySymbol.mockResolvedValue({
      id: underlyingInstrumentId,
      symbol: 'NIFTY',
    });
    optionChainRepository.findNearestExpiryDate.mockResolvedValue(expiryDate);
    optionChainRepository.findBySnapshotAndExpiry.mockResolvedValue([createDbRow()]);

    const result = await service.getNearestExpiryChain({
      underlyingSymbol: 'NIFTY',
      snapshotAt,
    });

    expect(result.expiryDate).toEqual(expiryDate);
    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0]?.underlyingSymbol).toBe('NIFTY');
  });

  it('returns specific expiry chain', async () => {
    const { service, instrumentRepository, optionChainRepository } = createMocks();

    instrumentRepository.findBySymbol.mockResolvedValue({
      id: underlyingInstrumentId,
      symbol: 'BANKNIFTY',
    });
    optionChainRepository.findBySnapshotAndExpiry.mockResolvedValue([createDbRow()]);

    const quotes = await service.getSpecificExpiryChain({
      underlyingSymbol: 'BANKNIFTY',
      snapshotAt,
      expiryDate,
    });

    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.underlyingSymbol).toBe('BANKNIFTY');
  });

  it('returns ATM strikes', async () => {
    const { service, instrumentRepository, optionChainRepository } = createMocks();

    instrumentRepository.findBySymbol.mockResolvedValue({
      id: underlyingInstrumentId,
      symbol: 'FINNIFTY',
    });
    optionChainRepository.findNearestExpiryDate.mockResolvedValue(expiryDate);
    optionChainRepository.findAtmStrikes.mockResolvedValue([
      createDbRow({ strikePrice: 22_000 }),
      createDbRow({ id: 'oc-2', strikePrice: 22_000, optionType: 'PE', delta: -0.45 }),
    ]);

    const quotes = await service.getAtmStrikes({
      underlyingSymbol: 'FINNIFTY',
      snapshotAt,
      underlyingPrice: 22_010,
      strikeCount: 1,
    });

    expect(quotes).toHaveLength(2);
    expect(optionChainRepository.findAtmStrikes.mock.calls[0]).toEqual([
      underlyingInstrumentId,
      snapshotAt,
      expiryDate,
      22_010,
      1,
      undefined,
    ]);
  });

  it('returns delta-filtered rows', async () => {
    const { service, instrumentRepository, optionChainRepository } = createMocks();

    instrumentRepository.findBySymbol.mockResolvedValue({
      id: underlyingInstrumentId,
      symbol: 'NIFTY',
    });
    optionChainRepository.findByDeltaRange.mockResolvedValue([
      createDbRow({ delta: -0.2, optionType: 'PE' }),
    ]);

    const quotes = await service.getByDeltaRange({
      underlyingSymbol: 'NIFTY',
      snapshotAt,
      minDelta: -0.25,
      maxDelta: -0.15,
      optionType: 'PE',
    });

    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.delta).toBe(-0.2);
  });

  it('throws when nearest expiry chain is missing', async () => {
    const { service, instrumentRepository, optionChainRepository } = createMocks();

    instrumentRepository.findBySymbol.mockResolvedValue({
      id: underlyingInstrumentId,
      symbol: 'NIFTY',
    });
    optionChainRepository.findNearestExpiryDate.mockResolvedValue(null);

    await expect(
      service.getNearestExpiryChain({ underlyingSymbol: 'NIFTY', snapshotAt }),
    ).rejects.toThrow(OptionChainNotFoundError);
  });

  it('rejects invalid delta query range', async () => {
    const { service } = createMocks();

    await expect(
      service.getByDeltaRange({
        underlyingSymbol: 'NIFTY',
        snapshotAt,
        minDelta: 0.5,
        maxDelta: 0.1,
      }),
    ).rejects.toThrow(InvalidImportRequestError);
  });
});
