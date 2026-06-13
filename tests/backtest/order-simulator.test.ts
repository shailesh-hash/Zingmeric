import { createBacktestConfig } from '../../src/backtest/types/backtest-config.type.js';
import { createPortfolioState } from '../../src/backtest/types/portfolio-state.type.js';
import { DefaultOrderSimulator } from '../../src/backtest/simulation/order-simulator.js';
import { createSignal, SignalAction } from '../../src/strategies/index.js';

describe('DefaultOrderSimulator', () => {
  const simulator = new DefaultOrderSimulator();

  const candle = {
    timestamp: new Date('2024-01-15T09:15:00.000Z'),
    open: 100,
    high: 105,
    low: 95,
    close: 100,
    volume: 1000,
  };

  it('executes a BUY and deducts cash including costs', () => {
    const portfolio = createPortfolioState(10_000);
    const config = createBacktestConfig({
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      strategyName: 'test',
      quantityPerTrade: 10,
      includeCosts: true,
    });

    const trade = simulator.execute(
      createSignal({
        action: SignalAction.BUY,
        strategyName: 'test',
        timestamp: candle.timestamp,
        instrumentId: 'inst-nifty',
      }),
      candle,
      portfolio,
      config,
    );

    expect(trade?.side).toBe('BUY');
    expect(trade?.quantity).toBe(10);
    expect(trade?.totalFees).toBeGreaterThan(0);
    expect(portfolio.position?.quantity).toBe(10);
    expect(portfolio.cash).toBeLessThan(10_000);
  });

  it('executes a SELL and records realized pnl', () => {
    const portfolio = createPortfolioState(10_000);
    portfolio.position = { quantity: 10, averagePrice: 90 };

    const config = createBacktestConfig({
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      strategyName: 'test',
      quantityPerTrade: 10,
      includeCosts: true,
    });

    const trade = simulator.execute(
      createSignal({
        action: SignalAction.SELL,
        strategyName: 'test',
        timestamp: candle.timestamp,
        instrumentId: 'inst-nifty',
      }),
      candle,
      portfolio,
      config,
    );

    expect(trade?.side).toBe('SELL');
    expect(trade?.realizedPnl).toBeGreaterThan(0);
    expect(portfolio.position).toBeNull();
    expect(portfolio.cash).toBeGreaterThan(10_000);
  });

  it('returns null for HOLD signals', () => {
    const portfolio = createPortfolioState(10_000);
    const config = createBacktestConfig({
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      strategyName: 'test',
    });

    const trade = simulator.execute(
      createSignal({
        action: SignalAction.HOLD,
        strategyName: 'test',
        timestamp: candle.timestamp,
        instrumentId: 'inst-nifty',
      }),
      candle,
      portfolio,
      config,
    );

    expect(trade).toBeNull();
  });
});
