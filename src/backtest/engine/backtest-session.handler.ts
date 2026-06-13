import { BacktestEventType } from './events/backtest-event-type.enum.js';
import type { MarketEvent as EngineMarketEvent } from './events/market-event.type.js';
import type { OptionChainEvent } from './events/option-chain-event.type.js';
import type { BacktestEvent } from './events/backtest-event.type.js';
import type { BacktestEventSubscriber } from './replay-engine.types.js';
import type { BacktestExecutionService } from '../execution/backtest-execution.service.js';
import {
  estimateDefinedRiskUnrealizedPnl,
  resolveDefinedRiskMarkDebit,
} from '../execution/position-mark.resolver.js';
import type { MetricsEngine } from '../metrics/metrics-engine.js';
import { createMarketSnapshot } from '../../strategies/types/market-snapshot.type.js';
import type { StrategyEngine } from '../../strategies/engine/strategy-engine.js';
import type { PortfolioEngine } from '../../portfolio/engine/portfolio-engine.js';
import { PositionKind } from '../../portfolio/types/portfolio.types.js';
import type { BacktestMetricsPublisher } from '../observability/backtest-metrics.publisher.js';

export interface BacktestSessionHandlerConfig {
  instrumentId: string;
  symbol: string;
  strategyName: string;
  evaluateWithoutOptionChain?: boolean;
}

export class BacktestSessionHandler implements BacktestEventSubscriber {
  readonly name = 'backtest-session';

  private pendingMarket: EngineMarketEvent | null = null;

  constructor(
    private readonly config: BacktestSessionHandlerConfig,
    private readonly strategyEngine: StrategyEngine,
    private readonly portfolioEngine: PortfolioEngine,
    private readonly executionService: BacktestExecutionService,
    private readonly metricsEngine: MetricsEngine,
    private readonly metricsPublisher?: BacktestMetricsPublisher,
  ) {}

  handle(event: BacktestEvent): void {
    if (event.type === BacktestEventType.MARKET) {
      this.pendingMarket = event;

      if (this.config.evaluateWithoutOptionChain) {
        this.processSnapshot(event, undefined);
      }

      return;
    }

    if (event.type === BacktestEventType.OPTION_CHAIN) {
      const market =
        this.pendingMarket?.timestamp.getTime() === event.timestamp.getTime()
          ? this.pendingMarket
          : null;

      if (market) {
        this.processSnapshot(market, event);
      }
    }
  }

  private processSnapshot(market: EngineMarketEvent, optionChainEvent?: OptionChainEvent): void {
    const snapshot = createMarketSnapshot({
      timestamp: market.timestamp,
      instrumentId: this.config.instrumentId,
      symbol: this.config.symbol,
      price: market.close,
      open: market.open,
      high: market.high,
      low: market.low,
      close: market.close,
      volume: market.volume,
      accountEquity: this.portfolioEngine.snapshot.equity,
      optionChain: optionChainEvent?.chain,
    });

    const signal = this.strategyEngine.generateSignal(
      snapshot,
      this.config.strategyName,
      this.metricsPublisher,
    );

    this.executionService.executeSignal(signal, snapshot);
    this.markOpenPositions(snapshot);

    const unrealizedPnl = this.calculateUnrealizedPnl(snapshot);
    this.metricsEngine.recordEquityPoint(
      snapshot.timestamp,
      this.portfolioEngine.snapshot.cash,
      unrealizedPnl,
    );

    this.metricsPublisher?.recordPortfolioEquity(
      this.portfolioEngine.snapshot.cash + unrealizedPnl,
    );
  }

  private markOpenPositions(snapshot: ReturnType<typeof createMarketSnapshot>): void {
    for (const position of this.portfolioEngine.snapshot.openPositions) {
      if (position.kind !== PositionKind.DEFINED_RISK) {
        continue;
      }

      const metadata = this.executionService.getPositionMetadata(position.id);
      if (!metadata) {
        continue;
      }

      const markDebit = resolveDefinedRiskMarkDebit(metadata, snapshot);
      if (markDebit === null) {
        continue;
      }

      this.portfolioEngine.markToMarket([
        {
          positionId: position.id,
          markPrice: markDebit,
        },
      ]);
    }

    for (const position of this.portfolioEngine.snapshot.openPositions) {
      if (position.kind !== PositionKind.EQUITY || snapshot.price <= 0) {
        continue;
      }

      this.portfolioEngine.markToMarket([
        {
          positionId: position.id,
          markPrice: snapshot.price,
        },
      ]);
    }
  }

  private calculateUnrealizedPnl(snapshot: ReturnType<typeof createMarketSnapshot>): number {
    let unrealizedPnl = 0;

    for (const position of this.portfolioEngine.snapshot.openPositions) {
      if (position.kind === PositionKind.DEFINED_RISK) {
        const metadata = this.executionService.getPositionMetadata(position.id);
        if (!metadata) {
          continue;
        }

        const markDebit = resolveDefinedRiskMarkDebit(metadata, snapshot);
        if (markDebit === null) {
          continue;
        }

        unrealizedPnl += estimateDefinedRiskUnrealizedPnl(position, markDebit);
        continue;
      }

      if (position.markPrice !== undefined) {
        unrealizedPnl += (position.markPrice - position.averagePrice) * position.quantity;
      }
    }

    return unrealizedPnl;
  }
}

export function createBacktestSessionHandler(
  config: BacktestSessionHandlerConfig,
  strategyEngine: StrategyEngine,
  portfolioEngine: PortfolioEngine,
  executionService: BacktestExecutionService,
  metricsEngine: MetricsEngine,
  metricsPublisher?: BacktestMetricsPublisher,
): BacktestSessionHandler {
  return new BacktestSessionHandler(
    config,
    strategyEngine,
    portfolioEngine,
    executionService,
    metricsEngine,
    metricsPublisher,
  );
}
