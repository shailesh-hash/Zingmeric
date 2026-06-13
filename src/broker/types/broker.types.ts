import type { TradingCostConfig } from '../../backtest/types/backtest-config.type.js';

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export interface DefinedRiskOrderDetails {
  maxLoss: number;
  entryCredit?: number;
  closeCost?: number;
}

export interface PlaceOrderRequest {
  instrumentId: string;
  strategyName: string;
  side: OrderSide;
  quantity: number;
  price: number;
  orderType?: OrderType;
  timestamp?: Date;
  legGroupId?: string;
  definedRisk?: DefinedRiskOrderDetails;
}

export interface BrokerOrder {
  id: string;
  instrumentId: string;
  strategyName: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price: number;
  status: OrderStatus;
  createdAt: Date;
  filledAt?: Date;
  legGroupId?: string;
}

export interface BrokerFill {
  orderId: string;
  timestamp: Date;
  instrumentId: string;
  strategyName: string;
  side: OrderSide;
  quantity: number;
  price: number;
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  slippage: number;
  totalFees: number;
  realizedPnl: number;
}

export interface BrokerPositionView {
  id: string;
  strategyName: string;
  instrumentId: string;
  kind: string;
  quantity: number;
  averagePrice?: number;
  entryCredit?: number;
  maxLoss?: number;
  markPrice?: number;
  unrealizedPnl: number;
  openedAt: Date;
}

export interface BrokerPnlSummary {
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  equity: number;
  cash: number;
}

export interface PlaceOrderResult {
  order: BrokerOrder;
  fill: BrokerFill | null;
}

export interface CancelOrderResult {
  cancelled: boolean;
  order: BrokerOrder | null;
}

export interface PaperBrokerConfig {
  initialCapital: number;
  includeCosts?: boolean;
  costs?: TradingCostConfig;
}
