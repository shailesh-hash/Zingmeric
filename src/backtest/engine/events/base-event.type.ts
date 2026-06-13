import type { BacktestEventType } from './backtest-event-type.enum.js';

export interface BaseBacktestEvent {
  readonly eventId: string;
  readonly type: BacktestEventType;
  readonly timestamp: Date;
}

let eventCounter = 0;

export function resetBacktestEventCounter(): void {
  eventCounter = 0;
}

export function nextEventId(prefix: string): string {
  eventCounter += 1;
  return `${prefix}-${eventCounter}`;
}
