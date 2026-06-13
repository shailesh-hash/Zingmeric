import { loadConfig } from '../../src/config/index.js';
import { buildServer } from '../../src/api/server.js';
import { METRIC_NAMES } from '../../src/observability/metrics/metric-definitions.js';
import {
  createMetricsService,
  registerPrometheusMetrics,
  resetMetricRegistryForTests,
  resetPrometheusMetricsForTests,
} from '../../src/observability/metrics/index.js';

describe('Prometheus /metrics middleware', () => {
  beforeEach(() => {
    resetMetricRegistryForTests();
    resetPrometheusMetricsForTests();
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test';
  });

  it('exposes Prometheus metrics at GET /metrics', async () => {
    const metrics = createMetricsService(registerPrometheusMetrics());
    metrics.recordBacktestRun(500, {
      strategyName: 'iron-condor',
      status: 'success',
    });

    const app = await buildServer(loadConfig());
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain(METRIC_NAMES.BACKTEST_RUNS_TOTAL);
    expect(response.body).toContain('strategy="iron-condor"');

    await app.close();
  });
});
