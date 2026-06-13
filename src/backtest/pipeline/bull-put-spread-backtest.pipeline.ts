import { InvalidBacktestRequestError } from '../errors/backtest.errors.js';
import type { BacktestEngineConfig } from '../engine/backtest-engine.types.js';
import {
  createDefaultBacktestEngineDependencies,
  createUnifiedBacktestEngine,
} from '../engine/unified-backtest.engine.js';
import type { BacktestReport } from '../types/backtest-report.type.js';
import type { MarketEvent } from '../types/market-event.type.js';
import type { Strategy } from '../../strategies/strategy.interface.js';
import { createInMemoryEventBus, createReplayEngine } from '../engine/index.js';

export type BullPutSpreadBacktestConfig = BacktestEngineConfig;

export class BullPutSpreadBacktestPipeline {
  private readonly engine = createUnifiedBacktestEngine(
    createDefaultBacktestEngineDependencies(
      createReplayEngine(createInMemoryEventBus()),
      createInMemoryEventBus(),
    ),
  );

  run(
    config: BullPutSpreadBacktestConfig,
    events: MarketEvent[],
    strategy: Strategy,
  ): BacktestReport {
    this.validate(config, events, strategy);

    return this.engine.runFromEvents({
      config: { ...config, strategyName: strategy.name },
      strategy,
      events,
    });
  }

  private validate(
    config: BullPutSpreadBacktestConfig,
    events: MarketEvent[],
    strategy: Strategy,
  ): void {
    if (events.length === 0) {
      throw new InvalidBacktestRequestError('At least one market event is required');
    }

    if (config.initialCapital <= 0) {
      throw new InvalidBacktestRequestError('initialCapital must be greater than zero');
    }

    if (!strategy.name) {
      throw new InvalidBacktestRequestError('strategy is required');
    }

    const hasOptionChain = events.some((event) => event.optionChain !== undefined);
    if (!hasOptionChain) {
      throw new InvalidBacktestRequestError('At least one event must include an option chain');
    }
  }
}

export function createBullPutSpreadBacktestPipeline(): BullPutSpreadBacktestPipeline {
  return new BullPutSpreadBacktestPipeline();
}

export function runBullPutSpreadBacktestV1(
  strategy: Strategy,
  config: BullPutSpreadBacktestConfig,
  events: MarketEvent[],
): BacktestReport {
  return createBullPutSpreadBacktestPipeline().run(config, events, strategy);
}
