import { createBacktestSignalEngine } from '../../src/backtest/index.js';
import { BullPutSpreadStrategy } from '../../src/strategies/spreads/bull-put-spread.strategy.js';
import { createMarketSnapshot } from '../../src/strategies/types/market-snapshot.type.js';
import { SignalAction } from '../../src/strategies/types/signal.type.js';

describe('BacktestSignalEngine', () => {
  it('generates signals from strategy evaluation', () => {
    const strategy = new BullPutSpreadStrategy();
    const engine = createBacktestSignalEngine(strategy);

    const signal = engine.generateSignal(
      createMarketSnapshot({
        timestamp: new Date('2024-01-15T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        price: 22_000,
        optionChain: {
          expiryDate: new Date('2024-01-25T00:00:00.000Z'),
          underlyingPrice: 22_000,
          puts: [
            { strike: 21_500, premium: 25, delta: 0.05 },
            { strike: 21_850, premium: 80, delta: 0.15 },
          ],
          calls: [],
        },
      }),
    );

    expect(engine.strategyName).toBe('bull-put-spread');
    expect(signal.action).toBe(SignalAction.BUY);
    expect(signal.strategyName).toBe('bull-put-spread');
  });
});
