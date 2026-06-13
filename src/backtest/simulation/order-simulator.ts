import type { BacktestCandle } from '../types/backtest-candle.type.js';
import { DEFAULT_TRADING_COSTS, type BacktestConfig } from '../types/backtest-config.type.js';
import type { PortfolioState, SimulatedTrade } from '../types/portfolio-state.type.js';
import type { Signal } from '../../strategies/types/signal.type.js';
import { SignalAction } from '../../strategies/types/signal.type.js';
import { calculateOrderCosts } from './trading-costs.js';

export interface OrderSimulator {
  execute(
    signal: Signal,
    candle: BacktestCandle,
    portfolio: PortfolioState,
    config: BacktestConfig,
  ): SimulatedTrade | null;
}

export class DefaultOrderSimulator implements OrderSimulator {
  execute(
    signal: Signal,
    candle: BacktestCandle,
    portfolio: PortfolioState,
    config: BacktestConfig,
  ): SimulatedTrade | null {
    if (signal.action === SignalAction.HOLD) {
      return null;
    }

    const costs = config.includeCosts
      ? (config.costs ?? DEFAULT_TRADING_COSTS)
      : {
          brokeragePerOrder: 0,
          sttRate: 0,
          exchangeChargeRate: 0,
          slippageRate: 0,
        };

    if (signal.action === SignalAction.BUY) {
      return this.executeBuy(candle, portfolio, config.quantityPerTrade, costs);
    }

    return this.executeSell(candle, portfolio, config.quantityPerTrade, costs);
  }

  private executeBuy(
    candle: BacktestCandle,
    portfolio: PortfolioState,
    quantity: number,
    costs: NonNullable<BacktestConfig['costs']>,
  ): SimulatedTrade | null {
    if (quantity <= 0) {
      return null;
    }

    const breakdown = calculateOrderCosts('BUY', candle.close, quantity, costs);
    const totalCost = breakdown.executionPrice * quantity + breakdown.totalFees;

    if (totalCost > portfolio.cash) {
      return null;
    }

    const existing = portfolio.position;
    const newQuantity = (existing?.quantity ?? 0) + quantity;
    const newAveragePrice = existing
      ? (existing.averagePrice * existing.quantity + breakdown.executionPrice * quantity) /
        newQuantity
      : breakdown.executionPrice;

    portfolio.cash -= totalCost;
    portfolio.position = {
      quantity: newQuantity,
      averagePrice: newAveragePrice,
    };

    return {
      timestamp: candle.timestamp,
      side: 'BUY',
      quantity,
      price: breakdown.executionPrice,
      brokerage: breakdown.brokerage,
      stt: breakdown.stt,
      exchangeCharges: breakdown.exchangeCharges,
      slippage: breakdown.slippage,
      totalFees: breakdown.totalFees,
      realizedPnl: 0,
    };
  }

  private executeSell(
    candle: BacktestCandle,
    portfolio: PortfolioState,
    quantity: number,
    costs: NonNullable<BacktestConfig['costs']>,
  ): SimulatedTrade | null {
    if (!portfolio.position || portfolio.position.quantity <= 0) {
      return null;
    }

    const sellQuantity = Math.min(quantity, portfolio.position.quantity);
    if (sellQuantity <= 0) {
      return null;
    }

    const breakdown = calculateOrderCosts('SELL', candle.close, sellQuantity, costs);
    const proceeds = breakdown.executionPrice * sellQuantity - breakdown.totalFees;
    const costBasis = portfolio.position.averagePrice * sellQuantity;
    const realizedPnl = proceeds - costBasis;

    portfolio.cash += proceeds;
    const remainingQuantity = portfolio.position.quantity - sellQuantity;

    portfolio.position =
      remainingQuantity > 0
        ? {
            quantity: remainingQuantity,
            averagePrice: portfolio.position.averagePrice,
          }
        : null;

    return {
      timestamp: candle.timestamp,
      side: 'SELL',
      quantity: sellQuantity,
      price: breakdown.executionPrice,
      brokerage: breakdown.brokerage,
      stt: breakdown.stt,
      exchangeCharges: breakdown.exchangeCharges,
      slippage: breakdown.slippage,
      totalFees: breakdown.totalFees,
      realizedPnl,
    };
  }
}
