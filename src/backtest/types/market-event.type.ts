import type { OptionChainSnapshot } from '../../strategies/types/market-snapshot.type.js';

export interface MarketEvent {
  timestamp: Date;
  instrumentId: string;
  symbol: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  optionChain?: OptionChainSnapshot;
}

export function createMarketEvent(
  overrides: Pick<MarketEvent, 'timestamp' | 'instrumentId' | 'symbol' | 'price'> &
    Partial<Omit<MarketEvent, 'timestamp' | 'instrumentId' | 'symbol' | 'price'>>,
): MarketEvent {
  return {
    timestamp: overrides.timestamp,
    instrumentId: overrides.instrumentId,
    symbol: overrides.symbol,
    price: overrides.price,
    open: overrides.open,
    high: overrides.high,
    low: overrides.low,
    close: overrides.close ?? overrides.price,
    volume: overrides.volume,
    optionChain: overrides.optionChain,
  };
}
