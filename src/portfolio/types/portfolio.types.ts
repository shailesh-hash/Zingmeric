import type { PortfolioMetricsPublisher } from '../../observability/types/observability.types.js';

export enum PositionKind {
  EQUITY = 'EQUITY',
  DEFINED_RISK = 'DEFINED_RISK',
}

export enum PositionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface BasePosition {
  id: string;
  strategyName: string;
  instrumentId: string;
  status: PositionStatus;
  openedAt: Date;
  closedAt?: Date;
}

export interface EquityPosition extends BasePosition {
  kind: PositionKind.EQUITY;
  quantity: number;
  averagePrice: number;
  markPrice?: number;
}

export interface DefinedRiskPosition extends BasePosition {
  kind: PositionKind.DEFINED_RISK;
  quantity: number;
  entryCredit: number;
  maxLoss: number;
  markPrice?: number;
}

export type PortfolioPosition = EquityPosition | DefinedRiskPosition;

export interface PortfolioLedgerEntry {
  timestamp: Date;
  strategyName: string;
  instrumentId: string;
  positionId: string;
  type: 'EQUITY_BUY' | 'EQUITY_SELL' | 'CREDIT_SPREAD_OPEN' | 'CREDIT_SPREAD_CLOSE';
  cashDelta: number;
  marginDelta: number;
  realizedPnl: number;
  quantity: number;
  price: number;
}

export interface MarginSummary {
  marginUsed: number;
  marginAvailable: number;
  openPositionCount: number;
}

export interface PortfolioSnapshot {
  initialCapital: number;
  cash: number;
  marginUsed: number;
  marginAvailable: number;
  unrealizedPnl: number;
  equity: number;
  openPositions: PortfolioPosition[];
  closedPositionCount: number;
}

export interface PortfolioEngineConfig {
  initialCapital: number;
  currency?: string;
  metricsPublisher?: PortfolioMetricsPublisher;
}

export interface OpenEquityPositionRequest {
  strategyName: string;
  instrumentId: string;
  timestamp: Date;
  quantity: number;
  price: number;
  fees?: number;
}

export interface CloseEquityPositionRequest {
  positionId: string;
  timestamp: Date;
  quantity: number;
  price: number;
  fees?: number;
}

export interface OpenDefinedRiskPositionRequest {
  strategyName: string;
  instrumentId: string;
  timestamp: Date;
  quantity: number;
  entryCredit: number;
  maxLoss: number;
  legGroupId?: string;
}

export interface CloseDefinedRiskPositionRequest {
  positionId: string;
  timestamp: Date;
  closeCost: number;
}

export interface MarkToMarketQuote {
  positionId: string;
  markPrice: number;
}

export function createPositionId(
  strategyName: string,
  instrumentId: string,
  legGroupId = 'default',
): string {
  return `${strategyName}:${instrumentId}:${legGroupId}`;
}

export function createPortfolioEngineConfig(
  overrides: Partial<PortfolioEngineConfig> & Pick<PortfolioEngineConfig, 'initialCapital'>,
): PortfolioEngineConfig {
  return {
    initialCapital: overrides.initialCapital,
    currency: overrides.currency ?? 'INR',
  };
}
