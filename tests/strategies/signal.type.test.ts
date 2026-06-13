import {
  SignalAction,
  createSignal,
  isSignalAction,
} from '../../src/strategies/types/signal.type.js';

describe('Signal types', () => {
  it('identifies valid signal actions', () => {
    expect(isSignalAction(SignalAction.BUY)).toBe(true);
    expect(isSignalAction(SignalAction.SELL)).toBe(true);
    expect(isSignalAction(SignalAction.HOLD)).toBe(true);
    expect(isSignalAction('WAIT')).toBe(false);
  });

  it('creates a typed signal', () => {
    const timestamp = new Date('2024-01-15T09:15:00.000Z');

    expect(
      createSignal({
        action: SignalAction.BUY,
        strategyName: 'bull-put-spread',
        timestamp,
        instrumentId: 'inst-nifty',
        reason: 'Entry conditions met',
      }),
    ).toEqual({
      action: SignalAction.BUY,
      strategyName: 'bull-put-spread',
      timestamp,
      instrumentId: 'inst-nifty',
      reason: 'Entry conditions met',
    });
  });
});
