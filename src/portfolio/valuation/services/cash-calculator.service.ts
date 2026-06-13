import { InvalidValuationInputError } from '../errors/valuation.errors.js';
import { ValuationInstrumentType, type ValuationTrade } from '../types/valuation.types.js';

export class CashCalculatorService {
  calculate(initialCash: number, trades: ValuationTrade[]): number {
    if (initialCash < 0) {
      throw new InvalidValuationInputError('initialCash cannot be negative');
    }

    return trades.reduce((cash, trade) => cash + this.resolveCashDelta(trade), initialCash);
  }

  resolveCashDelta(trade: ValuationTrade): number {
    if (trade.cashDelta !== undefined) {
      return trade.cashDelta;
    }

    if (trade.quantity <= 0) {
      throw new InvalidValuationInputError('trade quantity must be greater than zero');
    }

    const notional = trade.price * trade.quantity;
    const fees = trade.totalFees;

    switch (trade.instrumentType) {
      case ValuationInstrumentType.EQUITY:
        return trade.side === 'BUY' ? -(notional + fees) : notional - fees;

      case ValuationInstrumentType.OPTION:
      case ValuationInstrumentType.DEFINED_RISK:
        return trade.side === 'SELL' ? notional - fees : -(notional + fees);

      case ValuationInstrumentType.FUTURE:
        return trade.side === 'BUY' ? -(notional + fees) : notional - fees;

      default:
        return 0;
    }
  }
}

export function createCashCalculatorService(): CashCalculatorService {
  return new CashCalculatorService();
}
