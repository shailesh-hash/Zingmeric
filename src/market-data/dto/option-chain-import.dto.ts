import type { OptionType } from '@prisma/client';
import type { SupportedOptionUnderlying } from '../constants/underlying-symbols.js';

export interface OptionChainRowImportDto {
  snapshotAt: Date;
  expiryDate: Date;
  strikePrice: number;
  optionType: OptionType;
  bid?: number | null;
  ask?: number | null;
  lastPrice?: number | null;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number | null;
  delta?: number | null;
  contractInstrumentId?: string | null;
}

export interface BulkOptionChainImportRequestDto {
  underlyingSymbol: SupportedOptionUnderlying;
  rows: OptionChainRowImportDto[];
}

export interface OptionChainImportValidationErrorDto {
  snapshotAt: Date;
  expiryDate: Date;
  strikePrice: number;
  optionType: OptionType;
  message: string;
}

export interface ImportOptionChainResultDto {
  underlyingSymbol: SupportedOptionUnderlying;
  underlyingInstrumentId: string;
  requested: number;
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  errors: OptionChainImportValidationErrorDto[];
}
