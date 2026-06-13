import type { BacktestEvent } from './events/backtest-event.type.js';
import { BacktestEventType } from './events/backtest-event-type.enum.js';
import type { BacktestEventHandler, EventBus, EventSubscription } from './event-bus.interface.js';

interface HandlerEntry {
  handler: BacktestEventHandler;
}

export class InMemoryEventBus implements EventBus {
  private readonly typedHandlers = new Map<BacktestEventType, HandlerEntry[]>();
  private readonly globalHandlers: HandlerEntry[] = [];

  subscribe<T extends BacktestEvent>(
    type: BacktestEventType,
    handler: BacktestEventHandler<T>,
  ): EventSubscription {
    const entry: HandlerEntry = { handler: handler as BacktestEventHandler };
    const handlers = this.typedHandlers.get(type) ?? [];
    handlers.push(entry);
    this.typedHandlers.set(type, handlers);

    return {
      unsubscribe: () => {
        const current = this.typedHandlers.get(type);
        if (!current) {
          return;
        }
        this.typedHandlers.set(
          type,
          current.filter((candidate) => candidate !== entry),
        );
      },
    };
  }

  subscribeAll(handler: BacktestEventHandler): EventSubscription {
    const entry: HandlerEntry = { handler };
    this.globalHandlers.push(entry);

    return {
      unsubscribe: () => {
        const index = this.globalHandlers.indexOf(entry);
        if (index >= 0) {
          this.globalHandlers.splice(index, 1);
        }
      },
    };
  }

  publish(event: BacktestEvent): void {
    const typedHandlers = this.typedHandlers.get(event.type) ?? [];
    for (const entry of typedHandlers) {
      entry.handler(event);
    }

    for (const entry of this.globalHandlers) {
      entry.handler(event);
    }
  }

  clear(): void {
    this.typedHandlers.clear();
    this.globalHandlers.length = 0;
  }
}

export function createInMemoryEventBus(): InMemoryEventBus {
  return new InMemoryEventBus();
}
