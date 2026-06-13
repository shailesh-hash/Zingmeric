import {
  calculateCagr,
  calculateDrawdownSeries,
  calculateMaxDrawdown,
  calculatePeriodReturns,
  calculateSharpeRatio,
  calculateSortinoRatio,
} from '../../analytics/metrics/performance-metrics.js';
import type {
  EquityCurvePointDto,
  EquitySnapshotDto,
  EquitySnapshotQueryDto,
  RecordEquitySnapshotDto,
} from '../dto/equity-snapshot.dto.js';
import { InvalidEquitySnapshotError } from '../errors/equity-curve.errors.js';
import { getMetricsService } from '../../observability/instrumentation.js';
import type {
  EquitySnapshotRecord,
  EquitySnapshotRepository,
  EquitySnapshotRow,
} from '../repository/equity-snapshot.repository.js';

export interface RecordEquitySnapshotResult {
  snapshot: EquitySnapshotDto;
  peakPortfolioValue: number;
}

export interface EquityCurveMetrics {
  initialPortfolioValue: number;
  finalPortfolioValue: number;
  snapshotCount: number;
  periodReturns: number[];
  maxDrawdown: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
}

const DEFAULT_RISK_FREE_RATE = 0.06;
const TRADING_DAYS_PER_YEAR = 252;

export class EquityCurveService {
  private readonly sessionPeaks = new Map<string, number>();

  constructor(private readonly repository: EquitySnapshotRepository) {}

  async recordSnapshot(input: RecordEquitySnapshotDto): Promise<RecordEquitySnapshotResult> {
    this.validateRecordInput(input);

    const portfolioValue = input.portfolioValue ?? input.cashBalance + input.unrealizedPnl;
    const peakPortfolioValue = await this.resolvePeak(input.portfolioId, portfolioValue);
    const drawdown = this.calculateDrawdown(peakPortfolioValue, portfolioValue);

    const record: EquitySnapshotRecord = {
      portfolioId: input.portfolioId,
      backtestRunId: input.backtestRunId ?? null,
      timestamp: input.timestamp,
      cashBalance: input.cashBalance,
      portfolioValue,
      realizedPnl: input.realizedPnl,
      unrealizedPnl: input.unrealizedPnl,
      drawdown,
    };

    const created = await this.repository.create(record);

    getMetricsService().recordPortfolioSnapshot({
      portfolioId: input.portfolioId,
      portfolioMode: input.backtestRunId ? 'backtest' : 'paper',
      portfolioValue,
      drawdownPercentage: drawdown * 100,
    });

    return {
      snapshot: this.toDto(created),
      peakPortfolioValue,
    };
  }

  async recordSnapshotsBatch(inputs: RecordEquitySnapshotDto[]): Promise<number> {
    if (inputs.length === 0) {
      return 0;
    }

    const portfolioId = inputs[0]?.portfolioId;
    if (!portfolioId || inputs.some((input) => input.portfolioId !== portfolioId)) {
      throw new InvalidEquitySnapshotError(
        'Batch recording requires snapshots for a single portfolio',
      );
    }

    inputs.forEach((input) => {
      this.validateRecordInput(input);
    });

    const sortedInputs = [...inputs].sort(
      (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
    );

    let peak = (await this.repository.findPeakPortfolioValue(portfolioId)) ?? 0;
    const records: EquitySnapshotRecord[] = [];

    for (const input of sortedInputs) {
      const portfolioValue = input.portfolioValue ?? input.cashBalance + input.unrealizedPnl;
      peak = Math.max(peak, portfolioValue);

      records.push({
        portfolioId: input.portfolioId,
        backtestRunId: input.backtestRunId ?? null,
        timestamp: input.timestamp,
        cashBalance: input.cashBalance,
        portfolioValue,
        realizedPnl: input.realizedPnl,
        unrealizedPnl: input.unrealizedPnl,
        drawdown: this.calculateDrawdown(peak, portfolioValue),
      });
    }

    this.sessionPeaks.set(portfolioId, peak);
    return this.repository.createMany(records);
  }

  async getSnapshots(query: EquitySnapshotQueryDto): Promise<EquitySnapshotDto[]> {
    this.validateQuery(query);

    const rows = await this.repository.findMany(query);
    return rows.map((row) => this.toDto(row));
  }

  async getEquityCurve(query: EquitySnapshotQueryDto): Promise<EquityCurvePointDto[]> {
    const snapshots = await this.getSnapshots(query);

    return snapshots.map((snapshot) => ({
      timestamp: snapshot.timestamp,
      equity: snapshot.portfolioValue,
      cash: snapshot.cashBalance,
      positionValue: snapshot.unrealizedPnl,
      drawdown: snapshot.drawdown,
    }));
  }

  async getMetrics(
    query: EquitySnapshotQueryDto,
    options?: { riskFreeRate?: number },
  ): Promise<EquityCurveMetrics> {
    const curve = await this.getEquityCurve(query);
    const analyticsCurve = curve.map((point) => ({
      timestamp: point.timestamp,
      equity: point.equity,
      cash: point.cash,
      positionValue: point.positionValue,
    }));

    const periodReturns = calculatePeriodReturns(analyticsCurve);
    const initialPortfolioValue = curve[0]?.equity ?? 0;
    const finalPortfolioValue = curve.at(-1)?.equity ?? 0;
    const startDate = curve[0]?.timestamp ?? new Date();
    const endDate = curve.at(-1)?.timestamp ?? startDate;
    const riskFreeRate = options?.riskFreeRate ?? DEFAULT_RISK_FREE_RATE;

    return {
      initialPortfolioValue,
      finalPortfolioValue,
      snapshotCount: curve.length,
      periodReturns,
      maxDrawdown: calculateMaxDrawdown(analyticsCurve),
      cagr: calculateCagr(initialPortfolioValue, finalPortfolioValue, startDate, endDate),
      sharpeRatio: calculateSharpeRatio(periodReturns, riskFreeRate, TRADING_DAYS_PER_YEAR),
      sortinoRatio: calculateSortinoRatio(periodReturns, riskFreeRate, TRADING_DAYS_PER_YEAR),
    };
  }

  getDrawdownSeries(query: EquitySnapshotQueryDto): Promise<
    {
      timestamp: Date;
      equity: number;
      peakEquity: number;
      drawdown: number;
    }[]
  > {
    return this.getEquityCurve(query).then((curve) =>
      calculateDrawdownSeries(
        curve.map((point) => ({
          timestamp: point.timestamp,
          equity: point.equity,
          cash: point.cash,
          positionValue: point.positionValue,
        })),
      ),
    );
  }

  clearSessionPeak(portfolioId: string): void {
    this.sessionPeaks.delete(portfolioId);
  }

  private async resolvePeak(portfolioId: string, portfolioValue: number): Promise<number> {
    const sessionPeak = this.sessionPeaks.get(portfolioId);
    const persistedPeak = await this.repository.findPeakPortfolioValue(portfolioId);
    const peak = Math.max(sessionPeak ?? 0, persistedPeak ?? 0, portfolioValue);
    this.sessionPeaks.set(portfolioId, peak);
    return peak;
  }

  private calculateDrawdown(peak: number, portfolioValue: number): number {
    if (peak <= 0) {
      return 0;
    }

    return Math.max(0, (peak - portfolioValue) / peak);
  }

  private validateRecordInput(input: RecordEquitySnapshotDto): void {
    if (!input.portfolioId.trim()) {
      throw new InvalidEquitySnapshotError('portfolioId is required');
    }

    if (Number.isNaN(input.timestamp.getTime())) {
      throw new InvalidEquitySnapshotError('timestamp must be a valid date');
    }

    if (input.cashBalance < 0) {
      throw new InvalidEquitySnapshotError('cashBalance cannot be negative');
    }
  }

  private validateQuery(query: EquitySnapshotQueryDto): void {
    if (!query.portfolioId && !query.backtestRunId) {
      throw new InvalidEquitySnapshotError('portfolioId or backtestRunId is required');
    }
  }

  private toDto(row: EquitySnapshotRow): EquitySnapshotDto {
    return {
      id: row.id,
      portfolioId: row.portfolioId,
      backtestRunId: row.backtestRunId ?? null,
      timestamp: row.timestamp,
      cashBalance: row.cashBalance,
      portfolioValue: row.portfolioValue,
      realizedPnl: row.realizedPnl,
      unrealizedPnl: row.unrealizedPnl,
      drawdown: row.drawdown,
      createdAt: row.createdAt,
    };
  }
}

export function createEquityCurveService(repository: EquitySnapshotRepository): EquityCurveService {
  return new EquityCurveService(repository);
}
