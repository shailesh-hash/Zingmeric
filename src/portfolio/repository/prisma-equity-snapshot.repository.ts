import type { PrismaClient } from '@prisma/client';
import type { EquitySnapshotQueryDto } from '../dto/equity-snapshot.dto.js';
import {
  EQUITY_SNAPSHOT_BATCH_SIZE,
  type EquitySnapshotRecord,
  type EquitySnapshotRepository,
  type EquitySnapshotRow,
} from './equity-snapshot.repository.js';

function toRow(record: {
  id: string;
  portfolioId: string;
  backtestRunId: string | null;
  timestamp: Date;
  cashBalance: { toNumber(): number };
  portfolioValue: { toNumber(): number };
  realizedPnl: { toNumber(): number };
  unrealizedPnl: { toNumber(): number };
  drawdown: { toNumber(): number };
  createdAt: Date;
}): EquitySnapshotRow {
  return {
    id: record.id,
    portfolioId: record.portfolioId,
    backtestRunId: record.backtestRunId,
    timestamp: record.timestamp,
    cashBalance: record.cashBalance.toNumber(),
    portfolioValue: record.portfolioValue.toNumber(),
    realizedPnl: record.realizedPnl.toNumber(),
    unrealizedPnl: record.unrealizedPnl.toNumber(),
    drawdown: record.drawdown.toNumber(),
    createdAt: record.createdAt,
  };
}

function buildWhere(query: EquitySnapshotQueryDto) {
  return {
    ...(query.portfolioId ? { portfolioId: query.portfolioId } : {}),
    ...(query.backtestRunId ? { backtestRunId: query.backtestRunId } : {}),
    ...(query.from || query.to
      ? {
          timestamp: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };
}

export class PrismaEquitySnapshotRepository implements EquitySnapshotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: EquitySnapshotRecord): Promise<EquitySnapshotRow> {
    const created = await this.prisma.equitySnapshot.create({
      data: {
        portfolioId: record.portfolioId,
        backtestRunId: record.backtestRunId ?? null,
        timestamp: record.timestamp,
        cashBalance: record.cashBalance,
        portfolioValue: record.portfolioValue,
        realizedPnl: record.realizedPnl,
        unrealizedPnl: record.unrealizedPnl,
        drawdown: record.drawdown,
      },
    });

    return toRow(created);
  }

  async createMany(records: EquitySnapshotRecord[]): Promise<number> {
    if (records.length === 0) {
      return 0;
    }

    let imported = 0;

    for (let offset = 0; offset < records.length; offset += EQUITY_SNAPSHOT_BATCH_SIZE) {
      const batch = records.slice(offset, offset + EQUITY_SNAPSHOT_BATCH_SIZE);
      const result = await this.prisma.equitySnapshot.createMany({
        data: batch.map((record) => ({
          portfolioId: record.portfolioId,
          backtestRunId: record.backtestRunId ?? null,
          timestamp: record.timestamp,
          cashBalance: record.cashBalance,
          portfolioValue: record.portfolioValue,
          realizedPnl: record.realizedPnl,
          unrealizedPnl: record.unrealizedPnl,
          drawdown: record.drawdown,
        })),
        skipDuplicates: true,
      });

      imported += result.count;
    }

    return imported;
  }

  async findMany(query: EquitySnapshotQueryDto): Promise<EquitySnapshotRow[]> {
    const rows = await this.prisma.equitySnapshot.findMany({
      where: buildWhere(query),
      orderBy: { timestamp: 'asc' },
    });

    return rows.map(toRow);
  }

  async findPeakPortfolioValue(
    portfolioId: string,
    beforeTimestamp?: Date,
  ): Promise<number | null> {
    const aggregate = await this.prisma.equitySnapshot.aggregate({
      where: {
        portfolioId,
        ...(beforeTimestamp ? { timestamp: { lt: beforeTimestamp } } : {}),
      },
      _max: { portfolioValue: true },
    });

    return aggregate._max.portfolioValue?.toNumber() ?? null;
  }

  async deleteByBacktestRunId(backtestRunId: string): Promise<number> {
    const result = await this.prisma.equitySnapshot.deleteMany({
      where: { backtestRunId },
    });

    return result.count;
  }

  async deleteByPortfolioId(portfolioId: string): Promise<number> {
    const result = await this.prisma.equitySnapshot.deleteMany({
      where: { portfolioId },
    });

    return result.count;
  }
}
