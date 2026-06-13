import type { CandleImportDto } from '../dto/candle-import.dto.js';

export function validateCandle(candle: CandleImportDto): string | null {
  if (!(candle.timestamp instanceof Date) || Number.isNaN(candle.timestamp.getTime())) {
    return 'timestamp must be a valid Date';
  }

  const fields: [string, number][] = [
    ['open', candle.open],
    ['high', candle.high],
    ['low', candle.low],
    ['close', candle.close],
  ];

  for (const [name, value] of fields) {
    if (!Number.isFinite(value) || value < 0) {
      return `${name} must be a non-negative number`;
    }
  }

  if (candle.high < candle.low) {
    return 'high must be greater than or equal to low';
  }

  if (candle.high < candle.open || candle.high < candle.close) {
    return 'high must be greater than or equal to open and close';
  }

  if (candle.low > candle.open || candle.low > candle.close) {
    return 'low must be less than or equal to open and close';
  }

  if (candle.volume !== undefined && (!Number.isFinite(candle.volume) || candle.volume < 0)) {
    return 'volume must be a non-negative number';
  }

  if (
    candle.openInterest !== undefined &&
    (!Number.isFinite(candle.openInterest) || candle.openInterest < 0)
  ) {
    return 'openInterest must be a non-negative number';
  }

  return null;
}

export function deduplicateCandles(candles: CandleImportDto[]): {
  unique: CandleImportDto[];
  duplicateCount: number;
} {
  const seen = new Map<number, CandleImportDto>();

  for (const candle of candles) {
    seen.set(candle.timestamp.getTime(), candle);
  }

  const unique = [...seen.values()].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    unique,
    duplicateCount: candles.length - unique.length,
  };
}
