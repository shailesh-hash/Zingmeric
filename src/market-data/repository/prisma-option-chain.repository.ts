import type { OptionType, PrismaClient } from '@prisma/client';
import {
  OPTION_CHAIN_BATCH_SIZE,
  OPTION_CHAIN_EXISTING_LOOKUP_BATCH_SIZE,
  type OptionChainDbRow,
  type OptionChainRecord,
  type OptionChainRepository,
  type OptionChainRowIdentity,
} from './option-chain.repository.js';

function toDbRow(row: {
  id: string;
  underlyingInstrumentId: string;
  contractInstrumentId: string | null;
  snapshotAt: Date;
  expiryDate: Date;
  strikePrice: { toNumber(): number };
  optionType: OptionType;
  bid: { toNumber(): number } | null;
  ask: { toNumber(): number } | null;
  lastPrice: { toNumber(): number } | null;
  volume: bigint;
  openInterest: bigint;
  impliedVolatility: { toNumber(): number } | null;
  delta: { toNumber(): number } | null;
}): OptionChainDbRow {
  return {
    id: row.id,
    underlyingInstrumentId: row.underlyingInstrumentId,
    contractInstrumentId: row.contractInstrumentId,
    snapshotAt: row.snapshotAt,
    expiryDate: row.expiryDate,
    strikePrice: row.strikePrice.toNumber(),
    optionType: row.optionType,
    bid: row.bid?.toNumber() ?? null,
    ask: row.ask?.toNumber() ?? null,
    lastPrice: row.lastPrice?.toNumber() ?? null,
    volume: row.volume,
    openInterest: row.openInterest,
    impliedVolatility: row.impliedVolatility?.toNumber() ?? null,
    delta: row.delta?.toNumber() ?? null,
  };
}

export class PrismaOptionChainRepository implements OptionChainRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findExistingIdentities(
    identities: OptionChainRowIdentity[],
  ): Promise<OptionChainRowIdentity[]> {
    if (identities.length === 0) {
      return [];
    }

    const existing: OptionChainRowIdentity[] = [];

    for (
      let offset = 0;
      offset < identities.length;
      offset += OPTION_CHAIN_EXISTING_LOOKUP_BATCH_SIZE
    ) {
      const batch = identities.slice(offset, offset + OPTION_CHAIN_EXISTING_LOOKUP_BATCH_SIZE);
      const rows = await this.prisma.optionChain.findMany({
        where: {
          OR: batch.map((identity) => ({
            underlyingInstrumentId: identity.underlyingInstrumentId,
            snapshotAt: identity.snapshotAt,
            expiryDate: identity.expiryDate,
            strikePrice: identity.strikePrice,
            optionType: identity.optionType,
          })),
        },
        select: {
          underlyingInstrumentId: true,
          snapshotAt: true,
          expiryDate: true,
          strikePrice: true,
          optionType: true,
        },
      });

      for (const row of rows) {
        existing.push({
          underlyingInstrumentId: row.underlyingInstrumentId,
          snapshotAt: row.snapshotAt,
          expiryDate: row.expiryDate,
          strikePrice: row.strikePrice.toNumber(),
          optionType: row.optionType,
        });
      }
    }

    return existing;
  }

  async createMany(records: OptionChainRecord[]): Promise<number> {
    if (records.length === 0) {
      return 0;
    }

    let imported = 0;

    for (let offset = 0; offset < records.length; offset += OPTION_CHAIN_BATCH_SIZE) {
      const batch = records.slice(offset, offset + OPTION_CHAIN_BATCH_SIZE);
      const result = await this.prisma.optionChain.createMany({
        data: batch.map((record) => ({
          underlyingInstrumentId: record.underlyingInstrumentId,
          contractInstrumentId: record.contractInstrumentId ?? null,
          snapshotAt: record.snapshotAt,
          expiryDate: record.expiryDate,
          strikePrice: record.strikePrice,
          optionType: record.optionType,
          bid: record.bid ?? null,
          ask: record.ask ?? null,
          lastPrice: record.lastPrice ?? null,
          volume: record.volume,
          openInterest: record.openInterest,
          impliedVolatility: record.impliedVolatility ?? null,
          delta: record.delta ?? null,
        })),
        skipDuplicates: true,
      });

      imported += result.count;
    }

    return imported;
  }

  async findNearestExpiryDate(
    underlyingInstrumentId: string,
    snapshotAt: Date,
  ): Promise<Date | null> {
    const row = await this.prisma.optionChain.findFirst({
      where: {
        underlyingInstrumentId,
        snapshotAt,
        expiryDate: { gte: snapshotAt },
      },
      orderBy: { expiryDate: 'asc' },
      select: { expiryDate: true },
    });

    return row?.expiryDate ?? null;
  }

  async findBySnapshotAndExpiry(
    underlyingInstrumentId: string,
    snapshotAt: Date,
    expiryDate: Date,
    optionType?: OptionType,
  ): Promise<OptionChainDbRow[]> {
    const rows = await this.prisma.optionChain.findMany({
      where: {
        underlyingInstrumentId,
        snapshotAt,
        expiryDate,
        ...(optionType ? { optionType } : {}),
      },
      orderBy: [{ strikePrice: 'asc' }, { optionType: 'asc' }],
    });

    return rows.map(toDbRow);
  }

  async findAtmStrikes(
    underlyingInstrumentId: string,
    snapshotAt: Date,
    expiryDate: Date,
    underlyingPrice: number,
    strikeCount: number,
    optionType?: OptionType,
  ): Promise<OptionChainDbRow[]> {
    const rows = await this.prisma.optionChain.findMany({
      where: {
        underlyingInstrumentId,
        snapshotAt,
        expiryDate,
        ...(optionType ? { optionType } : {}),
      },
      orderBy: { strikePrice: 'asc' },
    });

    const mapped = rows.map(toDbRow);
    const strikes = [...new Set(mapped.map((row) => row.strikePrice))].sort(
      (left, right) => Math.abs(left - underlyingPrice) - Math.abs(right - underlyingPrice),
    );

    const selectedStrikes = new Set(strikes.slice(0, Math.max(strikeCount, 1)));

    return mapped
      .filter((row) => selectedStrikes.has(row.strikePrice))
      .sort(
        (left, right) =>
          left.strikePrice - right.strikePrice || left.optionType.localeCompare(right.optionType),
      );
  }

  async findByDeltaRange(
    underlyingInstrumentId: string,
    snapshotAt: Date,
    minDelta: number,
    maxDelta: number,
    expiryDate?: Date,
    optionType?: OptionType,
    limit = 100,
  ): Promise<OptionChainDbRow[]> {
    const rows = await this.prisma.optionChain.findMany({
      where: {
        underlyingInstrumentId,
        snapshotAt,
        delta: {
          gte: minDelta,
          lte: maxDelta,
        },
        ...(expiryDate ? { expiryDate } : {}),
        ...(optionType ? { optionType } : {}),
      },
      orderBy: [{ delta: 'asc' }, { strikePrice: 'asc' }],
      take: limit,
    });

    return rows.map(toDbRow);
  }
}
