import { ValuationInstrumentType } from '../../../src/portfolio/valuation/types/valuation.types.js';
import { createInMemoryMarketPriceProvider } from '../../../src/portfolio/valuation/providers/in-memory-market-price.provider.js';
import { PnlCalculatorService } from '../../../src/portfolio/valuation/services/pnl-calculator.service.js';
import { MissingMarketPriceError } from '../../../src/portfolio/valuation/errors/valuation.errors.js';

describe('PnlCalculatorService', () => {
  it('sums realized pnl from closing trades', () => {
    const provider = createInMemoryMarketPriceProvider();
    const calculator = new PnlCalculatorService(provider);

    const realized = calculator.calculateRealizedPnl([
      {
        instrumentId: 'inst-nifty',
        instrumentType: ValuationInstrumentType.EQUITY,
        side: 'SELL',
        quantity: 10,
        price: 110,
        totalFees: 20,
        realizedPnl: 80,
        executedAt: new Date(),
      },
      {
        instrumentId: 'inst-nifty',
        instrumentType: ValuationInstrumentType.DEFINED_RISK,
        side: 'BUY',
        quantity: 50,
        price: 40,
        totalFees: 100,
        realizedPnl: 4_000,
        executedAt: new Date(),
      },
    ]);

    expect(realized).toBe(4_080);
  });

  it('calculates equity unrealized pnl from market prices', () => {
    const provider = createInMemoryMarketPriceProvider([
      { instrumentId: 'inst-nifty', positionId: 'pos-equity', price: 110 },
    ]);
    const calculator = new PnlCalculatorService(provider);

    const unrealized = calculator.calculateUnrealizedPnl([
      {
        id: 'pos-equity',
        instrumentId: 'inst-nifty',
        instrumentType: ValuationInstrumentType.EQUITY,
        quantity: 10,
        averagePrice: 100,
      },
    ]);

    expect(unrealized).toBe(100);
  });

  it('calculates defined-risk option unrealized pnl', () => {
    const provider = createInMemoryMarketPriceProvider([
      { instrumentId: 'inst-nifty', positionId: 'pos-spread', price: 80 },
    ]);
    const calculator = new PnlCalculatorService(provider);

    const unrealized = calculator.calculateUnrealizedPnl([
      {
        id: 'pos-spread',
        instrumentId: 'inst-nifty',
        instrumentType: ValuationInstrumentType.DEFINED_RISK,
        quantity: 50,
        entryCredit: 120,
        maxLoss: 500,
      },
    ]);

    expect(unrealized).toBe(2_000);
  });

  it('calculates single-leg option unrealized pnl', () => {
    const provider = createInMemoryMarketPriceProvider([
      { instrumentId: 'inst-pe-21800', positionId: 'pos-option', price: 95 },
    ]);
    const calculator = new PnlCalculatorService(provider);

    const unrealized = calculator.calculateUnrealizedPnl([
      {
        id: 'pos-option',
        instrumentId: 'inst-pe-21800',
        instrumentType: ValuationInstrumentType.OPTION,
        quantity: 50,
        averagePrice: 120,
      },
    ]);

    expect(unrealized).toBe(-1_250);
  });

  it('supports futures positions with contract multiplier', () => {
    const provider = createInMemoryMarketPriceProvider([
      { instrumentId: 'inst-nifty-fut', positionId: 'pos-future', price: 22_100 },
    ]);
    const calculator = new PnlCalculatorService(provider);

    const breakdown = calculator.calculatePositionBreakdowns([
      {
        id: 'pos-future',
        instrumentId: 'inst-nifty-fut',
        instrumentType: ValuationInstrumentType.FUTURE,
        quantity: 1,
        entryPrice: 22_000,
        contractMultiplier: 50,
      },
    ]);

    expect(breakdown[0]?.unrealizedPnl).toBe(5_000);
  });

  it('throws when a market price is missing', () => {
    const provider = createInMemoryMarketPriceProvider();
    const calculator = new PnlCalculatorService(provider);

    expect(() =>
      calculator.calculateUnrealizedPnl([
        {
          id: 'pos-missing',
          instrumentId: 'inst-nifty',
          instrumentType: ValuationInstrumentType.EQUITY,
          quantity: 1,
          averagePrice: 100,
        },
      ]),
    ).toThrow(MissingMarketPriceError);
  });
});
