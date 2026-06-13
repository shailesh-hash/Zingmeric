export interface RecordEquitySnapshotDto {
  portfolioId: string;
  backtestRunId?: string | null;
  timestamp: Date;
  cashBalance: number;
  portfolioValue?: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

export interface EquitySnapshotQueryDto {
  portfolioId?: string;
  backtestRunId?: string;
  from?: Date;
  to?: Date;
}

export interface EquitySnapshotDto {
  id: string;
  portfolioId: string;
  backtestRunId: string | null;
  timestamp: Date;
  cashBalance: number;
  portfolioValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  drawdown: number;
  createdAt: Date;
}

export interface EquityCurvePointDto {
  timestamp: Date;
  equity: number;
  cash: number;
  positionValue: number;
  drawdown: number;
}
