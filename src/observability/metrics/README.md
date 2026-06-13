# Observability — Prometheus Metrics

Business metrics exported in Prometheus text format at **`GET /metrics`** on the application port.

## Metric Catalog (Grafana-ready)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `backtest_duration_seconds` | histogram | `strategy`, `status` | Backtest run duration |
| `backtest_runs_total` | counter | `strategy`, `status` | Backtest runs completed |
| `strategy_signals_generated_total` | counter | `strategy`, `signal_action` | Signals produced |
| `strategy_errors_total` | counter | `strategy`, `error_type` | Strategy evaluation errors |
| `orders_executed_total` | counter | `strategy`, `side` | Orders filled (`buy`/`sell`) |
| `positions_opened_total` | counter | `strategy`, `position_type` | Positions opened |
| `portfolio_value` | gauge | `portfolio_id`, `portfolio_mode` | Current portfolio value |
| `drawdown_percentage` | gauge | `portfolio_id`, `portfolio_mode` | Drawdown % (0–100) |

Node.js process metrics are also exported with the `algotrader_` prefix via `prom-client` default collectors.

## Example Grafana Queries

```promql
# Backtest p95 duration by strategy
histogram_quantile(0.95, sum by (strategy, le) (rate(backtest_duration_seconds_bucket[5m])))

# Signal rate
sum by (strategy) (rate(strategy_signals_generated_total[5m]))

# Error ratio
sum(rate(strategy_errors_total[5m])) / sum(rate(strategy_signals_generated_total[5m]))

# Portfolio value over time
portfolio_value{portfolio_mode="backtest"}

# Max drawdown panel
max(drawdown_percentage) by (portfolio_id)
```

## Module Layout

```
src/observability/metrics/
├── metric-definitions.ts      # Names, help text, buckets
├── metric-registry.ts         # prom-client Registry
├── prometheus-metrics.ts      # Metric registration
├── metrics.service.ts         # Recording API
├── noop-metrics.service.ts    # Disabled mode
├── middleware/
│   └── prometheus-metrics.middleware.ts
└── index.ts
```

## Local Stack

```bash
docker compose up -d prometheus grafana
npm run dev
curl http://localhost:3000/metrics
```

Prometheus scrapes `host.docker.internal:3000` (see `docker/observability/prometheus.yml`).
