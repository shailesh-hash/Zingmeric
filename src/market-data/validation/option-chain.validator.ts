import type { OptionType } from '@prisma/client';
import type { OptionChainRowImportDto } from '../dto/option-chain-import.dto.js';

export interface OptionChainRowKey {
  snapshotAt: Date;
  expiryDate: Date;
  strikePrice: number;
  optionType: OptionType;
}

export function validateOptionChainRow(row: OptionChainRowImportDto): string | null {
  if (!(row.snapshotAt instanceof Date) || Number.isNaN(row.snapshotAt.getTime())) {
    return 'snapshotAt must be a valid Date';
  }

  if (!(row.expiryDate instanceof Date) || Number.isNaN(row.expiryDate.getTime())) {
    return 'expiryDate must be a valid Date';
  }

  if (row.expiryDate.getTime() < row.snapshotAt.getTime()) {
    return 'expiryDate must be on or after snapshotAt';
  }

  if (!Number.isFinite(row.strikePrice) || row.strikePrice <= 0) {
    return 'strikePrice must be a positive number';
  }

  const optionalPrices: [string, number | null | undefined][] = [
    ['bid', row.bid],
    ['ask', row.ask],
    ['lastPrice', row.lastPrice],
  ];

  for (const [name, value] of optionalPrices) {
    if (value !== undefined && value !== null && (!Number.isFinite(value) || value < 0)) {
      return `${name} must be a non-negative number when provided`;
    }
  }

  if (row.volume !== undefined && (!Number.isFinite(row.volume) || row.volume < 0)) {
    return 'volume must be a non-negative number';
  }

  if (
    row.openInterest !== undefined &&
    (!Number.isFinite(row.openInterest) || row.openInterest < 0)
  ) {
    return 'openInterest must be a non-negative number';
  }

  if (
    row.impliedVolatility !== undefined &&
    row.impliedVolatility !== null &&
    (!Number.isFinite(row.impliedVolatility) || row.impliedVolatility < 0)
  ) {
    return 'impliedVolatility must be a non-negative number when provided';
  }

  if (row.delta !== undefined && row.delta !== null && !Number.isFinite(row.delta)) {
    return 'delta must be a finite number when provided';
  }

  return null;
}

export function toOptionChainRowKey(row: OptionChainRowKey): string {
  return [row.snapshotAt.getTime(), row.expiryDate.getTime(), row.strikePrice, row.optionType].join(
    '|',
  );
}

export function deduplicateOptionChainRows(rows: OptionChainRowImportDto[]): {
  unique: OptionChainRowImportDto[];
  duplicateCount: number;
} {
  const seen = new Map<string, OptionChainRowImportDto>();

  for (const row of rows) {
    seen.set(toOptionChainRowKey(row), row);
  }

  const unique = [...seen.values()].sort((left, right) => {
    const snapshotDiff = left.snapshotAt.getTime() - right.snapshotAt.getTime();
    if (snapshotDiff !== 0) {
      return snapshotDiff;
    }

    const expiryDiff = left.expiryDate.getTime() - right.expiryDate.getTime();
    if (expiryDiff !== 0) {
      return expiryDiff;
    }

    const strikeDiff = left.strikePrice - right.strikePrice;
    if (strikeDiff !== 0) {
      return strikeDiff;
    }

    return left.optionType.localeCompare(right.optionType);
  });

  return {
    unique,
    duplicateCount: rows.length - unique.length,
  };
}
