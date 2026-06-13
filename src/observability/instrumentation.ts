import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';
import { loadObservabilityConfig } from './config/observability.config.js';
import { createMetricsService, MetricsService } from './metrics/metrics.service.js';
import { noOpMetricsService } from './metrics/noop-metrics.service.js';
import { registerPrometheusMetrics } from './metrics/prometheus-metrics.js';
import { TracingService } from './tracing/tracing.service.js';
import { noOpTracingService } from './tracing/noop-tracing.service.js';

let sdk: NodeSDK | undefined;
let metricsService: MetricsService | typeof noOpMetricsService = noOpMetricsService;
let tracingService: TracingService | typeof noOpTracingService = noOpTracingService;

export function startObservability(): void {
  const config = loadObservabilityConfig();

  registerPrometheusMetrics();

  if (!config.enabled) {
    return;
  }

  const traceExporter = config.traceExporterEndpoint
    ? new OTLPTraceExporter({ url: config.traceExporterEndpoint })
    : undefined;

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment,
    }),
    traceExporter,
    instrumentations: [new HttpInstrumentation(), new PrismaInstrumentation()],
  });

  sdk.start();

  const prometheusMetrics = registerPrometheusMetrics();
  metricsService = createMetricsService(prometheusMetrics);
  tracingService = new TracingService(config.serviceName);
}

export async function shutdownObservability(): Promise<void> {
  if (!sdk) {
    return;
  }

  await sdk.shutdown();
  sdk = undefined;
  metricsService = noOpMetricsService;
  tracingService = noOpTracingService;
}

export function getMetricsService(): MetricsService | typeof noOpMetricsService {
  return metricsService;
}

export function getTracingService(): TracingService | typeof noOpTracingService {
  return tracingService;
}

export function isObservabilityEnabled(): boolean {
  return loadObservabilityConfig().enabled;
}
