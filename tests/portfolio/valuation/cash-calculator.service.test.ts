import { ValuationInstrumentType } from '../../../src/portfolio/valuation/types/valuation.types.js';
import { CashCalculatorService } from '../../../src/portfolio/valuation/services/cash-calculator.service.js';
import { InvalidValuationInputError } from '../../../src/portfolio/valuation/errors/valuation.errors.js';

describe('CashCalculatorService', () => {
  const calculator = new CashCalculatorService();

  it('starts from initial cash with no trades', () => {
    expect(calculator.calculate(100_000, [])).toBe(100_000);
  });

  it('derives cash impact for equity buys and sells', () => {
    const cash = calculator.calculate(100_000, [
      {
        instrumentId: 'inst-nifty',
        instrumentType: ValuationInstrumentType.EQUITY,
        side: 'BUY',
        quantity: 10,
        price: 100,
        totalFees: 20,
        executedAt: new Date('2024-01-15T09:15:00.000Z'),
      },
      {
        instrumentId: 'inst-nifty',
        instrumentType: ValuationInstrumentType.EQUITY,
        side: 'SELL',
        quantity: 10,
        price: 110,
        totalFees: 20,
        executedAt: new Date('2024-01-16T09:15:00.000Z'),
      },
    ]);

    expect(cash).toBe(100_060);
  });

  it('derives cash impact for option credit spreads', () => {
    const cash = calculator.calculate(100_000, [
      {
        instrumentId: 'inst-nifty',
        instrumentType: ValuationInstrumentType.DEFINED_RISK,
        side: 'SELL',
        quantity: 50,
        price: 120,
        totalFees: 100,
        executedAt: new Date('2024-01-15T09:15:00.000Z'),
      },
      {
        instrumentId: 'inst-nifty',
        instrumentType: ValuationInstrumentType.DEFINED_RISK,
        side: 'BUY',
        quantity: 50,
        price: 40,
        totalFees: 100,
        executedAt: new Date('2024-01-20T09:15:00.000Z'),
      },
    ]);

    expect(cash).toBe(103_800);
  });

  it('uses explicit cashDelta when provided', () => {
    const cash = calculator.calculate(50_000, [
      {
        instrumentId: 'inst-nifty',
        instrumentType: ValuationInstrumentType.EQUITY,
        side: 'BUY',
        quantity: 1,
        price: 999,
        totalFees: 0,
        cashDelta: -500,
        executedAt: new Date(),
      },
    ]);

    expect(cash).toBe(49_500);
  });

  it('rejects negative initial cash', () => {
    expect(() => calculator.calculate(-1, [])).toThrow(InvalidValuationInputError);
  });
});
