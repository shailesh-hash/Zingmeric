import { jest } from '@jest/globals';
import { InvalidEquitySnapshotError } from '../../src/portfolio/errors/equity-curve.errors.js';
import type {
  EquitySnapshotRepository,
  EquitySnapshotRow,
} from '../../src/portfolio/repository/equity-snapshot.repository.js';
import { EquityCurveService } from '../../src/portfolio/service/equity-curve.service.js';

const portfolioId = 'portfolio-1';
const backtestRunId = 'backtest-1';

function createRow(overrides: Partial<EquitySnapshotRow> = {}): EquitySnapshotRow {
  return {
    id: overrides.id ?? 'snapshot-1',
    portfolioId: overrides.portfolioId ?? portfolioId,
    backtestRunId: overrides.backtestRunId ?? backtestRunId,
    timestamp: overrides.timestamp ?? new Date('2024-01-15T09:15:00.000Z'),
    cashBalance: overrides.cashBalance ?? 100_000,
    portfolioValue: overrides.portfolioValue ?? 100_000,
    realizedPnl: overrides.realizedPnl ?? 0,
    unrealizedPnl: overrides.unrealizedPnl ?? 0,
    drawdown: overrides.drawdown ?? 0,
    createdAt: overrides.createdAt ?? new Date('2024-01-15T09:15:00.000Z'),
  };
}

function createMocks() {
  const repository: jest.Mocked<EquitySnapshotRepository> = {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findPeakPortfolioValue: jest.fn(),
    deleteByBacktestRunId: jest.fn(),
    deleteByPortfolioId: jest.fn(),
  };

  const service = new EquityCurveService(repository);

  return { service, repository };
}

describe('EquityCurveService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records a snapshot with zero drawdown at a new peak', async () => {
    const { service, repository } = createMocks();

    repository.findPeakPortfolioValue.mockResolvedValue(null);
    repository.create.mockResolvedValue(
      createRow({
        id: 'snapshot-new',
        portfolioId,
        backtestRunId,
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        cashBalance: 100_000,
        portfolioValue: 100_000,
        drawdown: 0,
      }),
    );

    const result = await service.recordSnapshot({
      portfolioId,
      backtestRunId,
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      cashBalance: 100_000,
      realizedPnl: 0,
      unrealizedPnl: 0,
    });

    expect(result.snapshot.drawdown).toBe(0);
    expect(result.peakPortfolioValue).toBe(100_000);
    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        portfolioValue: 100_000,
        drawdown: 0,
      }),
    );
  });

  it('computes drawdown when portfolio value falls below peak', async () => {
    const { service, repository } = createMocks();

    repository.findPeakPortfolioValue.mockResolvedValue(100_000);
    repository.create.mockResolvedValue(
      createRow({
        portfolioValue: 92_000,
        drawdown: 0.08,
        cashBalance: 92_000,
        realizedPnl: -5_000,
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
      }),
    );

    const result = await service.recordSnapshot({
      portfolioId,
      backtestRunId,
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
      cashBalance: 92_000,
      portfolioValue: 92_000,
      realizedPnl: -5_000,
      unrealizedPnl: 0,
    });

    expect(result.snapshot.drawdown).toBeCloseTo(0.08, 4);
    expect(result.peakPortfolioValue).toBe(100_000);
  });

  it('derives portfolioValue from cash and unrealized pnl when omitted', async () => {
    const { service, repository } = createMocks();

    repository.findPeakPortfolioValue.mockResolvedValue(null);
    repository.create.mockResolvedValue(createRow({ portfolioValue: 100_000 }));

    await service.recordSnapshot({
      portfolioId,
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      cashBalance: 95_000,
      realizedPnl: 0,
      unrealizedPnl: 5_000,
    });

    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        portfolioValue: 100_000,
      }),
    );
  });

  it('records snapshots in batch with running drawdown', async () => {
    const { service, repository } = createMocks();

    repository.findPeakPortfolioValue.mockResolvedValue(100_000);
    repository.createMany.mockResolvedValue(3);

    const count = await service.recordSnapshotsBatch([
      {
        portfolioId,
        backtestRunId,
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        cashBalance: 100_000,
        portfolioValue: 100_000,
        realizedPnl: 0,
        unrealizedPnl: 0,
      },
      {
        portfolioId,
        backtestRunId,
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        cashBalance: 95_000,
        portfolioValue: 95_000,
        realizedPnl: 0,
        unrealizedPnl: 0,
      },
      {
        portfolioId,
        backtestRunId,
        timestamp: new Date('2024-01-17T09:15:00.000Z'),
        cashBalance: 90_000,
        portfolioValue: 90_000,
        realizedPnl: 0,
        unrealizedPnl: 0,
      },
    ]);

    expect(count).toBe(3);
    expect(repository.createMany.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({ drawdown: 0 }),
      expect.objectContaining({ drawdown: 0.05 }),
      expect.objectContaining({ drawdown: 0.1 }),
    ]);
  });

  it('returns equity curve points ordered for visualization', async () => {
    const { service, repository } = createMocks();

    repository.findMany.mockResolvedValue([
      createRow({
        id: 's1',
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        portfolioValue: 100_000,
        cashBalance: 100_000,
      }),
      createRow({
        id: 's2',
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        portfolioValue: 105_000,
        cashBalance: 100_000,
        unrealizedPnl: 5_000,
      }),
    ]);

    const curve = await service.getEquityCurve({ backtestRunId });

    expect(curve).toHaveLength(2);
    expect(curve[0]?.equity).toBe(100_000);
    expect(curve[1]?.equity).toBe(105_000);
    expect(curve[1]?.positionValue).toBe(5_000);
  });

  it('computes metrics required for sharpe and max drawdown', async () => {
    const { service, repository } = createMocks();

    repository.findMany.mockResolvedValue([
      createRow({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        portfolioValue: 100_000,
        cashBalance: 100_000,
      }),
      createRow({
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        portfolioValue: 110_000,
        cashBalance: 110_000,
      }),
      createRow({
        timestamp: new Date('2024-01-17T09:15:00.000Z'),
        portfolioValue: 99_000,
        cashBalance: 99_000,
        drawdown: 0.1,
      }),
    ]);

    const metrics = await service.getMetrics({ backtestRunId });

    expect(metrics.snapshotCount).toBe(3);
    expect(metrics.initialPortfolioValue).toBe(100_000);
    expect(metrics.finalPortfolioValue).toBe(99_000);
    expect(metrics.periodReturns).toHaveLength(2);
    expect(metrics.maxDrawdown).toBeCloseTo(0.1, 4);
    expect(metrics.cagr).toBeLessThan(0);
    expect(metrics.sharpeRatio).toBeDefined();
    expect(metrics.sortinoRatio).toBeDefined();
  });

  it('rejects snapshots without portfolioId', async () => {
    const { service } = createMocks();

    await expect(
      service.recordSnapshot({
        portfolioId: '  ',
        timestamp: new Date(),
        cashBalance: 100_000,
        realizedPnl: 0,
        unrealizedPnl: 0,
      }),
    ).rejects.toThrow(InvalidEquitySnapshotError);
  });

  it('rejects queries without portfolio or backtest scope', async () => {
    const { service } = createMocks();

    await expect(service.getSnapshots({})).rejects.toThrow(InvalidEquitySnapshotError);
  });

  it('rejects mixed-portfolio batch recording', async () => {
    const { service } = createMocks();

    await expect(
      service.recordSnapshotsBatch([
        {
          portfolioId: 'portfolio-1',
          timestamp: new Date('2024-01-15T09:15:00.000Z'),
          cashBalance: 100_000,
          realizedPnl: 0,
          unrealizedPnl: 0,
        },
        {
          portfolioId: 'portfolio-2',
          timestamp: new Date('2024-01-16T09:15:00.000Z'),
          cashBalance: 100_000,
          realizedPnl: 0,
          unrealizedPnl: 0,
        },
      ]),
    ).rejects.toThrow(InvalidEquitySnapshotError);
  });
});
