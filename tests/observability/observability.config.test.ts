import { loadObservabilityConfig } from '../../src/observability/config/observability.config.js';

describe('loadObservabilityConfig', () => {
  it('disables observability in test environment by default', () => {
    const config = loadObservabilityConfig({
      NODE_ENV: 'test',
    });

    expect(config.enabled).toBe(false);
  });

  it('enables observability when explicitly configured', () => {
    const config = loadObservabilityConfig({
      NODE_ENV: 'development',
      OBSERVABILITY_ENABLED: 'true',
      OTEL_SDK_DISABLED: 'false',
    });

    expect(config.enabled).toBe(true);
    expect(config.serviceName).toBe('algotrader');
    expect(config.metricsPort).toBe(9464);
  });

  it('respects OTEL_SDK_DISABLED', () => {
    const config = loadObservabilityConfig({
      NODE_ENV: 'development',
      OBSERVABILITY_ENABLED: 'true',
      OTEL_SDK_DISABLED: 'true',
    });

    expect(config.enabled).toBe(false);
  });

  it('loads optional trace exporter endpoint', () => {
    const config = loadObservabilityConfig({
      NODE_ENV: 'development',
      OBSERVABILITY_ENABLED: 'true',
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://localhost:4318/v1/traces',
    });

    expect(config.traceExporterEndpoint).toBe('http://localhost:4318/v1/traces');
  });
});
