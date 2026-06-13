import { collectDefaultMetrics, Registry } from 'prom-client';

let registry: Registry | undefined;

export function getMetricRegistry(): Registry {
  if (!registry) {
    registry = new Registry();

    if (process.env.NODE_ENV !== 'test') {
      collectDefaultMetrics({ register: registry, prefix: 'algotrader_' });
    }
  }

  return registry;
}

export function resetMetricRegistryForTests(): void {
  registry = undefined;
}

export async function getMetricsPayload(): Promise<string> {
  return getMetricRegistry().metrics();
}

export function getMetricsContentType(): string {
  return getMetricRegistry().contentType;
}
