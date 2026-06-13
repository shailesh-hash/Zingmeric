import {
  BrokerRetryExhaustedError,
  BrokerUnavailableError,
  DEFAULT_RETRY_POLICY,
  withBrokerRetry,
} from '../../../src/broker/index.js';

function createSleepSpy() {
  let calls = 0;
  const sleep = (_ms: number): Promise<void> => {
    calls += 1;
    return Promise.resolve();
  };

  return {
    sleep,
    getCalls: () => calls,
  };
}

describe('withBrokerRetry', () => {
  it('returns immediately on success', async () => {
    const { sleep, getCalls } = createSleepSpy();
    let calls = 0;

    const result = await withBrokerRetry(
      'placeOrder',
      () => {
        calls += 1;
        return Promise.resolve('ok');
      },
      { policy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 3 }, sleep },
    );

    expect(result).toBe('ok');
    expect(calls).toBe(1);
    expect(getCalls()).toBe(0);
  });

  it('retries retryable broker errors until success', async () => {
    const { sleep, getCalls } = createSleepSpy();
    let calls = 0;

    const result = await withBrokerRetry(
      'getPositions',
      () => {
        calls += 1;
        if (calls < 3) {
          return Promise.reject(new BrokerUnavailableError('upstox', 'getPositions'));
        }
        return Promise.resolve(['position']);
      },
      { policy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 3 }, sleep },
    );

    expect(result).toEqual(['position']);
    expect(calls).toBe(3);
    expect(getCalls()).toBe(2);
  });

  it('does not retry non-retryable validation errors', async () => {
    const { sleep, getCalls } = createSleepSpy();
    let calls = 0;

    await expect(
      withBrokerRetry(
        'placeOrder',
        () => {
          calls += 1;
          return Promise.reject(new Error('invalid quantity'));
        },
        { policy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 3 }, sleep },
      ),
    ).rejects.toThrow('invalid quantity');

    expect(calls).toBe(1);
    expect(getCalls()).toBe(0);
  });

  it('throws BrokerRetryExhaustedError when retries are exhausted', async () => {
    const { sleep, getCalls } = createSleepSpy();

    await expect(
      withBrokerRetry(
        'cancelOrder',
        () => Promise.reject(new BrokerUnavailableError('zerodha', 'cancelOrder')),
        { policy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 }, sleep },
      ),
    ).rejects.toBeInstanceOf(BrokerRetryExhaustedError);

    expect(getCalls()).toBe(1);
  });
});
