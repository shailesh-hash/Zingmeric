import type { BacktestReport } from '../types/backtest-report.type.js';
import type {
  BacktestReportCsvBundle,
  BacktestReportExportOptions,
} from './backtest-report.dto.js';

function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function formatCsvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map((value) => escapeCsvValue(value)).join(',');
}

function formatIsoDate(value: Date | undefined): string {
  return value?.toISOString() ?? '';
}

function formatProfitFactor(value: number): string {
  if (value === Number.POSITIVE_INFINITY) {
    return 'Infinity';
  }

  if (value === Number.NEGATIVE_INFINITY) {
    return '-Infinity';
  }

  return value.toFixed(6);
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(4);
}

export function serializeBacktestReportJson(
  report: BacktestReport,
  options: BacktestReportExportOptions = {},
): string {
  const payload = {
    metadata: {
      reportId: report.metadata.reportId,
      schemaVersion: report.metadata.schemaVersion,
      generatedAt: report.metadata.generatedAt.toISOString(),
    },
    run: {
      instrumentId: report.instrumentId,
      symbol: report.symbol,
      strategyName: report.strategyName,
      startDate: report.startDate.toISOString(),
      endDate: report.endDate.toISOString(),
    },
    performance: {
      cagr: report.metrics.cagr,
      sharpeRatio: report.metrics.sharpeRatio,
      sortinoRatio: report.metrics.sortinoRatio,
      maxDrawdown: report.metrics.maxDrawdown,
      profitFactor:
        report.metrics.profitFactor === Number.POSITIVE_INFINITY
          ? null
          : report.metrics.profitFactor,
      profitFactorIsInfinite: report.metrics.profitFactor === Number.POSITIVE_INFINITY,
      winRate: report.metrics.winRate,
      totalTrades: report.metrics.totalTrades,
      initialCapital: report.metrics.initialCapital,
      finalCapital: report.metrics.finalCapital,
      netReturn: report.metrics.finalCapital - report.metrics.initialCapital,
    },
    trades: report.trades.map((trade) => ({
      timestamp: trade.timestamp.toISOString(),
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      brokerage: trade.brokerage,
      stt: trade.stt,
      exchangeCharges: trade.exchangeCharges,
      slippage: trade.slippage,
      totalFees: trade.totalFees,
      realizedPnl: trade.realizedPnl,
    })),
    positions: report.positions.map((position) => ({
      id: position.id,
      strategyName: position.strategyName,
      instrumentId: position.instrumentId,
      status: position.status,
      kind: position.kind,
      quantity: position.quantity,
      openedAt: position.openedAt.toISOString(),
      closedAt: position.closedAt?.toISOString() ?? null,
    })),
    equityCurve: report.equityCurve.map((point) => ({
      timestamp: point.timestamp.toISOString(),
      equity: point.equity,
      cash: point.cash,
      positionValue: point.positionValue,
    })),
  };

  return options.pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
}

export function serializeBacktestReportSummaryCsv(report: BacktestReport): string {
  const lines = [
    'section,field,value',
    formatCsvRow(['summary', 'report_id', report.metadata.reportId]),
    formatCsvRow(['summary', 'schema_version', report.metadata.schemaVersion]),
    formatCsvRow(['summary', 'generated_at', report.metadata.generatedAt.toISOString()]),
    formatCsvRow(['summary', 'instrument_id', report.instrumentId]),
    formatCsvRow(['summary', 'symbol', report.symbol]),
    formatCsvRow(['summary', 'strategy_name', report.strategyName]),
    formatCsvRow(['summary', 'period_start', report.startDate.toISOString()]),
    formatCsvRow(['summary', 'period_end', report.endDate.toISOString()]),
    formatCsvRow(['summary', 'initial_capital', report.metrics.initialCapital.toFixed(2)]),
    formatCsvRow(['summary', 'final_capital', report.metrics.finalCapital.toFixed(2)]),
    formatCsvRow([
      'summary',
      'net_return',
      (report.metrics.finalCapital - report.metrics.initialCapital).toFixed(2),
    ]),
    formatCsvRow(['performance', 'metric', 'value']),
    formatCsvRow(['performance', 'cagr_pct', formatPercent(report.metrics.cagr)]),
    formatCsvRow(['performance', 'sharpe_ratio', report.metrics.sharpeRatio.toFixed(6)]),
    formatCsvRow(['performance', 'sortino_ratio', report.metrics.sortinoRatio.toFixed(6)]),
    formatCsvRow(['performance', 'max_drawdown_pct', formatPercent(report.metrics.maxDrawdown)]),
    formatCsvRow(['performance', 'profit_factor', formatProfitFactor(report.metrics.profitFactor)]),
    formatCsvRow(['performance', 'win_rate_pct', formatPercent(report.metrics.winRate)]),
    formatCsvRow(['performance', 'total_trades', report.metrics.totalTrades]),
  ];

  return lines.join('\n');
}

export function serializeBacktestReportTradesCsv(report: BacktestReport): string {
  const lines = [
    formatCsvRow([
      'timestamp',
      'side',
      'quantity',
      'price',
      'brokerage',
      'stt',
      'exchange_charges',
      'slippage',
      'total_fees',
      'realized_pnl',
    ]),
  ];

  for (const trade of report.trades) {
    lines.push(
      formatCsvRow([
        trade.timestamp.toISOString(),
        trade.side,
        trade.quantity,
        trade.price,
        trade.brokerage,
        trade.stt,
        trade.exchangeCharges,
        trade.slippage,
        trade.totalFees,
        trade.realizedPnl,
      ]),
    );
  }

  return lines.join('\n');
}

export function serializeBacktestReportPositionsCsv(report: BacktestReport): string {
  const lines = [
    formatCsvRow([
      'id',
      'strategy_name',
      'instrument_id',
      'status',
      'kind',
      'quantity',
      'opened_at',
      'closed_at',
    ]),
  ];

  for (const position of report.positions) {
    lines.push(
      formatCsvRow([
        position.id,
        position.strategyName,
        position.instrumentId,
        position.status,
        position.kind,
        position.quantity,
        formatIsoDate(position.openedAt),
        formatIsoDate(position.closedAt),
      ]),
    );
  }

  return lines.join('\n');
}

export function serializeBacktestReportEquityCurveCsv(report: BacktestReport): string {
  const lines = [formatCsvRow(['timestamp', 'equity', 'cash', 'position_value'])];

  for (const point of report.equityCurve) {
    lines.push(
      formatCsvRow([point.timestamp.toISOString(), point.equity, point.cash, point.positionValue]),
    );
  }

  return lines.join('\n');
}

export function serializeBacktestReportCsv(report: BacktestReport): string {
  return serializeBacktestReportCsvBundle(report).combined;
}

export function serializeBacktestReportCsvBundle(report: BacktestReport): BacktestReportCsvBundle {
  const summary = serializeBacktestReportSummaryCsv(report);
  const trades = serializeBacktestReportTradesCsv(report);
  const positions = serializeBacktestReportPositionsCsv(report);
  const equityCurve = serializeBacktestReportEquityCurveCsv(report);

  return {
    summary,
    trades,
    positions,
    equityCurve,
    combined: [
      summary,
      '',
      '# trades',
      trades,
      '',
      '# positions',
      positions,
      '',
      '# equity_curve',
      equityCurve,
    ].join('\n'),
  };
}
