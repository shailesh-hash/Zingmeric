import type { CandleImportDto } from '../../src/market-data/dto/candle-import.dto.js';
import {
  deduplicateCandles,
  validateCandle,
} from '../../src/market-data/validation/candle.validator.js';

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

describe('validateCandle', () => {
  it('accepts a valid OHLCV candle', () => {
    expect(validateCandle(validCandle())).toBeNull();
  });

  it('rejects invalid timestamp', () => {
    expect(validateCandle(validCandle({ timestamp: new Date('invalid') }))).toBe(
      'timestamp must be a valid Date',
    );
  });

  it('rejects negative prices', () => {
    expect(validateCandle(validCandle({ open: -1 }))).toBe('open must be a non-negative number');
  });

  it('rejects high below low', () => {
    expect(validateCandle(validCandle({ high: 90, low: 95 }))).toBe(
      'high must be greater than or equal to low',
    );
  });

  it('rejects high below open or close', () => {
    expect(validateCandle(validCandle({ high: 104, close: 105 }))).toBe(
      'high must be greater than or equal to open and close',
    );
  });

  it('rejects low above open or close', () => {
    expect(validateCandle(validCandle({ low: 106, close: 105 }))).toBe(
      'low must be less than or equal to open and close',
    );
  });

  it('rejects negative volume', () => {
    expect(validateCandle(validCandle({ volume: -1 }))).toBe(
      'volume must be a non-negative number',
    );
  });

  it('rejects negative open interest', () => {
    expect(validateCandle(validCandle({ openInterest: -10 }))).toBe(
      'openInterest must be a non-negative number',
    );
  });
});

describe('deduplicateCandles', () => {
  it('removes duplicate timestamps within a batch', () => {
    const timestamp = new Date('2024-01-15T09:15:00.000Z');
    const first = validCandle({ timestamp, close: 100 });
    const duplicate = validCandle({ timestamp, close: 101 });
    const other = validCandle({ timestamp: new Date('2024-01-15T09:16:00.000Z') });

    const result = deduplicateCandles([first, duplicate, other]);

    expect(result.duplicateCount).toBe(1);
    expect(result.unique).toHaveLength(2);
    expect(result.unique[0]?.close).toBe(101);
    expect(result.unique[1]?.timestamp.toISOString()).toBe('2024-01-15T09:16:00.000Z');
  });

  it('returns empty unique list for empty input', () => {
    const result = deduplicateCandles([]);

    expect(result.unique).toEqual([]);
    expect(result.duplicateCount).toBe(0);
  });
});
