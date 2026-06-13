import type { TradingCostConfig } from '../types/backtest-config.type.js';

export interface OrderCostBreakdown {
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  slippage: number;
  totalFees: number;
  executionPrice: number;
}

export function calculateOrderCosts(
  side: 'BUY' | 'SELL',
  price: number,
  quantity: number,
  costs: TradingCostConfig,
): OrderCostBreakdown {
  const slippageMultiplier = side === 'BUY' ? 1 + costs.slippageRate : 1 - costs.slippageRate;
  const executionPrice = price * slippageMultiplier;
  const turnover = executionPrice * quantity;

  const brokerage = costs.brokeragePerOrder;
  const stt = turnover * costs.sttRate;
  const exchangeCharges = turnover * costs.exchangeChargeRate;
  const slippage = Math.abs(executionPrice - price) * quantity;

  return {
    brokerage,
    stt,
    exchangeCharges,
    slippage,
    totalFees: brokerage + stt + exchangeCharges + slippage,
    executionPrice,
  };
}
