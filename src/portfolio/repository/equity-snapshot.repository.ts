import type { EquitySnapshotQueryDto } from '../dto/equity-snapshot.dto.js';

export interface EquitySnapshotRecord {
  portfolioId: string;
  backtestRunId?: string | null;
  timestamp: Date;
  cashBalance: number;
  portfolioValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  drawdown: number;
}

export interface EquitySnapshotRow extends EquitySnapshotRecord {
  id: string;
  createdAt: Date;
}

export interface EquitySnapshotRepository {
  create(record: EquitySnapshotRecord): Promise<EquitySnapshotRow>;

  createMany(records: EquitySnapshotRecord[]): Promise<number>;

  findMany(query: EquitySnapshotQueryDto): Promise<EquitySnapshotRow[]>;

  findPeakPortfolioValue(portfolioId: string, beforeTimestamp?: Date): Promise<number | null>;

  deleteByBacktestRunId(backtestRunId: string): Promise<number>;

  deleteByPortfolioId(portfolioId: string): Promise<number>;
}

export const EQUITY_SNAPSHOT_BATCH_SIZE = 1000;
