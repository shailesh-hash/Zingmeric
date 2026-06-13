import type {
  ForwardExecutionRecord,
  ForwardTestMetricsSnapshot,
} from '../types/forward-test.types.js';

export class ForwardTestMetricsCollector {
  private totalRuns = 0;
  private totalExecutions = 0;
  private totalExpectedPnl = 0;
  private totalActualPnl = 0;
  private totalSlippageCost = 0;

  recordRun(executions: ForwardExecutionRecord[]): void {
    this.totalRuns += 1;

    for (const execution of executions) {
      this.totalExecutions += 1;
      this.totalExpectedPnl += execution.expectedPnl;
      this.totalActualPnl += execution.actualPnl;
      this.totalSlippageCost += execution.slippageCost;
    }
  }

  snapshot(): ForwardTestMetricsSnapshot {
    return {
      totalRuns: this.totalRuns,
      totalExecutions: this.totalExecutions,
      totalExpectedPnl: this.totalExpectedPnl,
      totalActualPnl: this.totalActualPnl,
      totalSlippageCost: this.totalSlippageCost,
      averageSlippagePerExecution:
        this.totalExecutions > 0 ? this.totalSlippageCost / this.totalExecutions : 0,
      pnlVariance: this.totalActualPnl - this.totalExpectedPnl,
    };
  }
}

export function createForwardTestMetricsCollector(): ForwardTestMetricsCollector {
  return new ForwardTestMetricsCollector();
}

export function summarizeExecutions(
  executions: ForwardExecutionRecord[],
): Pick<
  ForwardTestMetricsSnapshot,
  'totalExpectedPnl' | 'totalActualPnl' | 'totalSlippageCost' | 'pnlVariance'
> {
  const totalExpectedPnl = executions.reduce((sum, row) => sum + row.expectedPnl, 0);
  const totalActualPnl = executions.reduce((sum, row) => sum + row.actualPnl, 0);
  const totalSlippageCost = executions.reduce((sum, row) => sum + row.slippageCost, 0);

  return {
    totalExpectedPnl,
    totalActualPnl,
    totalSlippageCost,
    pnlVariance: totalActualPnl - totalExpectedPnl,
  };
}
