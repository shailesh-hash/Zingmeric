import { createBacktestReportService } from '../../src/backtest/report/backtest-report.service.js';
import { createBacktestReportGenerator } from '../../src/backtest/index.js';
import { PositionStatus } from '../../src/portfolio/types/portfolio.types.js';
import type { BacktestReportGenerateInput } from '../../src/backtest/report/backtest-report.dto.js';

function createSampleInput(
  overrides: Partial<BacktestReportGenerateInput> = {},
): BacktestReportGenerateInput {
  const startDate = new Date('2024-01-15T09:15:00.000Z');
  const endDate = new Date('2024-01-18T09:15:00.000Z');

  return {
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    strategyName: 'bull-put-spread-v1',
    startDate,
    endDate,
    initialCapital: 100_000,
    riskFreeRate: 0.06,
    trades: [
      {
        timestamp: startDate,
        side: 'BUY',
        quantity: 50,
        price: 55,
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        realizedPnl: 0,
      },
      {
        timestamp: endDate,
        side: 'SELL',
        quantity: 50,
        price: 25,
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        realizedPnl: 1_500,
      },
    ],
    positions: [
      {
        id: 'spread-1',
        strategyName: 'bull-put-spread-v1',
        instrumentId: 'inst-nifty',
        status: PositionStatus.CLOSED,
        kind: 'DEFINED_RISK',
        quantity: 50,
        openedAt: startDate,
        closedAt: endDate,
      },
    ],
    equityCurve: [
      { timestamp: startDate, equity: 102_750, cash: 102_750, positionValue: 0 },
      {
        timestamp: new Date('2024-01-16T09:15:00.000Z'),
        equity: 103_000,
        cash: 103_000,
        positionValue: 0,
      },
      {
        timestamp: new Date('2024-01-17T09:15:00.000Z'),
        equity: 102_500,
        cash: 102_500,
        positionValue: 0,
      },
      { timestamp: endDate, equity: 103_500, cash: 103_500, positionValue: 0 },
    ],
    ...overrides,
  };
}

describe('BacktestReportService', () => {
  const service = createBacktestReportService();

  it('generates a report with institutional performance metrics', () => {
    const report = service.generate(createSampleInput());

    expect(report.metadata.reportId).toBeDefined();
    expect(report.metadata.schemaVersion).toBe('1.0.0');
    expect(report.metadata.generatedAt).toBeInstanceOf(Date);
    expect(report.metrics.cagr).toBeGreaterThan(0);
    expect(report.metrics.sharpeRatio).toBeDefined();
    expect(report.metrics.sortinoRatio).toBeDefined();
    expect(report.metrics.maxDrawdown).toBeGreaterThan(0);
    expect(report.metrics.profitFactor).toBe(Number.POSITIVE_INFINITY);
    expect(report.metrics.winRate).toBe(1);
    expect(report.metrics.totalTrades).toBe(1);
    expect(report.trades).toHaveLength(2);
    expect(report.positions).toHaveLength(1);
    expect(report.equityCurve).toHaveLength(4);
  });

  it('calculates sortino ratio above sharpe when downside volatility is lower', () => {
    const startDate = new Date('2024-01-01T00:00:00.000Z');
    const endDate = new Date('2024-01-05T00:00:00.000Z');

    const report = service.generate(
      createSampleInput({
        startDate,
        endDate,
        trades: [],
        positions: [],
        equityCurve: [
          { timestamp: startDate, equity: 100, cash: 100, positionValue: 0 },
          {
            timestamp: new Date('2024-01-02T00:00:00.000Z'),
            equity: 102,
            cash: 102,
            positionValue: 0,
          },
          {
            timestamp: new Date('2024-01-03T00:00:00.000Z'),
            equity: 98,
            cash: 98,
            positionValue: 0,
          },
          {
            timestamp: new Date('2024-01-04T00:00:00.000Z'),
            equity: 103,
            cash: 103,
            positionValue: 0,
          },
          { timestamp: endDate, equity: 104, cash: 104, positionValue: 0 },
        ],
        initialCapital: 100,
      }),
    );

    expect(report.metrics.sortinoRatio).toBeGreaterThan(report.metrics.sharpeRatio);
  });

  it('rejects invalid report inputs', () => {
    expect(() => service.generate(createSampleInput({ initialCapital: 0 }))).toThrow(
      'initialCapital must be greater than zero',
    );

    expect(() => service.generate(createSampleInput({ equityCurve: [] }))).toThrow(
      'equityCurve must contain at least one point',
    );

    expect(() =>
      service.generate(
        createSampleInput({
          startDate: new Date('2024-02-01T00:00:00.000Z'),
          endDate: new Date('2024-01-01T00:00:00.000Z'),
        }),
      ),
    ).toThrow('endDate must be on or after startDate');
  });

  it('exports JSON with ISO timestamps and performance block', () => {
    const report = service.generate(createSampleInput());
    const json = service.exportToJson(report, { pretty: true });
    const parsed = JSON.parse(json) as {
      metadata: { reportId: string; schemaVersion: string; generatedAt: string };
      performance: {
        cagr: number;
        sharpeRatio: number;
        sortinoRatio: number;
        maxDrawdown: number;
        profitFactor: number | null;
        profitFactorIsInfinite: boolean;
        winRate: number;
      };
      trades: unknown[];
      equityCurve: unknown[];
    };

    expect(parsed.metadata.schemaVersion).toBe('1.0.0');
    expect(parsed.metadata.generatedAt).toMatch(/T/);
    expect(parsed.performance.sortinoRatio).toBeDefined();
    expect(parsed.performance.profitFactor).toBeNull();
    expect(parsed.performance.profitFactorIsInfinite).toBe(true);
    expect(parsed.trades).toHaveLength(2);
    expect(parsed.equityCurve).toHaveLength(4);
  });

  it('exports CSV with summary, trades, positions, and equity sections', () => {
    const report = service.generate(createSampleInput());
    const csv = service.exportToCsv(report);
    const bundle = service.exportToCsvBundle(report);

    expect(csv).toContain('section,field,value');
    expect(csv).toContain('performance,cagr_pct');
    expect(csv).toContain('performance,sortino_ratio');
    expect(csv).toContain('performance,sharpe_ratio');
    expect(csv).toContain('performance,max_drawdown_pct');
    expect(csv).toContain('performance,profit_factor');
    expect(csv).toContain('performance,win_rate_pct');
    expect(csv).toContain('# trades');
    expect(csv).toContain('timestamp,side,quantity,price');
    expect(csv).toContain('# positions');
    expect(csv).toContain('# equity_curve');
    expect(bundle.summary).toContain('performance,sortino_ratio');
    expect(bundle.trades.split('\n')).toHaveLength(3);
    expect(bundle.positions.split('\n')).toHaveLength(2);
    expect(bundle.equityCurve.split('\n')).toHaveLength(5);
  });

  it('escapes CSV values containing commas and quotes', () => {
    const report = service.generate(
      createSampleInput({
        strategyName: 'strategy,"special"',
      }),
    );

    const csv = service.exportToCsv(report);

    expect(csv).toContain('"strategy,""special"""');
  });

  it('generator delegates to BacktestReportService', () => {
    const generator = createBacktestReportGenerator();
    const serviceReport = createBacktestReportService().generate(createSampleInput());
    const generatorReport = generator.generate(createSampleInput());

    expect(generatorReport.metrics.cagr).toBe(serviceReport.metrics.cagr);
    expect(generatorReport.metrics.sortinoRatio).toBe(serviceReport.metrics.sortinoRatio);
  });
});
