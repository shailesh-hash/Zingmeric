import type { Broker } from '../broker.interface.js';
import type { PaperBrokerConfig } from '../types/broker.types.js';
import type { KiteApiClient } from '../zerodha/kite-api.client.interface.js';
import type { ZerodhaInstrumentResolver } from '../zerodha/instrument-resolver.js';
import type { ZerodhaBrokerConfig } from '../zerodha/types/zerodha.types.js';
import type { UpstoxApiClient } from '../upstox/upstox-api.client.interface.js';
import type { UpstoxInstrumentResolver } from '../upstox/upstox.instrument-resolver.js';
import type { UpstoxBrokerConfig } from '../upstox/types/upstox.types.js';
import type { RetryPolicy } from './retry/retry-policy.js';

export type BrokerProvider = 'paper' | 'zerodha' | 'upstox';

export interface LiveBrokerRetryConfig {
  retryPolicy?: RetryPolicy;
  sleep?: (ms: number) => Promise<void>;
}

export type LiveBrokerFactoryConfig =
  | {
      provider: 'paper';
      paper: PaperBrokerConfig;
    }
  | {
      provider: 'zerodha';
      zerodha: {
        client: KiteApiClient;
        instrumentResolver: ZerodhaInstrumentResolver;
        config?: ZerodhaBrokerConfig;
      };
      retry?: LiveBrokerRetryConfig;
    }
  | {
      provider: 'upstox';
      upstox: {
        client: UpstoxApiClient;
        instrumentResolver: UpstoxInstrumentResolver;
        config?: UpstoxBrokerConfig;
      };
      retry?: LiveBrokerRetryConfig;
    };

export type BrokerExecutionPort = Broker;
