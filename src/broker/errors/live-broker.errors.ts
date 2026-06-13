import { OrderRejectedError } from './broker.errors.js';

export class BrokerApiError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly operation: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'BrokerApiError';
  }
}

export class BrokerUnavailableError extends BrokerApiError {
  constructor(provider: string, operation: string, cause?: unknown) {
    super(`Broker unavailable during ${operation}`, provider, operation, cause);
    this.name = 'BrokerUnavailableError';
  }
}

export class InstrumentNotFoundError extends Error {
  constructor(
    readonly instrumentId: string,
    readonly provider: string,
  ) {
    super(`Instrument not found: ${instrumentId} (${provider})`);
    this.name = 'InstrumentNotFoundError';
  }
}

export class BrokerRetryExhaustedError extends Error {
  constructor(
    readonly operation: string,
    readonly attempts: number,
    readonly lastError: unknown,
  ) {
    super(`Broker retry exhausted for ${operation} after ${String(attempts)} attempts`);
    this.name = 'BrokerRetryExhaustedError';
  }
}

export function isRetryableBrokerError(error: unknown): boolean {
  if (error instanceof BrokerUnavailableError) {
    return true;
  }

  if (error instanceof OrderRejectedError) {
    return false;
  }

  if (error instanceof BrokerApiError) {
    return false;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('429')
    );
  }

  return false;
}
