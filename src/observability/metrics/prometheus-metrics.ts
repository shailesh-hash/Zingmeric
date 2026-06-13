import { Counter, Gauge, Histogram } from 'prom-client';
import {
  BACKTEST_DURATION_BUCKETS,
  METRIC_HELP,
  METRIC_LABELS,
  METRIC_NAMES,
} from './metric-definitions.js';
import { getMetricRegistry } from './metric-registry.js';

export interface PrometheusMetricsBundle {
  backtestDurationSeconds: Histogram<'strategy' | 'status'>;
  backtestRunsTotal: Counter<'strategy' | 'status'>;
  strategySignalsGeneratedTotal: Counter<'strategy' | 'signal_action'>;
  strategyErrorsTotal: Counter<'strategy' | 'error_type'>;
  ordersExecutedTotal: Counter<'strategy' | 'side'>;
  positionsOpenedTotal: Counter<'strategy' | 'position_type'>;
  portfolioValue: Gauge<'portfolio_id' | 'portfolio_mode'>;
  drawdownPercentage: Gauge<'portfolio_id' | 'portfolio_mode'>;
}

let metricsBundle: PrometheusMetricsBundle | undefined;

export function registerPrometheusMetrics(): PrometheusMetricsBundle {
  if (metricsBundle) {
    return metricsBundle;
  }

  const register = getMetricRegistry();

  metricsBundle = {
    backtestDurationSeconds: new Histogram({
      name: METRIC_NAMES.BACKTEST_DURATION_SECONDS,
      help: METRIC_HELP.BACKTEST_DURATION_SECONDS,
      labelNames: [METRIC_LABELS.STRATEGY, METRIC_LABELS.STATUS],
      buckets: BACKTEST_DURATION_BUCKETS,
      registers: [register],
    }),
    backtestRunsTotal: new Counter({
      name: METRIC_NAMES.BACKTEST_RUNS_TOTAL,
      help: METRIC_HELP.BACKTEST_RUNS_TOTAL,
      labelNames: [METRIC_LABELS.STRATEGY, METRIC_LABELS.STATUS],
      registers: [register],
    }),
    strategySignalsGeneratedTotal: new Counter({
      name: METRIC_NAMES.STRATEGY_SIGNALS_GENERATED_TOTAL,
      help: METRIC_HELP.STRATEGY_SIGNALS_GENERATED_TOTAL,
      labelNames: [METRIC_LABELS.STRATEGY, METRIC_LABELS.SIGNAL_ACTION],
      registers: [register],
    }),
    strategyErrorsTotal: new Counter({
      name: METRIC_NAMES.STRATEGY_ERRORS_TOTAL,
      help: METRIC_HELP.STRATEGY_ERRORS_TOTAL,
      labelNames: [METRIC_LABELS.STRATEGY, METRIC_LABELS.ERROR_TYPE],
      registers: [register],
    }),
    ordersExecutedTotal: new Counter({
      name: METRIC_NAMES.ORDERS_EXECUTED_TOTAL,
      help: METRIC_HELP.ORDERS_EXECUTED_TOTAL,
      labelNames: [METRIC_LABELS.STRATEGY, METRIC_LABELS.SIDE],
      registers: [register],
    }),
    positionsOpenedTotal: new Counter({
      name: METRIC_NAMES.POSITIONS_OPENED_TOTAL,
      help: METRIC_HELP.POSITIONS_OPENED_TOTAL,
      labelNames: [METRIC_LABELS.STRATEGY, METRIC_LABELS.POSITION_TYPE],
      registers: [register],
    }),
    portfolioValue: new Gauge({
      name: METRIC_NAMES.PORTFOLIO_VALUE,
      help: METRIC_HELP.PORTFOLIO_VALUE,
      labelNames: [METRIC_LABELS.PORTFOLIO_ID, METRIC_LABELS.PORTFOLIO_MODE],
      registers: [register],
    }),
    drawdownPercentage: new Gauge({
      name: METRIC_NAMES.DRAWDOWN_PERCENTAGE,
      help: METRIC_HELP.DRAWDOWN_PERCENTAGE,
      labelNames: [METRIC_LABELS.PORTFOLIO_ID, METRIC_LABELS.PORTFOLIO_MODE],
      registers: [register],
    }),
  };

  return metricsBundle;
}

export function getPrometheusMetrics(): PrometheusMetricsBundle | undefined {
  return metricsBundle;
}

export function resetPrometheusMetricsForTests(): void {
  metricsBundle = undefined;
}
