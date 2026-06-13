export interface BacktestCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function sortCandlesByTime(candles: BacktestCandle[]): BacktestCandle[] {
  return [...candles].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
}
