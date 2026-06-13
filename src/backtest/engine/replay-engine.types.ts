import type { BacktestCandle } from '../types/backtest-candle.type.js';
import type { OptionChainSnapshot } from '../../strategies/types/market-snapshot.type.js';
import type { ReplayObservabilityContext } from '../observability/backtest-metrics.types.js';
import type { BacktestEvent } from './events/backtest-event.type.js';

export interface HistoricalOptionChainDTO {
  timestamp: Date;
  instrumentId: string;
  symbol: string;
  chain: OptionChainSnapshot;
}

export interface ReplayInputDTO {
  instrumentId: string;
  symbol: string;
  candles: BacktestCandle[];
  optionChains?: HistoricalOptionChainDTO[];
  observability?: ReplayObservabilityContext;
}

export interface ReplayResultDTO {
  events: BacktestEvent[];
  marketEventCount: number;
  optionChainEventCount: number;
  startDate: Date;
  endDate: Date;
}

export interface BacktestEventSubscriber {
  readonly name: string;
  handle(event: BacktestEvent): void;
}

export interface HistoricalDataSource {
  loadCandles(instrumentId: string): Promise<BacktestCandle[]>;
  loadOptionChains(instrumentId: string): Promise<HistoricalOptionChainDTO[]>;
}
