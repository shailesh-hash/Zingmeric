import type { BacktestCandle } from '../types/backtest-candle.type.js';
import { sortCandlesByTime } from '../types/backtest-candle.type.js';

export class CandleReplayer {
  replay(candles: BacktestCandle[]): BacktestCandle[] {
    return sortCandlesByTime(candles);
  }
}
