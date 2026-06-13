export enum ValuationInstrumentType {
  EQUITY = 'EQUITY',
  OPTION = 'OPTION',
  DEFINED_RISK = 'DEFINED_RISK',
  FUTURE = 'FUTURE',
}

export type ValuationTradeSide = 'BUY' | 'SELL';

export interface ValuationTrade {
  instrumentId: string;
  instrumentType: ValuationInstrumentType;
  side: ValuationTradeSide;
  quantity: number;
  price: number;
  totalFees: number;
  executedAt: Date;
  /** When set, used directly instead of deriving from side and instrument type. */
  cashDelta?: number;
  /** Realized PnL attributed to this trade (typically closing fills). */
  realizedPnl?: number;
  legGroupId?: string;
}

export interface ValuationPosition {
  id: string;
  instrumentId: string;
  instrumentType: ValuationInstrumentType;
  quantity: number;
  /** Equity and single-leg option cost basis. */
  averagePrice?: number;
  /** Credit spread entry premium per unit. */
  entryCredit?: number;
  /** Defined-risk max loss per unit. */
  maxLoss?: number;
  /** Futures entry price per unit (future support). */
  entryPrice?: number;
  /** Contract multiplier for derivatives (default 1). */
  contractMultiplier?: number;
}

export interface MarketPrice {
  instrumentId: string;
  price: number;
  positionId?: string;
}

export interface PortfolioValuationInput {
  initialCash: number;
  trades: ValuationTrade[];
  positions: ValuationPosition[];
  timestamp: Date;
  portfolioId: string;
  backtestRunId?: string | null;
  /** Running peak portfolio value for drawdown on generated snapshots. */
  peakPortfolioValue?: number;
}

export interface PositionValueBreakdown {
  positionId: string;
  instrumentId: string;
  instrumentType: ValuationInstrumentType;
  markPrice: number;
  marketValue: number;
  unrealizedPnl: number;
}

export interface PortfolioValue {
  cashBalance: number;
  realizedPnl: number;
  unrealizedPnl: number;
  portfolioValue: number;
  positionValues: PositionValueBreakdown[];
}

export interface GeneratedEquitySnapshot {
  portfolioId: string;
  backtestRunId: string | null;
  timestamp: Date;
  cashBalance: number;
  portfolioValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  drawdown: number;
}
