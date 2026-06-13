import type { Broker } from '../broker.interface.js';
import type {
  BrokerFill,
  BrokerOrder,
  BrokerPnlSummary,
  BrokerPositionView,
  CancelOrderResult,
  PlaceOrderRequest,
  PlaceOrderResult,
} from '../types/broker.types.js';
import { DEFAULT_RETRY_POLICY, type RetryPolicy } from './retry/retry-policy.js';
import { withBrokerRetry } from './retry/with-broker-retry.js';

export interface LiveBrokerAdapterConfig {
  provider?: string;
  retryPolicy?: RetryPolicy;
  sleep?: (ms: number) => Promise<void>;
}

export abstract class LiveBrokerAdapter implements Broker {
  protected readonly provider: string;
  private readonly retryPolicy: RetryPolicy;
  private readonly sleep?: (ms: number) => Promise<void>;

  constructor(config: LiveBrokerAdapterConfig) {
    this.provider = config.provider ?? 'live';
    this.retryPolicy = config.retryPolicy ?? DEFAULT_RETRY_POLICY;
    this.sleep = config.sleep;
  }

  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    return withBrokerRetry('placeOrder', () => this.placeOrderInternal(request), {
      policy: this.retryPolicy,
      sleep: this.sleep,
    });
  }

  async cancelOrder(orderId: string): Promise<CancelOrderResult> {
    return withBrokerRetry('cancelOrder', () => this.cancelOrderInternal(orderId), {
      policy: this.retryPolicy,
      sleep: this.sleep,
    });
  }

  async getPositions(): Promise<BrokerPositionView[]> {
    return withBrokerRetry('getPositions', () => this.getPositionsInternal(), {
      policy: this.retryPolicy,
      sleep: this.sleep,
    });
  }

  abstract getPnlSummary(): BrokerPnlSummary;
  abstract getFills(): BrokerFill[];
  abstract getOrders(): BrokerOrder[];

  protected abstract placeOrderInternal(request: PlaceOrderRequest): Promise<PlaceOrderResult>;

  protected abstract cancelOrderInternal(orderId: string): Promise<CancelOrderResult>;

  protected abstract getPositionsInternal(): Promise<BrokerPositionView[]>;
}
