import type { PriceInterval } from '@prisma/client';

export interface CandleImportDto {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  openInterest?: number;
}

export interface BulkCandleImportRequestDto {
  instrumentId: string;
  interval: PriceInterval;
  candles: CandleImportDto[];
}

export interface ImportValidationErrorDto {
  timestamp: Date;
  message: string;
}

export interface ImportHistoricalCandlesResultDto {
  instrumentId: string;
  interval: PriceInterval;
  requested: number;
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  errors: ImportValidationErrorDto[];
}
