import type { MarketEvent as LegacyMarketEvent } from '../types/market-event.type.js';

export class EventReplayEngine {
  replay(events: LegacyMarketEvent[]): LegacyMarketEvent[] {
    return [...events].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  }

  *iterate(events: LegacyMarketEvent[]): Generator<LegacyMarketEvent, void, undefined> {
    for (const event of this.replay(events)) {
      yield event;
    }
  }
}

export function createEventReplayEngine(): EventReplayEngine {
  return new EventReplayEngine();
}
