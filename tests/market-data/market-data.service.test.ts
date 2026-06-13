import { jest } from '@jest/globals';
import { PriceInterval } from '@prisma/client';
import type {
  BulkCandleImportRequestDto,
  CandleImportDto,
} from '../../src/market-data/dto/candle-import.dto.js';
import {
  InstrumentNotFoundError,
  InvalidImportRequestError,
} from '../../src/market-data/errors/market-data.errors.js';
import type {
  HistoricalPriceRecord,
  HistoricalPriceRepository,
} from '../../src/market-data/repository/historical-price.repository.js';
import type { InstrumentRepository } from '../../src/market-data/repository/instrument.repository.js';
import { MarketDataService } from '../../src/market-data/service/market-data.service.js';

const instrumentId = 'inst-nifty';

function validCandle(overrides: Partial<CandleImportDto> = {}): CandleImportDto {
  return {
    timestamp: new Date('2024-01-15T09:15:00.000Z'),
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1000,
    ...overrides,
  };
}

function createMocks() {
  const instrumentRepository: jest.Mocked<InstrumentRepository> = {
    findById: jest.fn(),
  };

  const historicalPriceRepository: jest.Mocked<HistoricalPriceRepository> = {
    findExistingTimestamps: jest.fn(),
    createMany: jest.fn(),
  };

  const service = new MarketDataService(instrumentRepository, historicalPriceRepository);

  return { service, instrumentRepository, historicalPriceRepository };
}

function getCreateManyCallRecords(
  historicalPriceRepository: jest.Mocked<HistoricalPriceRepository>,
): HistoricalPriceRecord[] {
  const calls = historicalPriceRepository.createMany.mock.calls;
  if (calls.length === 0) {
    return [];
  }
  return calls[0][0];
}

describe('MarketDataService', () => {
  const request: BulkCandleImportRequestDto = {
    instrumentId,
    interval: PriceInterval.MINUTE_1,
    candles: [validCandle(), validCandle({ timestamp: new Date('2024-01-15T09:16:00.000Z') })],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when instrumentId is missing', async () => {
    const { service } = createMocks();

    await expect(
      service.importHistoricalCandles({ ...request, instrumentId: '  ' }),
    ).rejects.toThrow(InvalidImportRequestError);
  });

  it('throws when candles array is empty', async () => {
    const { service } = createMocks();

    await expect(service.importHistoricalCandles({ ...request, candles: [] })).rejects.toThrow(
      InvalidImportRequestError,
    );
  });

  it('throws when instrument does not exist', async () => {
    const { service, instrumentRepository } = createMocks();
    instrumentRepository.findById.mockResolvedValue(null);

    await expect(service.importHistoricalCandles(request)).rejects.toThrow(InstrumentNotFoundError);
  });

  it('imports valid candles in bulk', async () => {
    const { service, instrumentRepository, historicalPriceRepository } = createMocks();

    instrumentRepository.findById.mockResolvedValue({ id: instrumentId, symbol: 'NIFTY' });
    historicalPriceRepository.findExistingTimestamps.mockResolvedValue([]);
    historicalPriceRepository.createMany.mockResolvedValue(2);

    const result = await service.importHistoricalCandles(request);

    expect(result).toEqual({
      instrumentId,
      interval: PriceInterval.MINUTE_1,
      requested: 2,
      imported: 2,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: [],
    });

    expect(historicalPriceRepository.createMany.mock.calls).toHaveLength(1);
    expect(getCreateManyCallRecords(historicalPriceRepository)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instrumentId,
          interval: PriceInterval.MINUTE_1,
          open: 100,
          volume: 1000n,
        }),
      ]),
    );
  });

  it('skips duplicates within the batch and in the database', async () => {
    const { service, instrumentRepository, historicalPriceRepository } = createMocks();
    const duplicateTimestamp = new Date('2024-01-15T09:15:00.000Z');

    instrumentRepository.findById.mockResolvedValue({ id: instrumentId, symbol: 'NIFTY' });
    historicalPriceRepository.findExistingTimestamps.mockResolvedValue([
      new Date('2024-01-15T09:16:00.000Z'),
    ]);
    historicalPriceRepository.createMany.mockResolvedValue(1);

    const result = await service.importHistoricalCandles({
      ...request,
      candles: [
        validCandle({ timestamp: duplicateTimestamp, close: 100 }),
        validCandle({ timestamp: duplicateTimestamp, close: 101 }),
        validCandle({ timestamp: new Date('2024-01-15T09:16:00.000Z') }),
        validCandle({ timestamp: new Date('2024-01-15T09:17:00.000Z') }),
      ],
    });

    expect(result.requested).toBe(4);
    expect(result.imported).toBe(1);
    expect(result.skippedDuplicates).toBe(2);
    expect(result.skippedInvalid).toBe(0);
    expect(getCreateManyCallRecords(historicalPriceRepository)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          timestamp: new Date('2024-01-15T09:17:00.000Z'),
        }),
      ]),
    );
  });

  it('reports invalid candles without importing them', async () => {
    const { service, instrumentRepository, historicalPriceRepository } = createMocks();

    instrumentRepository.findById.mockResolvedValue({ id: instrumentId, symbol: 'NIFTY' });
    historicalPriceRepository.findExistingTimestamps.mockResolvedValue([]);
    historicalPriceRepository.createMany.mockResolvedValue(1);

    const invalidTimestamp = new Date('2024-01-15T09:17:00.000Z');
    const result = await service.importHistoricalCandles({
      ...request,
      candles: [validCandle(), validCandle({ timestamp: invalidTimestamp, high: 90, low: 95 })],
    });

    expect(result.requested).toBe(2);
    expect(result.imported).toBe(1);
    expect(result.skippedInvalid).toBe(1);
    expect(result.errors).toEqual([
      {
        timestamp: invalidTimestamp,
        message: 'high must be greater than or equal to low',
      },
    ]);
    expect(getCreateManyCallRecords(historicalPriceRepository)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ timestamp: request.candles[0]?.timestamp }),
      ]),
    );
  });

  it('does not call createMany when all candles are duplicates or invalid', async () => {
    const { service, instrumentRepository, historicalPriceRepository } = createMocks();
    const timestamp = new Date('2024-01-15T09:15:00.000Z');

    instrumentRepository.findById.mockResolvedValue({ id: instrumentId, symbol: 'NIFTY' });
    historicalPriceRepository.findExistingTimestamps.mockResolvedValue([timestamp]);

    const result = await service.importHistoricalCandles({
      ...request,
      candles: [validCandle({ timestamp }), validCandle({ timestamp, high: 90, low: 95 })],
    });

    expect(result.imported).toBe(0);
    expect(result.skippedDuplicates).toBe(1);
    expect(result.skippedInvalid).toBe(1);
    expect(historicalPriceRepository.createMany.mock.calls).toHaveLength(0);
  });

  it('maps optional open interest to bigint', async () => {
    const { service, instrumentRepository, historicalPriceRepository } = createMocks();

    instrumentRepository.findById.mockResolvedValue({ id: instrumentId, symbol: 'NIFTY' });
    historicalPriceRepository.findExistingTimestamps.mockResolvedValue([]);
    historicalPriceRepository.createMany.mockImplementation((records: HistoricalPriceRecord[]) => {
      expect(records[0]?.openInterest).toBe(500n);
      return Promise.resolve(records.length);
    });

    await service.importHistoricalCandles({
      instrumentId,
      interval: PriceInterval.DAY_1,
      candles: [validCandle({ openInterest: 500 })],
    });
  });
});
