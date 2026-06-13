import type { BacktestEvent } from './events/backtest-event.type.js';
import type { BacktestEventType } from './events/backtest-event-type.enum.js';

export type BacktestEventHandler<T extends BacktestEvent = BacktestEvent> = (event: T) => void;

export interface EventSubscription {
  unsubscribe(): void;
}

export interface EventBus {
  subscribe<T extends BacktestEvent>(
    type: BacktestEventType,
    handler: BacktestEventHandler<T>,
  ): EventSubscription;

  subscribeAll(handler: BacktestEventHandler): EventSubscription;

  publish(event: BacktestEvent): void;

  clear(): void;
}
