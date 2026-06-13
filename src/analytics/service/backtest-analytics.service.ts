import { calculateBacktestPerformanceMetrics } from '../../backtest/report/backtest-performance-metrics.js';
import { calculateDrawdownSeries } from '../metrics/performance-metrics.js';
import type {
  BacktestDetailDto,
  BacktestListResponseDto,
  BacktestSummaryDto,
  DrawdownPointDto,
  EquityCurvePointDto,
  EquityCurveResponseDto,
  PerformanceMetricsDto,
  PortfolioAnalyticsResponseDto,
  PortfolioPositionDto,
  PortfolioSummaryDto,
  TradeStatisticsDto,
} from '../dto/backtest-analytics.dto.js';
import { BacktestNotFoundError } from '../errors/backtest-analytics.errors.js';
import type {
  BacktestAnalyticsRepository,
  BacktestEquitySnapshotRecord,
  BacktestPositionRecord,
  BacktestRunRecord,
  BacktestTradeRecord,
} from '../repository/backtest-analytics.repository.js';
import type { BacktestAnalyticsListQueryDto } from '../dto/backtest-analytics.dto.js';
import { calculateTradeStatistics } from './trade-statistics.calculator.js';

const DEFAULT_RISK_FREE_RATE = 0.06;

export class BacktestAnalyticsService {
  constructor(private readonly repository: BacktestAnalyticsRepository) {}

  async listBacktests(query: BacktestAnalyticsListQueryDto = {}): Promise<BacktestListResponseDto> {
    const result = await this.repository.findMany(query);

    const items = result.items.map((run) => {
      const contextLoader = this.loadContext(run.id);
      return contextLoader.then((context) => this.toSummaryDto(run, context));
    });

    return {
      items: await Promise.all(items),
      total: result.total,
    };
  }

  async getBacktestById(backtestRunId: string): Promise<BacktestDetailDto> {
    const run = await this.requireRun(backtestRunId);
    const context = await this.loadContext(backtestRunId);

    return {
      ...this.toSummaryDto(run, context),
      portfolioId: run.portfolioId,
      includeCosts: run.includeCosts,
      performanceMetrics: context.performanceMetrics,
      tradeStatistics: context.tradeStatistics,
    };
  }

  async getEquityCurve(backtestRunId: string): Promise<EquityCurveResponseDto> {
    await this.requireRun(backtestRunId);
    const snapshots = await this.repository.findEquitySnapshotsByBacktestRunId(backtestRunId);
    const points = snapshots.map((snapshot) => this.toEquityCurvePoint(snapshot));
    const drawdownSeries = this.buildDrawdownSeries(snapshots);

    return {
      backtestRunId,
      points,
      drawdownSeries,
    };
  }

  async getPortfolioAnalytics(backtestRunId: string): Promise<PortfolioAnalyticsResponseDto> {
    await this.requireRun(backtestRunId);
    const context = await this.loadContext(backtestRunId);
    const portfolio = await this.repository.findPortfolioByBacktestRunId(backtestRunId);

    if (!portfolio) {
      throw new BacktestNotFoundError(backtestRunId);
    }

    const positions = context.positions;

    return {
      backtestRunId,
      portfolio: this.toPortfolioSummary(portfolio),
      performanceMetrics: context.performanceMetrics,
      tradeStatistics: context.tradeStatistics,
      equityCurve: context.snapshots.map((snapshot) => this.toEquityCurvePoint(snapshot)),
      openPositions: positions
        .filter((position) => position.status === 'OPEN')
        .map((position) => this.toPortfolioPosition(position)),
      closedPositions: positions
        .filter((position) => position.status === 'CLOSED')
        .map((position) => this.toPortfolioPosition(position)),
    };
  }

  private async requireRun(backtestRunId: string): Promise<BacktestRunRecord> {
    const run = await this.repository.findById(backtestRunId);

    if (!run) {
      throw new BacktestNotFoundError(backtestRunId);
    }

    return run;
  }

  private async loadContext(backtestRunId: string): Promise<{
    run: BacktestRunRecord;
    trades: BacktestTradeRecord[];
    positions: BacktestPositionRecord[];
    snapshots: BacktestEquitySnapshotRecord[];
    performanceMetrics: PerformanceMetricsDto;
    tradeStatistics: TradeStatisticsDto;
  }> {
    const run = await this.requireRun(backtestRunId);
    const [trades, positions, snapshots] = await Promise.all([
      this.repository.findTradesByBacktestRunId(backtestRunId),
      this.repository.findPositionsByBacktestRunId(backtestRunId),
      this.repository.findEquitySnapshotsByBacktestRunId(backtestRunId),
    ]);

    return {
      run,
      trades,
      positions,
      snapshots,
      performanceMetrics: this.resolvePerformanceMetrics(run, trades, snapshots, positions),
      tradeStatistics: calculateTradeStatistics(trades, positions),
    };
  }

  private toSummaryDto(
    run: BacktestRunRecord,
    context: {
      performanceMetrics: PerformanceMetricsDto;
    },
  ): BacktestSummaryDto {
    return {
      id: run.id,
      name: run.name,
      strategyName: run.strategyName,
      status: run.status,
      startDate: run.startDate.toISOString(),
      endDate: run.endDate.toISOString(),
      initialCapital: run.initialCapital,
      finalCapital: context.performanceMetrics.finalCapital,
      performanceMetrics: run.status === 'COMPLETED' ? context.performanceMetrics : null,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    };
  }

  private resolvePerformanceMetrics(
    run: BacktestRunRecord,
    trades: BacktestTradeRecord[],
    snapshots: BacktestEquitySnapshotRecord[],
    positions: BacktestPositionRecord[] = [],
  ): PerformanceMetricsDto {
    if (snapshots.length > 0) {
      const analyticsTrades = this.toAnalyticsTrades(trades, positions);
      const metrics = calculateBacktestPerformanceMetrics({
        equityCurve: snapshots.map((snapshot) => ({
          timestamp: snapshot.timestamp,
          equity: snapshot.portfolioValue,
          cash: snapshot.cashBalance,
          positionValue: snapshot.portfolioValue - snapshot.cashBalance,
        })),
        trades: analyticsTrades,
        initialCapital: run.initialCapital,
        startDate: run.startDate,
        endDate: run.endDate,
        riskFreeRate: DEFAULT_RISK_FREE_RATE,
      });

      return {
        cagr: metrics.cagr,
        sharpeRatio: metrics.sharpeRatio,
        sortinoRatio: metrics.sortinoRatio,
        maxDrawdown: metrics.maxDrawdown,
        profitFactor: Number.isFinite(metrics.profitFactor) ? metrics.profitFactor : null,
        winRate: metrics.winRate,
        totalTrades: metrics.totalTrades,
        initialCapital: metrics.initialCapital,
        finalCapital: metrics.finalCapital,
      };
    }

    return {
      cagr: run.cagr ?? 0,
      sharpeRatio: run.sharpeRatio ?? 0,
      sortinoRatio: 0,
      maxDrawdown: run.maxDrawdown ?? 0,
      profitFactor: run.profitFactor,
      winRate: run.winRate ?? 0,
      totalTrades: run.totalTrades ?? 0,
      initialCapital: run.initialCapital,
      finalCapital: run.finalCapital ?? run.initialCapital,
    };
  }

  private toEquityCurvePoint(snapshot: BacktestEquitySnapshotRecord): EquityCurvePointDto {
    return {
      timestamp: snapshot.timestamp.toISOString(),
      equity: snapshot.portfolioValue,
      cash: snapshot.cashBalance,
      positionValue: snapshot.portfolioValue - snapshot.cashBalance,
      drawdown: snapshot.drawdown,
    };
  }

  private buildDrawdownSeries(snapshots: BacktestEquitySnapshotRecord[]): DrawdownPointDto[] {
    return calculateDrawdownSeries(
      snapshots.map((snapshot) => ({
        timestamp: snapshot.timestamp,
        equity: snapshot.portfolioValue,
        cash: snapshot.cashBalance,
        positionValue: snapshot.portfolioValue - snapshot.cashBalance,
      })),
    ).map((point) => ({
      timestamp: point.timestamp.toISOString(),
      equity: point.equity,
      peakEquity: point.peakEquity,
      drawdown: point.drawdown,
    }));
  }

  private toAnalyticsTrades(trades: BacktestTradeRecord[], positions: BacktestPositionRecord[]) {
    const closedPositions = positions.filter((position) => position.status === 'CLOSED');

    if (closedPositions.length > 0) {
      return closedPositions.map((position) => ({
        timestamp: position.closedAt ?? position.openedAt,
        side: 'SELL' as const,
        quantity: position.quantity,
        price: position.averagePrice,
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        realizedPnl: position.realizedPnl,
      }));
    }

    return trades.map((trade) => ({
      timestamp: trade.executedAt,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      brokerage: trade.brokerage,
      stt: trade.stt,
      exchangeCharges: trade.exchangeCharges,
      slippage: trade.slippage,
      totalFees: trade.totalFees,
      realizedPnl: trade.side === 'SELL' ? 0 : 0,
    }));
  }

  private toPortfolioSummary(portfolio: {
    id: string;
    name: string;
    mode: string;
    initialCapital: number;
    cashBalance: number;
    currency: string;
  }): PortfolioSummaryDto {
    return {
      id: portfolio.id,
      name: portfolio.name,
      mode: portfolio.mode,
      initialCapital: portfolio.initialCapital,
      cashBalance: portfolio.cashBalance,
      currency: portfolio.currency,
    };
  }

  private toPortfolioPosition(position: BacktestPositionRecord): PortfolioPositionDto {
    return {
      id: position.id,
      status: position.status,
      quantity: position.quantity,
      averagePrice: position.averagePrice,
      realizedPnl: position.realizedPnl,
      unrealizedPnl: position.unrealizedPnl,
      strategyName: position.strategyName,
      legGroupId: position.legGroupId,
      openedAt: position.openedAt.toISOString(),
      closedAt: position.closedAt?.toISOString() ?? null,
    };
  }
}

export function createBacktestAnalyticsService(
  repository: BacktestAnalyticsRepository,
): BacktestAnalyticsService {
  return new BacktestAnalyticsService(repository);
}
