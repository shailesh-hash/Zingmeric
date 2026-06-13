import type { Broker } from '../broker.interface.js';
import { createPaperBroker } from '../paper/paper-broker.js';
import { createUpstoxBroker } from '../upstox/upstox-broker.js';
import { createZerodhaBroker } from '../zerodha/zerodha-broker.js';
import type { LiveBrokerFactoryConfig } from './live-broker.types.js';

export function createLiveBroker(config: LiveBrokerFactoryConfig): Broker {
  switch (config.provider) {
    case 'paper':
      return createPaperBroker(config.paper);
    case 'zerodha':
      return createZerodhaBroker({
        client: config.zerodha.client,
        instrumentResolver: config.zerodha.instrumentResolver,
        brokerConfig: config.zerodha.config,
        retryPolicy: config.retry?.retryPolicy,
        sleep: config.retry?.sleep,
      });
    case 'upstox':
      return createUpstoxBroker({
        client: config.upstox.client,
        instrumentResolver: config.upstox.instrumentResolver,
        brokerConfig: config.upstox.config,
        retryPolicy: config.retry?.retryPolicy,
        sleep: config.retry?.sleep,
      });
    default: {
      const exhaustive: never = config;
      throw new Error(`Unsupported broker provider: ${String(exhaustive)}`);
    }
  }
}
