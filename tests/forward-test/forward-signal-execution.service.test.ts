import { createPaperBroker, OrderSide } from '../../src/broker/index.js';
import { createForwardSignalExecutionService } from '../../src/forward-test/execution/forward-signal-execution.service.js';
import { createMarketSnapshot } from '../../src/strategies/types/market-snapshot.type.js';
import { createSignal, SignalAction } from '../../src/strategies/types/signal.type.js';

describe('ForwardSignalExecutionService', () => {
  it('records expected versus actual pnl and slippage on close', async () => {
    const broker = createPaperBroker({ initialCapital: 100_000, includeCosts: true });
    const execution = createForwardSignalExecutionService(broker, { lotSize: 50 });
    const timestamp = new Date('2024-01-15T09:15:00.000Z');

    const snapshot = createMarketSnapshot({
      timestamp,
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      price: 22_000,
    });

    await execution.executeSignal(
      createSignal({
        action: SignalAction.BUY,
        strategyName: 'bull-put-spread-v1',
        timestamp,
        instrumentId: 'inst-nifty',
        execution: {
          kind: 'OPEN_DEFINED_RISK',
          entryCredit: 55,
          maxLoss: 295,
          quantity: 50,
        },
      }),
      snapshot,
    );

    const closeRecords = await execution.executeSignal(
      createSignal({
        action: SignalAction.SELL,
        strategyName: 'bull-put-spread-v1',
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        execution: {
          kind: 'CLOSE_DEFINED_RISK',
          closeCost: 25,
        },
      }),
      createMarketSnapshot({
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        instrumentId: 'inst-nifty',
        symbol: 'NIFTY',
        price: 21_950,
      }),
    );

    expect(closeRecords).toHaveLength(1);
    expect(closeRecords[0]?.side).toBe(OrderSide.SELL);
    expect(closeRecords[0]?.expectedPnl).toBe(1_500);
    expect(closeRecords[0]?.actualPnl).toBeGreaterThan(0);
    expect(closeRecords[0]?.slippageCost).toBeGreaterThanOrEqual(0);
  });
});
