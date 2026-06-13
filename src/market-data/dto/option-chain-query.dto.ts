import type { OptionType } from '@prisma/client';
import type { SupportedOptionUnderlying } from '../constants/underlying-symbols.js';

export interface OptionChainQuoteDto {
  id: string;
  underlyingInstrumentId: string;
  underlyingSymbol: string;
  snapshotAt: Date;
  expiryDate: Date;
  strikePrice: number;
  optionType: OptionType;
  bid: number | null;
  ask: number | null;
  lastPrice: number | null;
  volume: bigint;
  openInterest: bigint;
  impliedVolatility: number | null;
  delta: number | null;
  contractInstrumentId: string | null;
}

export interface OptionChainSnapshotQueryDto {
  underlyingSymbol: SupportedOptionUnderlying;
  snapshotAt: Date;
  optionType?: OptionType;
}

export type OptionChainNearestExpiryQueryDto = OptionChainSnapshotQueryDto;

export interface OptionChainSpecificExpiryQueryDto extends OptionChainSnapshotQueryDto {
  expiryDate: Date;
}

export interface OptionChainAtmQueryDto extends OptionChainSnapshotQueryDto {
  underlyingPrice: number;
  strikeCount?: number;
}

export interface OptionChainDeltaQueryDto extends OptionChainSnapshotQueryDto {
  expiryDate?: Date;
  minDelta: number;
  maxDelta: number;
  limit?: number;
}
