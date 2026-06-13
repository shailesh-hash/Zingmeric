import type { OptionChainRowImportDto } from '../../src/market-data/dto/option-chain-import.dto.js';
import {
  deduplicateOptionChainRows,
  toOptionChainRowKey,
  validateOptionChainRow,
} from '../../src/market-data/validation/option-chain.validator.js';

function validRow(overrides: Partial<OptionChainRowImportDto> = {}): OptionChainRowImportDto {
  return {
    snapshotAt: new Date('2024-01-15T09:15:00.000Z'),
    expiryDate: new Date('2024-01-25T00:00:00.000Z'),
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

describe('validateOptionChainRow', () => {
  it('accepts a valid row', () => {
    expect(validateOptionChainRow(validRow())).toBeNull();
  });

  it('rejects invalid snapshotAt', () => {
    expect(validateOptionChainRow(validRow({ snapshotAt: new Date(NaN) }))).toBe(
      'snapshotAt must be a valid Date',
    );
  });

  it('rejects expiry before snapshot', () => {
    expect(
      validateOptionChainRow(
        validRow({
          snapshotAt: new Date('2024-01-25T00:00:00.000Z'),
          expiryDate: new Date('2024-01-15T00:00:00.000Z'),
        }),
      ),
    ).toBe('expiryDate must be on or after snapshotAt');
  });

  it('rejects non-positive strike', () => {
    expect(validateOptionChainRow(validRow({ strikePrice: 0 }))).toBe(
      'strikePrice must be a positive number',
    );
  });

  it('rejects negative bid', () => {
    expect(validateOptionChainRow(validRow({ bid: -1 }))).toBe(
      'bid must be a non-negative number when provided',
    );
  });
});

describe('deduplicateOptionChainRows', () => {
  it('deduplicates rows by snapshot, expiry, strike, and option type', () => {
    const row = validRow();
    const duplicate = validRow({ lastPrice: 999 });

    const result = deduplicateOptionChainRows([row, duplicate, validRow({ strikePrice: 22_100 })]);

    expect(result.unique).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
    expect(result.unique[1]?.strikePrice).toBe(22_100);
  });

  it('builds stable composite keys', () => {
    const row = validRow();
    expect(toOptionChainRowKey(row)).toBe(
      `${row.snapshotAt.getTime()}|${row.expiryDate.getTime()}|${row.strikePrice}|${row.optionType}`,
    );
  });
});
