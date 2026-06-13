import { InvalidBacktestRequestError } from '../errors/backtest.errors.js';
import { createBacktestTradeLedger } from '../execution/backtest-trade-ledger.js';
import {
  createBacktestExecutionService,
  type BacktestExecutionConfig,
} from '../execution/backtest-execution.service.js';
import { createMetricsEngine } from '../metrics/metrics-engine.js';
import { createBacktestMetricsPublisher } from '../observability/backtest-metrics.publisher.js';
import type { BacktestCandle } from '../types/backtest-candle.type.js';
import type { MarketEvent } from '../types/market-event.type.js';
import { getTracingService } from '../../observability/instrumentation.js';
import { createPortfolioEngine } from '../../portfolio/engine/portfolio-engine.js';
import { createRiskEngine } from '../../risk/engine/risk-engine.js';
import { createRiskEngineConfig } from '../../risk/types/risk.types.js';
import { createStrategyEngine } from '../../strategies/engine/strategy-engine.js';
import type {
  BacktestEngineConfig,
  BacktestEngineDependencies,
  BacktestEngineInput,
  BacktestEngineLegacyInput,
  BacktestEngineResult,
} from './backtest-engine.types.js';
import { BACKTEST_RISK_CONFIG } from './backtest-engine.types.js';
import { createBacktestSessionHandler } from './backtest-session.handler.js';
import type { HistoricalOptionChainDTO, ReplayInputDTO } from './replay-engine.types.js';

export class UnifiedBacktestEngine {
  constructor(private readonly dependencies: BacktestEngineDependencies) {}

  run(input: BacktestEngineInput): BacktestEngineResult {
    this.validateInput(input);

    const strategyEngine = createStrategyEngine({
      strategies: [input.strategy],
      defaultStrategyName: input.strategy.name,
    });

    return this.execute({
      config: { ...input.config, strategyName: input.strategy.name },
      replayInput: this.toReplayInput(input.config, input.candles, input.optionChains ?? []),
      strategyEngine,
    });
  }

  runFromEvents(input: BacktestEngineLegacyInput): BacktestEngineResult {
    if (input.events.length === 0) {
      throw new InvalidBacktestRequestError('At least one market event is required');
    }

    const { candles, optionChains } = this.convertLegacyEvents(input.events);
    const strategyEngine = createStrategyEngine({
      strategies: [input.strategy],
      defaultStrategyName: input.strategy.name,
    });

    return this.execute({
      config: { ...input.config, strategyName: input.strategy.name },
      replayInput: this.toReplayInput(input.config, candles, optionChains),
      strategyEngine,
    });
  }

  private execute(params: {
    config: BacktestEngineConfig;
    replayInput: ReplayInputDTO;
    strategyEngine: ReturnType<typeof createStrategyEngine>;
  }): BacktestEngineResult {
    const tracing = getTracingService();
    const metricsPublisher = createBacktestMetricsPublisher({
      strategyName: params.config.strategyName,
      portfolioId: `${params.config.instrumentId}-backtest`,
      portfolioMode: 'backtest',
      instrumentId: params.config.instrumentId,
      symbol: params.config.symbol,
    });

    metricsPublisher.beginReplay(
      params.replayInput.candles.length + (params.replayInput.optionChains?.length ?? 0),
    );

    try {
      const result = tracing.withSpanSync(
        'backtest.run',
        {
          'strategy.name': params.config.strategyName,
          'instrument.id': params.config.instrumentId,
        },
        () => this.executeReplay(params, metricsPublisher),
      );

      metricsPublisher.finishReplay('success');
      return result;
    } catch (error) {
      metricsPublisher.finishReplay('error');
      throw error;
    }
  }

  private executeReplay(
    params: {
      config: BacktestEngineConfig;
      replayInput: ReplayInputDTO;
      strategyEngine: ReturnType<typeof createStrategyEngine>;
    },
    metricsPublisher: ReturnType<typeof createBacktestMetricsPublisher>,
  ): BacktestEngineResult {
    const portfolioEngine = this.dependencies.createPortfolioEngine(params.config.initialCapital);
    const riskEngine = this.dependencies.createRiskEngine(params.config.riskConfig);
    const metricsEngine = this.dependencies.createMetricsEngine();
    const tradeLedger = createBacktestTradeLedger();
    const executionConfig: BacktestExecutionConfig = {
      lotSize: params.config.lotSize ?? 1,
      includeCosts: params.config.includeCosts,
      costs: params.config.costs,
    };

    const executionService = createBacktestExecutionService(
      portfolioEngine,
      riskEngine,
      tradeLedger,
      executionConfig,
      params.config.initialCapital,
    );

    const sessionHandler = createBacktestSessionHandler(
      {
        instrumentId: params.config.instrumentId,
        symbol: params.config.symbol,
        strategyName: params.config.strategyName,
        evaluateWithoutOptionChain: !(params.config.requireOptionChain ?? true),
      },
      params.strategyEngine,
      portfolioEngine,
      executionService,
      metricsEngine,
      metricsPublisher,
    );

    const replayResult = this.dependencies.replayEngine.replay(params.replayInput, [
      sessionHandler,
    ]);

    return metricsEngine.buildReport({
      instrumentId: params.config.instrumentId,
      symbol: params.config.symbol,
      strategyName: params.config.strategyName,
      startDate: replayResult.startDate,
      endDate: replayResult.endDate,
      initialCapital: params.config.initialCapital,
      riskFreeRate: params.config.riskFreeRate,
      portfolioEngine,
      trades: tradeLedger.getTrades(),
      equityCurve: metricsEngine.getEquityCurve(),
    });
  }

  private validateInput(input: BacktestEngineInput): void {
    if (input.candles.length === 0 && (input.optionChains?.length ?? 0) === 0) {
      throw new InvalidBacktestRequestError('At least one candle or option chain is required');
    }

    if (input.config.initialCapital <= 0) {
      throw new InvalidBacktestRequestError('initialCapital must be greater than zero');
    }
  }

  private toReplayInput(
    config: BacktestEngineConfig,
    candles: BacktestCandle[],
    optionChains: HistoricalOptionChainDTO[],
  ): ReplayInputDTO {
    return {
      instrumentId: config.instrumentId,
      symbol: config.symbol,
      candles,
      optionChains,
    };
  }

  private convertLegacyEvents(events: MarketEvent[]): {
    candles: BacktestCandle[];
    optionChains: HistoricalOptionChainDTO[];
  } {
    const candles: BacktestCandle[] = [];
    const optionChains: HistoricalOptionChainDTO[] = [];

    for (const event of events) {
      candles.push({
        timestamp: event.timestamp,
        open: event.open ?? event.price,
        high: event.high ?? event.price,
        low: event.low ?? event.price,
        close: event.close ?? event.price,
        volume: event.volume ?? 0,
      });

      if (event.optionChain) {
        optionChains.push({
          timestamp: event.timestamp,
          instrumentId: event.instrumentId,
          symbol: event.symbol,
          chain: event.optionChain,
        });
      }
    }

    return { candles, optionChains };
  }
}

export function createUnifiedBacktestEngine(
  dependencies: BacktestEngineDependencies,
): UnifiedBacktestEngine {
  return new UnifiedBacktestEngine(dependencies);
}

export function createDefaultBacktestEngineDependencies(
  replayEngine: BacktestEngineDependencies['replayEngine'],
  eventBus: BacktestEngineDependencies['eventBus'],
): BacktestEngineDependencies {
  return {
    replayEngine,
    eventBus,
    createPortfolioEngine: (initialCapital) => createPortfolioEngine({ initialCapital }),
    createRiskEngine: (riskConfig) =>
      createRiskEngine(createRiskEngineConfig(riskConfig ?? BACKTEST_RISK_CONFIG)),
    createMetricsEngine: () => createMetricsEngine(),
  };
}

export { BACKTEST_RISK_CONFIG } from './backtest-engine.types.js';
