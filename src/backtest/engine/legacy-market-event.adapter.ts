import { BacktestEventType } from './events/backtest-event-type.enum.js';
import type { BacktestEvent } from './events/backtest-event.type.js';
import type { MarketEvent as EngineMarketEvent } from './events/market-event.type.js';
import type { OptionChainEvent } from './events/option-chain-event.type.js';
import type { MarketEvent as LegacyMarketEvent } from '../types/market-event.type.js';
import { createMarketEvent as createLegacyMarketEvent } from '../types/market-event.type.js';

function isMarketEvent(event: BacktestEvent): event is EngineMarketEvent {
  return event.type === BacktestEventType.MARKET;
}

function isOptionChainEvent(event: BacktestEvent): event is OptionChainEvent {
  return event.type === BacktestEventType.OPTION_CHAIN;
}

export function toLegacyMarketEvents(events: BacktestEvent[]): LegacyMarketEvent[] {
  const legacyEvents: LegacyMarketEvent[] = [];
  let pendingMarket: EngineMarketEvent | undefined;

  for (const event of events) {
    if (isMarketEvent(event)) {
      if (pendingMarket) {
        legacyEvents.push(
          createLegacyMarketEvent({
            timestamp: pendingMarket.timestamp,
            instrumentId: pendingMarket.instrumentId,
            symbol: pendingMarket.symbol,
            price: pendingMarket.close,
            open: pendingMarket.open,
            high: pendingMarket.high,
            low: pendingMarket.low,
            close: pendingMarket.close,
            volume: pendingMarket.volume,
          }),
        );
      }
      pendingMarket = event;
      continue;
    }

    if (isOptionChainEvent(event) && pendingMarket) {
      legacyEvents.push(
        createLegacyMarketEvent({
          timestamp: pendingMarket.timestamp,
          instrumentId: pendingMarket.instrumentId,
          symbol: pendingMarket.symbol,
          price: pendingMarket.close,
          open: pendingMarket.open,
          high: pendingMarket.high,
          low: pendingMarket.low,
          close: pendingMarket.close,
          volume: pendingMarket.volume,
          optionChain: event.chain,
        }),
      );
      pendingMarket = undefined;
    }
  }

  if (pendingMarket) {
    legacyEvents.push(
      createLegacyMarketEvent({
        timestamp: pendingMarket.timestamp,
        instrumentId: pendingMarket.instrumentId,
        symbol: pendingMarket.symbol,
        price: pendingMarket.close,
        open: pendingMarket.open,
        high: pendingMarket.high,
        low: pendingMarket.low,
        close: pendingMarket.close,
        volume: pendingMarket.volume,
      }),
    );
  }

  return legacyEvents;
}

export function fromLegacyMarketEvents(events: LegacyMarketEvent[]): BacktestEvent[] {
  const converted: BacktestEvent[] = [];

  for (const event of events) {
    converted.push({
      eventId: `legacy-market-${converted.length + 1}`,
      type: BacktestEventType.MARKET,
      timestamp: event.timestamp,
      instrumentId: event.instrumentId,
      symbol: event.symbol,
      open: event.open ?? event.price,
      high: event.high ?? event.price,
      low: event.low ?? event.price,
      close: event.close ?? event.price,
      volume: event.volume ?? 0,
    });

    if (event.optionChain) {
      converted.push({
        eventId: `legacy-option-chain-${converted.length + 1}`,
        type: BacktestEventType.OPTION_CHAIN,
        timestamp: event.timestamp,
        instrumentId: event.instrumentId,
        symbol: event.symbol,
        chain: event.optionChain,
      });
    }
  }

  return converted;
}
