import type { BacktestCandle } from '../types/backtest-candle.type.js';
import { BacktestEventType } from './events/backtest-event-type.enum.js';
import type { BacktestEvent, HistoricalBacktestEvent } from './events/backtest-event.type.js';
import { createMarketEvent } from './events/market-event.type.js';
import { createOptionChainEvent } from './events/option-chain-event.type.js';
import type { HistoricalOptionChainDTO } from './replay-engine.types.js';

const EVENT_TYPE_ORDER: Record<BacktestEventType, number> = {
  [BacktestEventType.MARKET]: 0,
  [BacktestEventType.OPTION_CHAIN]: 1,
  [BacktestEventType.SIGNAL]: 2,
  [BacktestEventType.ORDER_FILLED]: 3,
  [BacktestEventType.POSITION_OPENED]: 4,
  [BacktestEventType.POSITION_CLOSED]: 5,
};

export class HistoricalDataLoaderService {
  loadCandles(
    candles: BacktestCandle[],
    instrumentId: string,
    symbol: string,
  ): HistoricalBacktestEvent[] {
    return candles.map((candle) =>
      createMarketEvent({
        timestamp: candle.timestamp,
        instrumentId,
        symbol,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }),
    );
  }

  loadOptionChains(optionChains: HistoricalOptionChainDTO[]): HistoricalBacktestEvent[] {
    return optionChains.map((entry) =>
      createOptionChainEvent({
        timestamp: entry.timestamp,
        instrumentId: entry.instrumentId,
        symbol: entry.symbol,
        chain: entry.chain,
      }),
    );
  }

  mergeAndSort(...eventGroups: BacktestEvent[][]): BacktestEvent[] {
    const merged = eventGroups.flat();
    return [...merged].sort((left, right) => {
      const timeDelta = left.timestamp.getTime() - right.timestamp.getTime();
      if (timeDelta !== 0) {
        return timeDelta;
      }

      return EVENT_TYPE_ORDER[left.type] - EVENT_TYPE_ORDER[right.type];
    });
  }
}

export function createHistoricalDataLoaderService(): HistoricalDataLoaderService {
  return new HistoricalDataLoaderService();
}
