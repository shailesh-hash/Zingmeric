import {
  createPortfolioEngine,
  createPortfolioEngineConfig,
  createPositionId,
  InsufficientCashError,
  InsufficientMarginError,
  InvalidPortfolioOperationError,
  PositionKind,
  PositionNotFoundError,
} from '../../src/portfolio/index.js';

describe('PortfolioEngine', () => {
  const timestamp = new Date('2024-01-15T09:15:00.000Z');

  it('initializes with full cash and no margin used', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 100_000 }));

    expect(engine.snapshot).toEqual(
      expect.objectContaining({
        initialCapital: 100_000,
        cash: 100_000,
        marginUsed: 0,
        marginAvailable: 100_000,
        unrealizedPnl: 0,
        equity: 100_000,
        openPositions: [],
        closedPositionCount: 0,
      }),
    );
  });

  it('tracks equity buys and sells with cash management', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 10_000 }));

    const opened = engine.openEquityPosition({
      strategyName: 'equity',
      instrumentId: 'inst-nifty',
      timestamp,
      quantity: 10,
      price: 100,
      fees: 20,
    });

    expect(opened.quantity).toBe(10);
    expect(engine.snapshot.cash).toBe(8_980);
    expect(engine.getOpenPositions('equity')).toHaveLength(1);

    const { realizedPnl } = engine.closeEquityPosition({
      positionId: opened.id,
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
      quantity: 10,
      price: 110,
      fees: 20,
    });

    expect(realizedPnl).toBe(80);
    expect(engine.snapshot.cash).toBe(10_060);
    expect(engine.getOpenPositions()).toHaveLength(0);
    expect(engine.snapshot.closedPositionCount).toBe(1);
  });

  it('rejects equity buys when cash is insufficient', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 500 }));

    expect(() =>
      engine.openEquityPosition({
        strategyName: 'equity',
        instrumentId: 'inst-nifty',
        timestamp,
        quantity: 10,
        price: 100,
      }),
    ).toThrow(InsufficientCashError);
  });

  it('opens and closes defined-risk positions with margin tracking', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 100_000 }));

    const position = engine.openDefinedRiskPosition({
      strategyName: 'bull-put-spread',
      instrumentId: 'inst-nifty',
      timestamp,
      quantity: 50,
      entryCredit: 55,
      maxLoss: 295,
    });

    expect(position.kind).toBe(PositionKind.DEFINED_RISK);
    expect(engine.snapshot.cash).toBe(102_750);
    expect(engine.snapshot.marginUsed).toBe(14_750);
    expect(engine.snapshot.marginAvailable).toBe(88_000);

    const { realizedPnl } = engine.closeDefinedRiskPosition({
      positionId: position.id,
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
      closeCost: 25,
    });

    expect(realizedPnl).toBe(1_500);
    expect(engine.snapshot.cash).toBe(101_500);
    expect(engine.snapshot.marginUsed).toBe(0);
    expect(engine.getMarginSummary().openPositionCount).toBe(0);
  });

  it('rejects defined-risk opens when margin is insufficient', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 10_000 }));

    expect(() =>
      engine.openDefinedRiskPosition({
        strategyName: 'iron-condor',
        instrumentId: 'inst-nifty',
        timestamp,
        quantity: 50,
        entryCredit: 110,
        maxLoss: 240,
      }),
    ).toThrow(InsufficientMarginError);
  });

  it('supports multiple strategies with isolated positions', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 200_000 }));

    engine.openDefinedRiskPosition({
      strategyName: 'bull-put-spread',
      instrumentId: 'inst-nifty',
      timestamp,
      quantity: 50,
      entryCredit: 55,
      maxLoss: 295,
    });

    engine.openDefinedRiskPosition({
      strategyName: 'iron-condor',
      instrumentId: 'inst-nifty',
      timestamp,
      legGroupId: 'ic-1',
      quantity: 50,
      entryCredit: 110,
      maxLoss: 240,
    });

    engine.openEquityPosition({
      strategyName: 'equity',
      instrumentId: 'inst-reliance',
      timestamp,
      quantity: 5,
      price: 2_500,
    });

    expect(engine.getOpenPositions()).toHaveLength(3);
    expect(engine.getOpenPositions('bull-put-spread')).toHaveLength(1);
    expect(engine.getOpenPositions('iron-condor')).toHaveLength(1);
    expect(engine.getOpenPositions('equity')).toHaveLength(1);
    expect(engine.snapshot.marginUsed).toBe(14_750 + 12_000 + 12_500);
  });

  it('marks positions to market and updates equity', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 100_000 }));

    const spread = engine.openDefinedRiskPosition({
      strategyName: 'bull-put-spread',
      instrumentId: 'inst-nifty',
      timestamp,
      quantity: 50,
      entryCredit: 55,
      maxLoss: 295,
    });

    engine.markToMarket([{ positionId: spread.id, markPrice: 25 }]);

    expect(engine.snapshot.unrealizedPnl).toBe(1_500);
    expect(engine.snapshot.equity).toBe(102_750 + 1_500);
  });

  it('records ledger entries for cash and margin changes', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 100_000 }));

    const position = engine.openDefinedRiskPosition({
      strategyName: 'bull-put-spread',
      instrumentId: 'inst-nifty',
      timestamp,
      quantity: 50,
      entryCredit: 55,
      maxLoss: 295,
    });

    engine.closeDefinedRiskPosition({
      positionId: position.id,
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
      closeCost: 30,
    });

    expect(engine.ledgerEntries).toHaveLength(2);
    expect(engine.ledgerEntries[0]).toEqual(
      expect.objectContaining({
        type: 'CREDIT_SPREAD_OPEN',
        cashDelta: 2_750,
        marginDelta: 14_750,
      }),
    );
    expect(engine.ledgerEntries[1]).toEqual(
      expect.objectContaining({
        type: 'CREDIT_SPREAD_CLOSE',
        cashDelta: -1_500,
        marginDelta: -14_750,
        realizedPnl: 1_250,
      }),
    );
  });

  it('throws when closing unknown positions', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 100_000 }));

    expect(() =>
      engine.closeDefinedRiskPosition({
        positionId: 'missing',
        timestamp,
        closeCost: 10,
      }),
    ).toThrow(PositionNotFoundError);
  });

  it('prevents duplicate defined-risk positions for the same strategy key', () => {
    const engine = createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: 200_000 }));

    engine.openDefinedRiskPosition({
      strategyName: 'bull-put-spread',
      instrumentId: 'inst-nifty',
      timestamp,
      quantity: 50,
      entryCredit: 55,
      maxLoss: 295,
    });

    expect(() =>
      engine.openDefinedRiskPosition({
        strategyName: 'bull-put-spread',
        instrumentId: 'inst-nifty',
        timestamp,
        quantity: 50,
        entryCredit: 55,
        maxLoss: 295,
      }),
    ).toThrow(InvalidPortfolioOperationError);
  });

  it('builds stable position ids from strategy, instrument, and leg group', () => {
    expect(createPositionId('iron-condor', 'inst-nifty', 'week-3')).toBe(
      'iron-condor:inst-nifty:week-3',
    );
  });
});
