import { createBacktestReportService } from './backtest-report.service.js';
import type { BacktestReport } from '../types/backtest-report.type.js';
import type { BacktestReportGenerateInput } from './backtest-report.dto.js';

export type BacktestReportInput = BacktestReportGenerateInput;

export class BacktestReportGenerator {
  private readonly reportService = createBacktestReportService();

  generate(input: BacktestReportInput): BacktestReport {
    return this.reportService.generate(input);
  }
}

export function createBacktestReportGenerator(): BacktestReportGenerator {
  return new BacktestReportGenerator();
}
