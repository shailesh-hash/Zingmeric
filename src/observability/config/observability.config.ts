export interface ObservabilityConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  metricsHost: string;
  metricsPort: number;
  traceExporterEndpoint?: string;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value === 'true' || value === '1';
}

export function loadObservabilityConfig(env: NodeJS.ProcessEnv = process.env): ObservabilityConfig {
  const environment = env.NODE_ENV ?? 'development';
  const otelDisabled = parseBoolean(env.OTEL_SDK_DISABLED, false);

  return {
    enabled: parseBoolean(env.OBSERVABILITY_ENABLED, environment !== 'test') && !otelDisabled,
    serviceName: env.OTEL_SERVICE_NAME ?? 'algotrader',
    serviceVersion: env.OTEL_SERVICE_VERSION ?? '0.1.0',
    environment,
    metricsHost: env.METRICS_HOST ?? '0.0.0.0',
    metricsPort: Number(env.METRICS_PORT ?? 9464),
    traceExporterEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  };
}
