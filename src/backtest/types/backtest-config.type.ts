export interface TradingCostConfig {
  brokeragePerOrder: number;
  sttRate: number;
  exchangeChargeRate: number;
  slippageRate: number;
}

export interface BacktestConfig {
  instrumentId: string;
  symbol: string;
  strategyName: string;
  initialCapital: number;
  quantityPerTrade: number;
  includeCosts: boolean;
  costs?: TradingCostConfig;
  riskFreeRate?: number;
}

export const DEFAULT_TRADING_COSTS: TradingCostConfig = {
  brokeragePerOrder: 20,
  sttRate: 0.001,
  exchangeChargeRate: 0.0000345,
  slippageRate: 0.0005,
};

export function createBacktestConfig(
  overrides: Partial<BacktestConfig> &
    Pick<BacktestConfig, 'instrumentId' | 'symbol' | 'strategyName'>,
): BacktestConfig {
  return {
    initialCapital: 100_000,
    quantityPerTrade: 1,
    includeCosts: true,
    costs: DEFAULT_TRADING_COSTS,
    riskFreeRate: 0.06,
    ...overrides,
  };
}
