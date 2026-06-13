export class BacktestNotFoundError extends Error {
  constructor(backtestRunId: string) {
    super(`Backtest run not found: ${backtestRunId}`);
    this.name = 'BacktestNotFoundError';
  }
}
