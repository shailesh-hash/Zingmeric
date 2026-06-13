import {
  calculateDrawdownPct,
  calculateTradeRiskPct,
  createRiskContext,
  createRiskEngine,
  createRiskEngineConfig,
  DEFAULT_RISK_CONFIG,
  InvalidRiskRequestError,
  RiskEngine,
  RiskViolationCode,
  RiskViolationError,
  updatePeakEquity,
} from '../../src/risk/index.js';

describe('risk calculations', () => {
  it('calculates trade risk as a fraction of equity', () => {
    expect(calculateTradeRiskPct(1_000, 100_000)).toBe(0.01);
    expect(calculateTradeRiskPct(2_000, 100_000)).toBe(0.02);
  });

  it('calculates drawdown from peak equity', () => {
    expect(calculateDrawdownPct(100_000, 85_000)).toBe(0.15);
    expect(calculateDrawdownPct(100_000, 100_000)).toBe(0);
    expect(calculateDrawdownPct(100_000, 110_000)).toBe(0);
  });

  it('tracks a running peak equity', () => {
    expect(updatePeakEquity(100_000, 95_000)).toBe(100_000);
    expect(updatePeakEquity(100_000, 105_000)).toBe(105_000);
  });

  it('rejects invalid calculation inputs', () => {
    expect(() => calculateTradeRiskPct(-1, 100_000)).toThrow(InvalidRiskRequestError);
    expect(() => calculateTradeRiskPct(1_000, 0)).toThrow(InvalidRiskRequestError);
    expect(() => calculateDrawdownPct(0, 100_000)).toThrow(InvalidRiskRequestError);
  });
});

describe('RiskEngine', () => {
  const engine = createRiskEngine(createRiskEngineConfig());

  it('uses default limits from rules', () => {
    expect(DEFAULT_RISK_CONFIG).toEqual({
      maxRiskPerTradePct: 0.01,
      hardStopRiskPerTradePct: 0.02,
      maxPortfolioDrawdownPct: 0.15,
    });
  });

  it('allows trades at or below 1% risk with no drawdown', () => {
    const result = engine.validateNewTrade(createRiskContext({ equity: 100_000 }), {
      tradeRiskAmount: 1_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.tradeRiskPct).toBe(0.01);
  });

  it('blocks trades above 1% but at or below 2% with max risk violation', () => {
    const result = engine.validateNewTrade(createRiskContext({ equity: 100_000 }), {
      tradeRiskAmount: 1_500,
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        code: RiskViolationCode.MAX_RISK_PER_TRADE,
        limit: 0.01,
        actual: 0.015,
      }),
    ]);
  });

  it('blocks trades above 2% hard stop', () => {
    const result = engine.validateNewTrade(createRiskContext({ equity: 100_000 }), {
      tradeRiskAmount: 2_100,
    });

    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toEqual(
      expect.objectContaining({
        code: RiskViolationCode.HARD_STOP_RISK,
        limit: 0.02,
        actual: 0.021,
      }),
    );
  });

  it('blocks trades at exactly 2% due to max risk but not hard stop', () => {
    const result = engine.validateNewTrade(createRiskContext({ equity: 100_000 }), {
      tradeRiskAmount: 2_000,
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        code: RiskViolationCode.MAX_RISK_PER_TRADE,
        limit: 0.01,
        actual: 0.02,
      }),
    ]);
  });

  it('blocks new trades when portfolio drawdown reaches 15%', () => {
    const result = engine.validateNewTrade(
      createRiskContext({ equity: 85_000, peakEquity: 100_000 }),
      { tradeRiskAmount: 500 },
    );

    expect(result.allowed).toBe(false);
    expect(result.drawdownPct).toBe(0.15);
    expect(result.violations).toEqual([
      expect.objectContaining({
        code: RiskViolationCode.PORTFOLIO_DRAWDOWN,
        limit: 0.15,
        actual: 0.15,
      }),
    ]);
  });

  it('allows new trades just below 15% drawdown', () => {
    const result = engine.validateNewTrade(
      createRiskContext({ equity: 85_001, peakEquity: 100_000 }),
      { tradeRiskAmount: 850 },
    );

    expect(result.allowed).toBe(true);
    expect(result.drawdownPct).toBeLessThan(0.15);
  });

  it('returns multiple violations when both risk and drawdown limits are breached', () => {
    const result = engine.validateNewTrade(
      createRiskContext({ equity: 80_000, peakEquity: 100_000 }),
      { tradeRiskAmount: 2_500 },
    );

    expect(result.allowed).toBe(false);
    expect(result.violations.map((violation) => violation.code)).toEqual([
      RiskViolationCode.HARD_STOP_RISK,
      RiskViolationCode.PORTFOLIO_DRAWDOWN,
    ]);
  });

  it('throws RiskViolationError from assertNewTradeAllowed', () => {
    expect(() =>
      engine.assertNewTradeAllowed(createRiskContext({ equity: 100_000 }), {
        tradeRiskAmount: 3_000,
      }),
    ).toThrow(RiskViolationError);
  });

  it('rejects invalid engine configuration', () => {
    expect(
      () =>
        new RiskEngine({
          maxRiskPerTradePct: 0.02,
          hardStopRiskPerTradePct: 0.01,
          maxPortfolioDrawdownPct: 0.15,
        }),
    ).toThrow(InvalidRiskRequestError);
  });
});

describe('RiskEngine with portfolio context', () => {
  it('blocks defined-risk spread entries that exceed 1% of equity', () => {
    const engine = createRiskEngine(createRiskEngineConfig());
    const equity = 100_000;
    const maxLossPerUnit = 295;
    const quantity = 50;
    const tradeRiskAmount = maxLossPerUnit * quantity;

    const result = engine.validateNewTrade(createRiskContext({ equity }), {
      tradeRiskAmount,
    });

    expect(result.tradeRiskPct).toBe(0.1475);
    expect(result.allowed).toBe(false);
    expect(result.violations[0]?.code).toBe(RiskViolationCode.HARD_STOP_RISK);
  });

  it('allows sized defined-risk entries within 1% risk', () => {
    const engine = createRiskEngine(createRiskEngineConfig());
    const equity = 100_000;
    const maxLossPerUnit = 200;
    const quantity = 5;
    const tradeRiskAmount = maxLossPerUnit * quantity;

    const result = engine.validateNewTrade(createRiskContext({ equity }), {
      tradeRiskAmount,
    });

    expect(result.tradeRiskPct).toBe(0.01);
    expect(result.allowed).toBe(true);
  });
});
