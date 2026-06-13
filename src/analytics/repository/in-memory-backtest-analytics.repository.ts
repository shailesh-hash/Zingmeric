import type { BacktestAnalyticsListQueryDto } from '../dto/backtest-analytics.dto.js';
import type {
  BacktestAnalyticsRepository,
  BacktestEquitySnapshotRecord,
  BacktestPortfolioRecord,
  BacktestPositionRecord,
  BacktestRunRecord,
  BacktestTradeRecord,
} from './backtest-analytics.repository.js';

export class InMemoryBacktestAnalyticsRepository implements BacktestAnalyticsRepository {
  private readonly runs = new Map<string, BacktestRunRecord>();
  private readonly trades = new Map<string, BacktestTradeRecord[]>();
  private readonly positions = new Map<string, BacktestPositionRecord[]>();
  private readonly equitySnapshots = new Map<string, BacktestEquitySnapshotRecord[]>();
  private readonly portfolios = new Map<string, BacktestPortfolioRecord>();

  seedRun(record: BacktestRunRecord): void {
    this.runs.set(record.id, record);
  }

  seedTrades(backtestRunId: string, records: BacktestTradeRecord[]): void {
    this.trades.set(backtestRunId, records);
  }

  seedPositions(backtestRunId: string, records: BacktestPositionRecord[]): void {
    this.positions.set(backtestRunId, records);
  }

  seedEquitySnapshots(backtestRunId: string, records: BacktestEquitySnapshotRecord[]): void {
    this.equitySnapshots.set(backtestRunId, records);
  }

  seedPortfolio(backtestRunId: string, record: BacktestPortfolioRecord): void {
    this.portfolios.set(backtestRunId, record);
  }

  findMany(
    query: BacktestAnalyticsListQueryDto,
  ): Promise<{ items: BacktestRunRecord[]; total: number }> {
    let items = [...this.runs.values()];

    if (query.strategyName) {
      items = items.filter((item) => item.strategyName === query.strategyName);
    }

    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }

    items.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    const total = items.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    return Promise.resolve({
      items: items.slice(offset, offset + limit),
      total,
    });
  }

  findById(backtestRunId: string): Promise<BacktestRunRecord | null> {
    return Promise.resolve(this.runs.get(backtestRunId) ?? null);
  }

  findTradesByBacktestRunId(backtestRunId: string): Promise<BacktestTradeRecord[]> {
    return Promise.resolve(this.trades.get(backtestRunId) ?? []);
  }

  findPositionsByBacktestRunId(backtestRunId: string): Promise<BacktestPositionRecord[]> {
    return Promise.resolve(this.positions.get(backtestRunId) ?? []);
  }

  findEquitySnapshotsByBacktestRunId(
    backtestRunId: string,
  ): Promise<BacktestEquitySnapshotRecord[]> {
    return Promise.resolve(this.equitySnapshots.get(backtestRunId) ?? []);
  }

  findPortfolioByBacktestRunId(backtestRunId: string): Promise<BacktestPortfolioRecord | null> {
    return Promise.resolve(this.portfolios.get(backtestRunId) ?? null);
  }
}

export function createInMemoryBacktestAnalyticsRepository(): InMemoryBacktestAnalyticsRepository {
  return new InMemoryBacktestAnalyticsRepository();
}
