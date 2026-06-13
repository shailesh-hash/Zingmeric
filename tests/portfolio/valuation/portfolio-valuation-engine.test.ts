import { ValuationInstrumentType } from '../../../src/portfolio/valuation/types/valuation.types.js';
import { createInMemoryMarketPriceProvider } from '../../../src/portfolio/valuation/providers/in-memory-market-price.provider.js';
import { createPortfolioValuationEngine } from '../../../src/portfolio/valuation/services/portfolio-valuation-engine.js';
import { InvalidValuationInputError } from '../../../src/portfolio/valuation/errors/valuation.errors.js';

describe('PortfolioValuationEngine', () => {
  const portfolioId = 'portfolio-1';
  const backtestRunId = 'backtest-1';
  const timestamp = new Date('2024-01-17T09:15:00.000Z');

  function createEngine(prices: { instrumentId: string; positionId?: string; price: number }[]) {
    return createPortfolioValuationEngine({
      priceProvider: createInMemoryMarketPriceProvider(prices),
    });
  }

  it('values cash-only portfolio', () => {
    const engine = createEngine([]);

    const value = engine.valuate({
      initialCash: 100_000,
      trades: [],
      positions: [],
      timestamp,
      portfolioId,
    });

    expect(value).toEqual({
      cashBalance: 100_000,
      realizedPnl: 0,
      unrealizedPnl: 0,
      portfolioValue: 100_000,
      positionValues: [],
    });
  });

  it('values equity portfolio with open position', () => {
    const engine = createEngine([
      { instrumentId: 'inst-nifty', positionId: 'pos-equity', price: 110 },
    ]);

    const value = engine.valuate({
      initialCash: 100_000,
      trades: [
        {
          instrumentId: 'inst-nifty',
          instrumentType: ValuationInstrumentType.EQUITY,
          side: 'BUY',
          quantity: 10,
          price: 100,
          totalFees: 20,
          executedAt: new Date('2024-01-15T09:15:00.000Z'),
        },
      ],
      positions: [
        {
          id: 'pos-equity',
          instrumentId: 'inst-nifty',
          instrumentType: ValuationInstrumentType.EQUITY,
          quantity: 10,
          averagePrice: 100,
        },
      ],
      timestamp,
      portfolioId,
    });

    expect(value.cashBalance).toBe(98_980);
    expect(value.unrealizedPnl).toBe(100);
    expect(value.portfolioValue).toBe(99_080);
    expect(value.positionValues[0]?.marketValue).toBe(1_100);
  });

  it('values open defined-risk option spread', () => {
    const engine = createEngine([
      { instrumentId: 'inst-nifty', positionId: 'pos-spread', price: 90 },
    ]);

    const value = engine.valuate({
      initialCash: 100_000,
      trades: [
        {
          instrumentId: 'inst-nifty',
          instrumentType: ValuationInstrumentType.DEFINED_RISK,
          side: 'SELL',
          quantity: 50,
          price: 120,
          totalFees: 100,
          executedAt: new Date('2024-01-15T09:15:00.000Z'),
        },
      ],
      positions: [
        {
          id: 'pos-spread',
          instrumentId: 'inst-nifty',
          instrumentType: ValuationInstrumentType.DEFINED_RISK,
          quantity: 50,
          entryCredit: 120,
          maxLoss: 500,
        },
      ],
      timestamp,
      portfolioId,
    });

    expect(value.cashBalance).toBe(105_900);
    expect(value.unrealizedPnl).toBe(1_500);
    expect(value.portfolioValue).toBe(107_400);
  });

  it('includes cumulative realized pnl from closed trades', () => {
    const engine = createEngine([]);

    const value = engine.valuate({
      initialCash: 100_000,
      trades: [
        {
          instrumentId: 'inst-nifty',
          instrumentType: ValuationInstrumentType.DEFINED_RISK,
          side: 'BUY',
          quantity: 50,
          price: 40,
          totalFees: 100,
          realizedPnl: 4_000,
          executedAt: new Date('2024-01-20T09:15:00.000Z'),
        },
      ],
      positions: [],
      timestamp,
      portfolioId,
    });

    expect(value.realizedPnl).toBe(4_000);
  });

  it('generates an equity snapshot with drawdown', () => {
    const engine = createEngine([
      { instrumentId: 'inst-nifty', positionId: 'pos-spread', price: 130 },
    ]);

    const snapshot = engine.createEquitySnapshot({
      initialCash: 100_000,
      trades: [
        {
          instrumentId: 'inst-nifty',
          instrumentType: ValuationInstrumentType.DEFINED_RISK,
          side: 'SELL',
          quantity: 50,
          price: 120,
          totalFees: 0,
          executedAt: new Date('2024-01-15T09:15:00.000Z'),
        },
      ],
      positions: [
        {
          id: 'pos-spread',
          instrumentId: 'inst-nifty',
          instrumentType: ValuationInstrumentType.DEFINED_RISK,
          quantity: 50,
          entryCredit: 120,
          maxLoss: 500,
        },
      ],
      timestamp,
      portfolioId,
      backtestRunId,
      peakPortfolioValue: 110_000,
    });

    expect(snapshot.portfolioId).toBe(portfolioId);
    expect(snapshot.backtestRunId).toBe(backtestRunId);
    expect(snapshot.cashBalance).toBe(106_000);
    expect(snapshot.unrealizedPnl).toBe(-500);
    expect(snapshot.portfolioValue).toBe(105_500);
    expect(snapshot.drawdown).toBeCloseTo(0.040909, 4);
  });

  it('supports dependency injection of calculators', () => {
    const priceProvider = createInMemoryMarketPriceProvider([
      { instrumentId: 'inst-nifty', positionId: 'pos-equity', price: 105 },
    ]);

    const engine = createPortfolioValuationEngine({ priceProvider });

    expect(
      engine.calculateUnrealizedPnl([
        {
          id: 'pos-equity',
          instrumentId: 'inst-nifty',
          instrumentType: ValuationInstrumentType.EQUITY,
          quantity: 10,
          averagePrice: 100,
        },
      ]),
    ).toBe(50);
  });

  it('rejects invalid portfolio id', () => {
    const engine = createEngine([]);

    expect(() =>
      engine.valuate({
        initialCash: 100_000,
        trades: [],
        positions: [],
        timestamp,
        portfolioId: '  ',
      }),
    ).toThrow(InvalidValuationInputError);
  });
});
