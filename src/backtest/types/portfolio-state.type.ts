export interface PositionState {
  quantity: number;
  averagePrice: number;
}

export interface SimulatedTrade {
  timestamp: Date;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  slippage: number;
  totalFees: number;
  realizedPnl: number;
}

export interface EquityPoint {
  timestamp: Date;
  equity: number;
  cash: number;
  positionValue: number;
}

export interface PortfolioState {
  cash: number;
  position: PositionState | null;
  trades: SimulatedTrade[];
  equityCurve: EquityPoint[];
}

export function createPortfolioState(initialCapital: number): PortfolioState {
  return {
    cash: initialCapital,
    position: null,
    trades: [],
    equityCurve: [],
  };
}
