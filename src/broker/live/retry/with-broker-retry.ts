import { BrokerRetryExhaustedError } from '../../errors/live-broker.errors.js';
import { isRetryableBrokerError } from '../../errors/live-broker.errors.js';
import { computeRetryDelayMs, DEFAULT_RETRY_POLICY, type RetryPolicy } from './retry-policy.js';

export interface RetryContext {
  operation: string;
  policy: RetryPolicy;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function withBrokerRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  context: Partial<RetryContext> = {},
): Promise<T> {
  const policy = context.policy ?? DEFAULT_RETRY_POLICY;
  const sleep = context.sleep ?? defaultSleep;
  let lastError: unknown;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt >= policy.maxAttempts;
      if (isLastAttempt || !isRetryableBrokerError(error)) {
        if (isLastAttempt && isRetryableBrokerError(error)) {
          throw new BrokerRetryExhaustedError(operation, attempt, error);
        }

        throw error;
      }

      await sleep(computeRetryDelayMs(attempt, policy));
    }
  }

  throw new BrokerRetryExhaustedError(operation, policy.maxAttempts, lastError);
}
