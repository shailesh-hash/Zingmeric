import {
  BacktestEventType,
  createEngineSignalEvent,
  createEngineOrderFilledEvent,
  createEnginePositionOpenedEvent,
  createEnginePositionClosedEvent,
  resetBacktestEventCounter,
} from '../../src/backtest/engine/index.js';
import { SignalAction, createSignal } from '../../src/strategies/types/signal.type.js';

describe('backtest event factories', () => {
  beforeEach(() => {
    resetBacktestEventCounter();
  });

  it('creates signal events', () => {
    const timestamp = new Date('2024-01-15T09:15:00.000Z');
    const event = createEngineSignalEvent({
      timestamp,
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      signal: createSignal({
        action: SignalAction.BUY,
        strategyName: 'bull-put-spread',
        timestamp,
        instrumentId: 'inst-nifty',
      }),
    });

    expect(event.type).toBe(BacktestEventType.SIGNAL);
    expect(event.signal.action).toBe(SignalAction.BUY);
  });

  it('creates order filled events', () => {
    const event = createEngineOrderFilledEvent({
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      orderId: 'ord-1',
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      strategyName: 'bull-put-spread',
      side: 'SELL',
      quantity: 50,
      fillPrice: 120,
    });

    expect(event.type).toBe(BacktestEventType.ORDER_FILLED);
    expect(event.side).toBe('SELL');
  });

  it('creates position lifecycle events', () => {
    const opened = createEnginePositionOpenedEvent({
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      positionId: 'pos-1',
      strategyName: 'bull-put-spread',
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      quantity: 50,
      entryValue: 5_000,
    });

    const closed = createEnginePositionClosedEvent({
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
      positionId: 'pos-1',
      strategyName: 'bull-put-spread',
      instrumentId: 'inst-nifty',
      symbol: 'NIFTY',
      quantity: 50,
      exitValue: 4_200,
      realizedPnl: 800,
    });

    expect(opened.type).toBe(BacktestEventType.POSITION_OPENED);
    expect(closed.type).toBe(BacktestEventType.POSITION_CLOSED);
    expect(closed.realizedPnl).toBe(800);
  });
});
