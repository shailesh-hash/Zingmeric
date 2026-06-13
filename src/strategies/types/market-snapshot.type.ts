export interface OptionPutQuote {
  strike: number;
  premium: number;
  delta: number;
}

export interface OptionCallQuote {
  strike: number;
  premium: number;
  delta: number;
}

export interface OptionChainSnapshot {
  expiryDate: Date;
  underlyingPrice: number;
  puts: OptionPutQuote[];
  calls: OptionCallQuote[];
}

export interface MarketSnapshot {
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

export function createMarketSnapshot(
  overrides: Partial<MarketSnapshot> & Pick<MarketSnapshot, 'instrumentId' | 'symbol' | 'price'>,
): MarketSnapshot {
  return {
    timestamp: overrides.timestamp ?? new Date(),
    instrumentId: overrides.instrumentId,
    symbol: overrides.symbol,
    price: overrides.price,
    open: overrides.open,
    high: overrides.high,
    low: overrides.low,
    close: overrides.close,
    volume: overrides.volume,
    optionChain: overrides.optionChain,
  };
}
