import { randomUUID } from 'node:crypto';
import { PositionKind } from '../../portfolio/types/portfolio.types.js';
import type { PaperBroker } from '../../broker/paper/paper-broker.js';
import type { StrategyEngine } from '../../strategies/engine/strategy-engine.js';
import { createMarketSnapshot } from '../../strategies/types/market-snapshot.type.js';
import {
  createForwardSignalExecutionService,
  type ForwardSignalExecutionService,
} from '../execution/forward-signal-execution.service.js';
import type { MarketFeed } from '../types/market-feed.interface.js';
import {
  createForwardTestMetricsCollector,
  type ForwardTestMetricsCollector,
} from '../metrics/forward-test-metrics.collector.js';
import type {
  ForwardTestDailyResult,
  ForwardTestEngineConfig,
  ForwardTestSessionState,
} from '../types/forward-test.types.js';

export interface ForwardTestingEngineDependencies {
  marketFeed: MarketFeed;
  strategyEngine: StrategyEngine;
  broker: PaperBroker;
  executionService?: ForwardSignalExecutionService;
  metricsCollector?: ForwardTestMetricsCollector;
}

export class ForwardTestingEngine {
  private readonly executionService: ForwardSignalExecutionService;
  private readonly metricsCollector: ForwardTestMetricsCollector;
  private session: ForwardTestSessionState | null = null;

  constructor(
    private readonly config: ForwardTestEngineConfig,
    private readonly dependencies: ForwardTestingEngineDependencies,
  ) {
    this.executionService =
      dependencies.executionService ??
      createForwardSignalExecutionService(dependencies.broker, {
        lotSize: config.lotSize,
      });
    this.metricsCollector = dependencies.metricsCollector ?? createForwardTestMetricsCollector();
  }

  get metrics(): ReturnType<ForwardTestMetricsCollector['snapshot']> {
    return this.metricsCollector.snapshot();
  }

  getSession(): ForwardTestSessionState | null {
    return this.session;
  }

  async runDaily(runDate: Date = new Date()): Promise<ForwardTestDailyResult> {
    this.ensureSession(runDate);

    const rawSnapshot = await this.dependencies.marketFeed.fetchSnapshot(this.config.instrumentId);
    if (!rawSnapshot) {
      return this.buildSkippedResult(runDate, 'Market feed returned no snapshot');
    }

    const snapshot = createMarketSnapshot({
      ...rawSnapshot,
      accountEquity: this.dependencies.broker.getPnlSummary().equity,
    });

    const signal = this.dependencies.strategyEngine.generateSignal(
      snapshot,
      this.config.strategyName,
    );

    const executions = await this.executionService.executeSignal(signal, snapshot);

    this.dependencies.broker.processMarketQuotes([
      {
        instrumentId: snapshot.instrumentId,
        price: snapshot.price,
        timestamp: snapshot.timestamp,
      },
    ]);

    this.markOpenPositions(snapshot);
    this.metricsCollector.recordRun(executions);

    const result: ForwardTestDailyResult = {
      sessionId: this.session?.sessionId ?? randomUUID(),
      runDate,
      instrumentId: this.config.instrumentId,
      symbol: this.config.symbol,
      strategyName: this.config.strategyName,
      skipped: false,
      signal,
      executions,
      metrics: this.metricsCollector.snapshot(),
      pnlSummary: this.dependencies.broker.getPnlSummary(),
    };

    this.session?.runs.push(result);
    return result;
  }

  async runDailySeries(dates: Date[]): Promise<ForwardTestDailyResult[]> {
    const results: ForwardTestDailyResult[] = [];

    for (const runDate of dates) {
      results.push(await this.runDaily(runDate));
    }

    return results;
  }

  private ensureSession(runDate: Date): void {
    if (this.session) {
      return;
    }

    this.session = {
      sessionId: randomUUID(),
      startedAt: runDate,
      instrumentId: this.config.instrumentId,
      symbol: this.config.symbol,
      strategyName: this.config.strategyName,
      runs: [],
    };
  }

  private buildSkippedResult(runDate: Date, _reason: string): ForwardTestDailyResult {
    const result: ForwardTestDailyResult = {
      sessionId: this.session?.sessionId ?? randomUUID(),
      runDate,
      instrumentId: this.config.instrumentId,
      symbol: this.config.symbol,
      strategyName: this.config.strategyName,
      skipped: true,
      signal: null,
      executions: [],
      metrics: this.metricsCollector.snapshot(),
      pnlSummary: this.dependencies.broker.getPnlSummary(),
    };

    this.session?.runs.push(result);
    return result;
  }

  private markOpenPositions(snapshot: ReturnType<typeof createMarketSnapshot>): void {
    const quotes = this.dependencies.broker
      .getPortfolioEngine()
      .getOpenPositions()
      .map((position) => {
        if (position.kind === PositionKind.EQUITY) {
          return {
            positionId: position.id,
            markPrice: snapshot.price,
          };
        }

        return {
          positionId: position.id,
          markPrice: position.markPrice ?? position.entryCredit,
        };
      });

    if (quotes.length > 0) {
      this.dependencies.broker.markToMarket(quotes);
    }
  }
}

export function createForwardTestingEngine(
  config: ForwardTestEngineConfig,
  dependencies: ForwardTestingEngineDependencies,
): ForwardTestingEngine {
  return new ForwardTestingEngine(config, dependencies);
}
