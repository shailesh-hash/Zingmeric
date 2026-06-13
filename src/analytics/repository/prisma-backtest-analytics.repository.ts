import type { PrismaClient } from '@prisma/client';
import type { BacktestAnalyticsListQueryDto } from '../dto/backtest-analytics.dto.js';
import type {
  BacktestAnalyticsRepository,
  BacktestEquitySnapshotRecord,
  BacktestPortfolioRecord,
  BacktestPositionRecord,
  BacktestRunRecord,
  BacktestTradeRecord,
} from './backtest-analytics.repository.js';

function decimal(value: { toNumber(): number } | null | undefined): number | null {
  return value?.toNumber() ?? null;
}

function toRunRecord(record: {
  id: string;
  name: string;
  strategyName: string;
  status: string;
  startDate: Date;
  endDate: Date;
  initialCapital: { toNumber(): number };
  includeCosts: boolean;
  cagr: { toNumber(): number } | null;
  sharpeRatio: { toNumber(): number } | null;
  maxDrawdown: { toNumber(): number } | null;
  profitFactor: { toNumber(): number } | null;
  winRate: { toNumber(): number } | null;
  totalTrades: number | null;
  finalCapital: { toNumber(): number } | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  portfolio: { id: string } | null;
}): BacktestRunRecord {
  return {
    id: record.id,
    name: record.name,
    strategyName: record.strategyName,
    status: record.status,
    startDate: record.startDate,
    endDate: record.endDate,
    initialCapital: record.initialCapital.toNumber(),
    includeCosts: record.includeCosts,
    cagr: decimal(record.cagr),
    sharpeRatio: decimal(record.sharpeRatio),
    maxDrawdown: decimal(record.maxDrawdown),
    profitFactor: decimal(record.profitFactor),
    winRate: decimal(record.winRate),
    totalTrades: record.totalTrades,
    finalCapital: decimal(record.finalCapital),
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    portfolioId: record.portfolio?.id ?? null,
  };
}

export class PrismaBacktestAnalyticsRepository implements BacktestAnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(
    query: BacktestAnalyticsListQueryDto,
  ): Promise<{ items: BacktestRunRecord[]; total: number }> {
    const where = {
      ...(query.strategyName ? { strategyName: query.strategyName } : {}),
      ...(query.status ? { status: query.status as never } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.backtestRun.findMany({
        where,
        include: { portfolio: { select: { id: true } } },
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.backtestRun.count({ where }),
    ]);

    return {
      items: rows.map(toRunRecord),
      total,
    };
  }

  async findById(backtestRunId: string): Promise<BacktestRunRecord | null> {
    const row = await this.prisma.backtestRun.findUnique({
      where: { id: backtestRunId },
      include: { portfolio: { select: { id: true } } },
    });

    return row ? toRunRecord(row) : null;
  }

  async findTradesByBacktestRunId(backtestRunId: string): Promise<BacktestTradeRecord[]> {
    const rows = await this.prisma.trade.findMany({
      where: { backtestRunId },
      orderBy: { executedAt: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      side: row.side,
      quantity: row.quantity,
      price: row.price.toNumber(),
      strategyName: row.strategyName,
      legGroupId: row.legGroupId,
      brokerage: row.brokerage.toNumber(),
      stt: row.stt.toNumber(),
      exchangeCharges: row.exchangeCharges.toNumber(),
      slippage: row.slippage.toNumber(),
      totalFees: row.totalFees.toNumber(),
      executedAt: row.executedAt,
    }));
  }

  async findPositionsByBacktestRunId(backtestRunId: string): Promise<BacktestPositionRecord[]> {
    const rows = await this.prisma.position.findMany({
      where: { backtestRunId },
      orderBy: { openedAt: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      quantity: row.quantity,
      averagePrice: row.averagePrice.toNumber(),
      realizedPnl: row.realizedPnl.toNumber(),
      unrealizedPnl: row.unrealizedPnl.toNumber(),
      strategyName: row.strategyName,
      legGroupId: row.legGroupId,
      openedAt: row.openedAt,
      closedAt: row.closedAt,
    }));
  }

  async findEquitySnapshotsByBacktestRunId(
    backtestRunId: string,
  ): Promise<BacktestEquitySnapshotRecord[]> {
    const rows = await this.prisma.equitySnapshot.findMany({
      where: { backtestRunId },
      orderBy: { timestamp: 'asc' },
    });

    return rows.map((row) => ({
      timestamp: row.timestamp,
      cashBalance: row.cashBalance.toNumber(),
      portfolioValue: row.portfolioValue.toNumber(),
      realizedPnl: row.realizedPnl.toNumber(),
      unrealizedPnl: row.unrealizedPnl.toNumber(),
      drawdown: row.drawdown.toNumber(),
    }));
  }

  async findPortfolioByBacktestRunId(
    backtestRunId: string,
  ): Promise<BacktestPortfolioRecord | null> {
    const row = await this.prisma.portfolio.findFirst({
      where: { backtestRunId },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      mode: row.mode,
      initialCapital: row.initialCapital.toNumber(),
      cashBalance: row.cashBalance.toNumber(),
      currency: row.currency,
    };
  }
}

export function createPrismaBacktestAnalyticsRepository(
  prisma: PrismaClient,
): PrismaBacktestAnalyticsRepository {
  return new PrismaBacktestAnalyticsRepository(prisma);
}
