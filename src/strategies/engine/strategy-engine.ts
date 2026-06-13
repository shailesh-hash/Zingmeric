import {
  InvalidSignalError,
  InvalidStrategyEngineError,
  StrategyNotFoundError,
} from '../errors/strategy.errors.js';
import type { Strategy } from '../strategy.interface.js';
import type { MarketSnapshot } from '../types/market-snapshot.type.js';
import { isSignalAction, type Signal, type SignalAction } from '../types/signal.type.js';

export interface StrategyEngineDependencies {
  strategies: Strategy[];
  defaultStrategyName?: string;
}

export class StrategyEngine {
  private readonly strategyMap: Map<string, Strategy>;
  private readonly defaultStrategyName: string;

  constructor({ strategies, defaultStrategyName }: StrategyEngineDependencies) {
    if (strategies.length === 0) {
      throw new InvalidStrategyEngineError('StrategyEngine requires at least one strategy');
    }

    this.strategyMap = new Map<string, Strategy>();

    for (const strategy of strategies) {
      if (this.strategyMap.has(strategy.name)) {
        throw new InvalidStrategyEngineError(`Duplicate strategy name: ${strategy.name}`);
      }
      this.strategyMap.set(strategy.name, strategy);
    }

    const resolvedDefault = defaultStrategyName ?? strategies[0]?.name;
    if (!resolvedDefault || !this.strategyMap.has(resolvedDefault)) {
      throw new InvalidStrategyEngineError(
        `Default strategy not found: ${defaultStrategyName ?? 'undefined'}`,
      );
    }

    this.defaultStrategyName = resolvedDefault;
  }

  listStrategies(): string[] {
    return [...this.strategyMap.keys()];
  }

  generateSignal(snapshot: MarketSnapshot, strategyName?: string): Signal {
    const name = strategyName ?? this.defaultStrategyName;
    const strategy = this.strategyMap.get(name);

    if (!strategy) {
      throw new StrategyNotFoundError(name);
    }

    const signal = strategy.evaluate(snapshot);
    this.validateSignal(signal, snapshot);

    return signal;
  }

  generateSignals(snapshot: MarketSnapshot): Signal[] {
    return [...this.strategyMap.values()].map((strategy) =>
      this.generateSignal(snapshot, strategy.name),
    );
  }

  private validateSignal(signal: Signal, snapshot: MarketSnapshot): void {
    if (!isSignalAction(signal.action)) {
      throw new InvalidSignalError(`Invalid signal action: ${String(signal.action)}`);
    }

    if (signal.strategyName.length === 0) {
      throw new InvalidSignalError('Signal strategyName is required');
    }

    if (signal.instrumentId !== snapshot.instrumentId) {
      throw new InvalidSignalError('Signal instrumentId must match snapshot instrumentId');
    }

    if (signal.timestamp.getTime() !== snapshot.timestamp.getTime()) {
      throw new InvalidSignalError('Signal timestamp must match snapshot timestamp');
    }
  }
}

export function createStrategyEngine(dependencies: StrategyEngineDependencies): StrategyEngine {
  return new StrategyEngine(dependencies);
}

export type { SignalAction };
