# Backtest Observability

Prometheus metrics and OpenTelemetry traces emitted automatically during historical replay.

## BacktestMetricsPublisher

Central publisher that records backtest-scoped metrics with portfolio context (`portfolio_id`, `portfolio_mode`).

| Concern | Prometheus Metric | How It Is Emitted |
|---------|-------------------|-------------------|
| Backtest duration | `backtest_duration_seconds` | `beginReplay()` / `finishReplay()` |
| Trades executed | `orders_executed_total` | `ORDER_FILLED` events or explicit `recordOrderExecuted()` |
| Strategy errors | `strategy_errors_total` | `StrategyEngine` via publisher or `SIGNAL` path |
| Portfolio value | `portfolio_value` | `recordPortfolioEquity()` after mark-to-market |
| Drawdown | `drawdown_percentage` | Computed from session peak equity |

## Integration Points

### ReplayEngine

Pass `observability` on `ReplayInputDTO` to auto-subscribe the publisher during replay:

```typescript
replayEngine.replay({
  instrumentId: 'inst-nifty',
  symbol: 'NIFTY',
  candles,
  observability: {
    strategyName: 'bull-put-spread',
    portfolioId: 'inst-nifty-backtest',
    portfolioMode: 'backtest',
  },
});
```

Or inject a custom publisher via `ReplayOptions`:

```typescript
replayEngine.replay(input, subscribers, { metricsPublisher });
```

Tracing span: `backtest.replay` with strategy and instrument attributes.

### StrategyEngine

Pass the publisher as the third argument to `generateSignal()` during backtest runs:

```typescript
strategyEngine.generateSignal(snapshot, strategyName, metricsPublisher);
```

### PortfolioEngine

Attach the publisher via config:

```typescript
createPortfolioEngine({
  initialCapital: 100_000,
  metricsPublisher,
});
```

Position opens and mark-to-market updates emit portfolio value and drawdown gauges.

## Grafana Dashboard Recommendations

### Row 1 — Backtest Health

| Panel | Type | Query |
|-------|------|-------|
| Backtest runs / min | Stat | `sum(rate(backtest_runs_total{status="success"}[5m]))` |
| Backtest error rate | Stat | `sum(rate(backtest_runs_total{status="error"}[5m]))` |
| p95 backtest duration | Gauge | `histogram_quantile(0.95, sum by (le) (rate(backtest_duration_seconds_bucket[5m])))` |
| p50 backtest duration | Time series | `histogram_quantile(0.50, sum by (strategy, le) (rate(backtest_duration_seconds_bucket[5m])))` |

### Row 2 — Strategy Activity

| Panel | Type | Query |
|-------|------|-------|
| Signals by action | Bar gauge | `sum by (strategy, signal_action) (increase(strategy_signals_generated_total[1h]))` |
| Strategy errors | Time series | `sum by (strategy, error_type) (rate(strategy_errors_total[5m]))` |
| Error ratio | Stat | `sum(rate(strategy_errors_total[5m])) / sum(rate(strategy_signals_generated_total[5m]))` |

### Row 3 — Execution & Positions

| Panel | Type | Query |
|-------|------|-------|
| Trades executed | Time series | `sum by (strategy, side) (rate(orders_executed_total[5m]))` |
| Positions opened | Bar chart | `sum by (strategy, position_type) (increase(positions_opened_total[1h]))` |

### Row 4 — Portfolio Performance

| Panel | Type | Query |
|-------|------|-------|
| Portfolio value | Time series | `portfolio_value{portfolio_mode="backtest"}` |
| Drawdown % | Time series | `drawdown_percentage{portfolio_mode="backtest"}` |
| Max drawdown (24h) | Stat | `max(max_over_time(drawdown_percentage{portfolio_mode="backtest"}[24h]))` |

### Alerting Suggestions

```yaml
# High backtest failure rate
- alert: BacktestFailureRateHigh
  expr: sum(rate(backtest_runs_total{status="error"}[15m])) / sum(rate(backtest_runs_total[15m])) > 0.1
  for: 5m

# Strategy errors spiking
- alert: StrategyErrorsSpiking
  expr: sum(rate(strategy_errors_total[5m])) > 0.5
  for: 5m

# Drawdown threshold
- alert: BacktestDrawdownHigh
  expr: max(drawdown_percentage{portfolio_mode="backtest"}) > 20
  for: 1m
```

## Traces

| Span | Source |
|------|--------|
| `backtest.replay` | ReplayEngine |
| `backtest.run` | BacktestEngine |
| `backtest.event.metrics` | BacktestMetricsPublisher per event |
| `strategy.evaluate` | StrategyEngine |

Use Grafana Tempo or Jaeger with OTLP exporter (`OTEL_EXPORTER_OTLP_ENDPOINT`) to correlate slow backtests with strategy evaluation spans.
