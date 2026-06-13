import { InvalidBacktestRequestError } from '../errors/backtest.errors.js';
import type { BacktestReport } from '../types/backtest-report.type.js';
import { createBacktestReportMetadata } from '../types/backtest-report.type.js';
import type {
  BacktestReportCsvBundle,
  BacktestReportExportOptions,
  BacktestReportGenerateInput,
} from './backtest-report.dto.js';
import {
  serializeBacktestReportCsv,
  serializeBacktestReportCsvBundle,
  serializeBacktestReportJson,
} from './backtest-report.export.js';
import { calculateBacktestPerformanceMetrics } from './backtest-performance-metrics.js';

export class BacktestReportService {
  generate(input: BacktestReportGenerateInput): BacktestReport {
    this.validateInput(input);

    const metrics = calculateBacktestPerformanceMetrics({
      equityCurve: input.equityCurve,
      trades: input.trades,
      initialCapital: input.initialCapital,
      startDate: input.startDate,
      endDate: input.endDate,
      riskFreeRate: input.riskFreeRate,
    });

    return {
      metadata: createBacktestReportMetadata(),
      instrumentId: input.instrumentId,
      symbol: input.symbol,
      strategyName: input.strategyName,
      startDate: input.startDate,
      endDate: input.endDate,
      metrics,
      trades: input.trades,
      positions: input.positions,
      equityCurve: input.equityCurve,
    };
  }

  exportToJson(report: BacktestReport, options?: BacktestReportExportOptions): string {
    return serializeBacktestReportJson(report, options);
  }

  exportToCsv(report: BacktestReport): string {
    return serializeBacktestReportCsv(report);
  }

  exportToCsvBundle(report: BacktestReport): BacktestReportCsvBundle {
    return serializeBacktestReportCsvBundle(report);
  }

  private validateInput(input: BacktestReportGenerateInput): void {
    if (input.initialCapital <= 0) {
      throw new InvalidBacktestRequestError('initialCapital must be greater than zero');
    }

    if (input.equityCurve.length === 0) {
      throw new InvalidBacktestRequestError('equityCurve must contain at least one point');
    }

    if (input.endDate.getTime() < input.startDate.getTime()) {
      throw new InvalidBacktestRequestError('endDate must be on or after startDate');
    }

    if (!input.instrumentId.trim()) {
      throw new InvalidBacktestRequestError('instrumentId is required');
    }

    if (!input.strategyName.trim()) {
      throw new InvalidBacktestRequestError('strategyName is required');
    }
  }
}

export function createBacktestReportService(): BacktestReportService {
  return new BacktestReportService();
}
