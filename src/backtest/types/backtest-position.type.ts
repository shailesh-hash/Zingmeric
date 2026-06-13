import type { PositionStatus } from '../../portfolio/types/portfolio.types.js';

export interface BacktestPositionRecord {
  id: string;
  strategyName: string;
  instrumentId: string;
  status: PositionStatus;
  kind: 'EQUITY' | 'DEFINED_RISK';
  quantity: number;
  openedAt: Date;
  closedAt?: Date;
}
