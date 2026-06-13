export enum SimulatedPositionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface SimulatedSpreadPosition {
  id: string;
  strategyName: string;
  instrumentId: string;
  status: SimulatedPositionStatus;
  shortStrike: number;
  longStrike: number;
  quantity: number;
  entryCredit: number;
  openedAt: Date;
  closedAt?: Date;
  exitDebit?: number;
  realizedPnl?: number;
}
