import type { OptionType } from '@prisma/client';

export interface OptionChainRecord {
  underlyingInstrumentId: string;
  contractInstrumentId?: string | null;
  snapshotAt: Date;
  expiryDate: Date;
  strikePrice: number;
  optionType: OptionType;
  bid?: number | null;
  ask?: number | null;
  lastPrice?: number | null;
  volume: bigint;
  openInterest: bigint;
  impliedVolatility?: number | null;
  delta?: number | null;
}

export interface OptionChainRowIdentity {
  underlyingInstrumentId: string;
  snapshotAt: Date;
  expiryDate: Date;
  strikePrice: number;
  optionType: OptionType;
}

export interface OptionChainDbRow extends OptionChainRecord {
  id: string;
}

export interface OptionChainRepository {
  findExistingIdentities(identities: OptionChainRowIdentity[]): Promise<OptionChainRowIdentity[]>;

  createMany(records: OptionChainRecord[]): Promise<number>;

  findNearestExpiryDate(underlyingInstrumentId: string, snapshotAt: Date): Promise<Date | null>;

  findBySnapshotAndExpiry(
    underlyingInstrumentId: string,
    snapshotAt: Date,
    expiryDate: Date,
    optionType?: OptionType,
  ): Promise<OptionChainDbRow[]>;

  findAtmStrikes(
    underlyingInstrumentId: string,
    snapshotAt: Date,
    expiryDate: Date,
    underlyingPrice: number,
    strikeCount: number,
    optionType?: OptionType,
  ): Promise<OptionChainDbRow[]>;

  findByDeltaRange(
    underlyingInstrumentId: string,
    snapshotAt: Date,
    minDelta: number,
    maxDelta: number,
    expiryDate?: Date,
    optionType?: OptionType,
    limit?: number,
  ): Promise<OptionChainDbRow[]>;
}

export const OPTION_CHAIN_BATCH_SIZE = 2000;
export const OPTION_CHAIN_EXISTING_LOOKUP_BATCH_SIZE = 500;
