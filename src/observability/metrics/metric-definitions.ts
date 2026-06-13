/** Prometheus metric names (snake_case, standard suffixes). */
export const METRIC_NAMES = {
  BACKTEST_DURATION_SECONDS: 'backtest_duration_seconds',
  BACKTEST_RUNS_TOTAL: 'backtest_runs_total',
  STRATEGY_SIGNALS_GENERATED_TOTAL: 'strategy_signals_generated_total',
  STRATEGY_ERRORS_TOTAL: 'strategy_errors_total',
  ORDERS_EXECUTED_TOTAL: 'orders_executed_total',
  POSITIONS_OPENED_TOTAL: 'positions_opened_total',
  PORTFOLIO_VALUE: 'portfolio_value',
  DRAWDOWN_PERCENTAGE: 'drawdown_percentage',
} as const;

export const METRIC_LABELS = {
  STRATEGY: 'strategy',
  STATUS: 'status',
  SIGNAL_ACTION: 'signal_action',
  ERROR_TYPE: 'error_type',
  SIDE: 'side',
  POSITION_TYPE: 'position_type',
  PORTFOLIO_ID: 'portfolio_id',
  PORTFOLIO_MODE: 'portfolio_mode',
} as const;

export const METRIC_HELP = {
  BACKTEST_DURATION_SECONDS: 'Duration of backtest runs in seconds',
  BACKTEST_RUNS_TOTAL: 'Total number of backtest runs completed',
  STRATEGY_SIGNALS_GENERATED_TOTAL: 'Total number of strategy signals generated',
  STRATEGY_ERRORS_TOTAL: 'Total number of strategy evaluation errors',
  ORDERS_EXECUTED_TOTAL: 'Total number of simulated or live orders executed',
  POSITIONS_OPENED_TOTAL: 'Total number of positions opened',
  PORTFOLIO_VALUE: 'Current portfolio value in account currency',
  DRAWDOWN_PERCENTAGE: 'Current portfolio drawdown as a percentage (0-100)',
} as const;

export const BACKTEST_DURATION_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300];

export type BacktestStatus = 'success' | 'error';
export type OrderSide = 'buy' | 'sell';
export type PositionType = 'equity' | 'defined_risk' | 'option' | 'future';
