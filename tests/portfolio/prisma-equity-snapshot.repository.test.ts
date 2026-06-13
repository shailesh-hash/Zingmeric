import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { PrismaEquitySnapshotRepository } from '../../src/portfolio/repository/prisma-equity-snapshot.repository.js';

function decimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function createPrismaMock() {
  return {
    equitySnapshot: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

describe('PrismaEquitySnapshotRepository', () => {
  it('creates a snapshot record', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaEquitySnapshotRepository(prisma as never);

    prisma.equitySnapshot.create.mockResolvedValue({
      id: 'snapshot-1',
      portfolioId: 'portfolio-1',
      backtestRunId: 'backtest-1',
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      cashBalance: decimal(100_000),
      portfolioValue: decimal(100_000),
      realizedPnl: decimal(0),
      unrealizedPnl: decimal(0),
      drawdown: decimal(0),
      createdAt: new Date('2024-01-15T09:15:00.000Z'),
    });

    const row = await repository.create({
      portfolioId: 'portfolio-1',
      backtestRunId: 'backtest-1',
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      cashBalance: 100_000,
      portfolioValue: 100_000,
      realizedPnl: 0,
      unrealizedPnl: 0,
      drawdown: 0,
    });

    expect(row.portfolioValue).toBe(100_000);
    expect(prisma.equitySnapshot.create).toHaveBeenCalledTimes(1);
    const createArgs = prisma.equitySnapshot.create.mock.calls[0]?.[0] as {
      data: { portfolioId: string; backtestRunId: string };
    };
    expect(createArgs.data.portfolioId).toBe('portfolio-1');
    expect(createArgs.data.backtestRunId).toBe('backtest-1');
  });

  it('imports snapshots in batches', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaEquitySnapshotRepository(prisma as never);

    prisma.equitySnapshot.createMany.mockResolvedValue({ count: 2 });

    const imported = await repository.createMany([
      {
        portfolioId: 'portfolio-1',
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        cashBalance: 100_000,
        portfolioValue: 100_000,
        realizedPnl: 0,
        unrealizedPnl: 0,
        drawdown: 0,
      },
      {
        portfolioId: 'portfolio-1',
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        cashBalance: 99_000,
        portfolioValue: 99_000,
        realizedPnl: 0,
        unrealizedPnl: 0,
        drawdown: 0.01,
      },
    ]);

    expect(imported).toBe(2);
    expect(prisma.equitySnapshot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it('queries snapshots by portfolio and time range', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaEquitySnapshotRepository(prisma as never);
    const from = new Date('2024-01-01T00:00:00.000Z');
    const to = new Date('2024-01-31T00:00:00.000Z');

    prisma.equitySnapshot.findMany.mockResolvedValue([
      {
        id: 'snapshot-1',
        portfolioId: 'portfolio-1',
        backtestRunId: null,
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        cashBalance: decimal(100_000),
        portfolioValue: decimal(100_000),
        realizedPnl: decimal(0),
        unrealizedPnl: decimal(0),
        drawdown: decimal(0),
        createdAt: new Date('2024-01-15T09:15:00.000Z'),
      },
    ]);

    const rows = await repository.findMany({
      portfolioId: 'portfolio-1',
      from,
      to,
    });

    expect(rows).toHaveLength(1);
    expect(prisma.equitySnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          portfolioId: 'portfolio-1',
          timestamp: { gte: from, lte: to },
        },
        orderBy: { timestamp: 'asc' },
      }),
    );
  });

  it('finds peak portfolio value for drawdown tracking', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaEquitySnapshotRepository(prisma as never);

    prisma.equitySnapshot.aggregate.mockResolvedValue({
      _max: { portfolioValue: decimal(110_000) },
    });

    const peak = await repository.findPeakPortfolioValue('portfolio-1');

    expect(peak).toBe(110_000);
  });

  it('deletes snapshots by backtest run id', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaEquitySnapshotRepository(prisma as never);

    prisma.equitySnapshot.deleteMany.mockResolvedValue({ count: 5 });

    const deleted = await repository.deleteByBacktestRunId('backtest-1');

    expect(deleted).toBe(5);
    expect(prisma.equitySnapshot.deleteMany).toHaveBeenCalledWith({
      where: { backtestRunId: 'backtest-1' },
    });
  });
});
