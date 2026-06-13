import { InvalidValuationInputError } from '../errors/valuation.errors.js';
import type { MarketPriceProvider } from '../types/market-price-provider.interface.js';
import type {
  GeneratedEquitySnapshot,
  PortfolioValuationInput,
  PortfolioValue,
} from '../types/valuation.types.js';
import { CashCalculatorService, createCashCalculatorService } from './cash-calculator.service.js';
import { createPnlCalculatorService, PnlCalculatorService } from './pnl-calculator.service.js';

export interface PortfolioValuationEngineDependencies {
  priceProvider: MarketPriceProvider;
  cashCalculator?: CashCalculatorService;
  pnlCalculator?: PnlCalculatorService;
}

export class PortfolioValuationEngine {
  private readonly cashCalculator: CashCalculatorService;
  private readonly pnlCalculator: PnlCalculatorService;

  constructor(dependencies: PortfolioValuationEngineDependencies) {
    this.cashCalculator = dependencies.cashCalculator ?? createCashCalculatorService();
    this.pnlCalculator =
      dependencies.pnlCalculator ?? createPnlCalculatorService(dependencies.priceProvider);
  }

  calculateCash(initialCash: number, trades: PortfolioValuationInput['trades']): number {
    return this.cashCalculator.calculate(initialCash, trades);
  }

  calculateRealizedPnl(trades: PortfolioValuationInput['trades']): number {
    return this.pnlCalculator.calculateRealizedPnl(trades);
  }

  calculateUnrealizedPnl(positions: PortfolioValuationInput['positions']): number {
    return this.pnlCalculator.calculateUnrealizedPnl(positions);
  }

  valuate(input: PortfolioValuationInput): PortfolioValue {
    this.validateInput(input);

    const cashBalance = this.calculateCash(input.initialCash, input.trades);
    const realizedPnl = this.calculateRealizedPnl(input.trades);
    const positionValues = this.pnlCalculator.calculatePositionBreakdowns(input.positions);
    const unrealizedPnl = positionValues.reduce(
      (total, breakdown) => total + breakdown.unrealizedPnl,
      0,
    );

    return {
      cashBalance,
      realizedPnl,
      unrealizedPnl,
      portfolioValue: cashBalance + unrealizedPnl,
      positionValues,
    };
  }

  createEquitySnapshot(input: PortfolioValuationInput): GeneratedEquitySnapshot {
    const value = this.valuate(input);
    const peak = Math.max(input.peakPortfolioValue ?? 0, value.portfolioValue);
    const drawdown = peak > 0 ? Math.max(0, (peak - value.portfolioValue) / peak) : 0;

    return {
      portfolioId: input.portfolioId,
      backtestRunId: input.backtestRunId ?? null,
      timestamp: input.timestamp,
      cashBalance: value.cashBalance,
      portfolioValue: value.portfolioValue,
      realizedPnl: value.realizedPnl,
      unrealizedPnl: value.unrealizedPnl,
      drawdown,
    };
  }

  private validateInput(input: PortfolioValuationInput): void {
    if (!input.portfolioId.trim()) {
      throw new InvalidValuationInputError('portfolioId is required');
    }

    if (input.initialCash < 0) {
      throw new InvalidValuationInputError('initialCash cannot be negative');
    }

    if (Number.isNaN(input.timestamp.getTime())) {
      throw new InvalidValuationInputError('timestamp must be a valid date');
    }
  }
}

export function createPortfolioValuationEngine(
  dependencies: PortfolioValuationEngineDependencies,
): PortfolioValuationEngine {
  return new PortfolioValuationEngine(dependencies);
}
