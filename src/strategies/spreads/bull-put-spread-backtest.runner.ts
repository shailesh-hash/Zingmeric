import { DefaultMetricsCalculator } from '../../backtest/metrics/metrics-calculator.js';
import type { BacktestMetrics } from '../../backtest/types/backtest-result.type.js';
import type { EquityPoint, SimulatedTrade } from '../../backtest/types/portfolio-state.type.js';
import { sortCandlesByTime } from '../../backtest/types/backtest-candle.type.js';
import { createMarketSnapshot } from '../types/market-snapshot.type.js';
import type { OptionChainSnapshot } from '../types/market-snapshot.type.js';
import { BullPutSpreadStrategy } from './bull-put-spread.strategy.js';
import { calculateSpreadCloseCost } from './option-chain.utils.js';
import { SignalAction } from '../types/signal.type.js';

export interface BullPutSpreadBacktestCandle {
  timestamp: Date;
  close: number;
  optionChain: OptionChainSnapshot;
}

export interface BullPutSpreadBacktestConfig {
  instrumentId: string;
  symbol: string;
  initialCapital: number;
  lotSize?: number;
  riskFreeRate?: number;
}

export interface BullPutSpreadBacktestResult {
  instrumentId: string;
  symbol: string;
  strategyName: string;
  startDate: Date;
  endDate: Date;
  metrics: BacktestMetrics;
  trades: SimulatedTrade[];
  equityCurve: EquityPoint[];
}

export function runBullPutSpreadBacktest(
  strategy: BullPutSpreadStrategy,
  config: BullPutSpreadBacktestConfig,
  candles: BullPutSpreadBacktestCandle[],
): BullPutSpreadBacktestResult {
  const sortedCandles = sortCandlesByTime(
    candles.map((candle) => ({
      timestamp: candle.timestamp,
      open: candle.close,
      high: candle.close,
      low: candle.close,
      close: candle.close,
      volume: 0,
    })),
  );

  const candleByTimestamp = new Map(candles.map((candle) => [candle.timestamp.getTime(), candle]));

  let cash = config.initialCapital;
  const trades: SimulatedTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  let openCredit = 0;
  let openPosition: {
    shortStrike: number;
    longStrike: number;
    entryCredit: number;
  } | null = null;

  for (const replayCandle of sortedCandles) {
    const sourceCandle = candleByTimestamp.get(replayCandle.timestamp.getTime());

    if (!sourceCandle) {
      continue;
    }

    const snapshot = createMarketSnapshot({
      timestamp: sourceCandle.timestamp,
      instrumentId: config.instrumentId,
      symbol: config.symbol,
      price: sourceCandle.close,
      close: sourceCandle.close,
      optionChain: sourceCandle.optionChain,
    });

    const signal = strategy.evaluate(snapshot);
    const lotSize = config.lotSize ?? 1;

    if (signal.action === SignalAction.BUY && strategy.openPosition) {
      openCredit = strategy.openPosition.entryCredit * lotSize;
      openPosition = {
        shortStrike: strategy.openPosition.shortStrike,
        longStrike: strategy.openPosition.longStrike,
        entryCredit: openCredit,
      };
      cash += openCredit;

      trades.push({
        timestamp: snapshot.timestamp,
        side: 'BUY',
        quantity: lotSize,
        price: strategy.openPosition.entryCredit,
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        realizedPnl: 0,
      });
    }

    if (signal.action === SignalAction.SELL && openPosition) {
      const closeCost =
        calculateSpreadCloseCost(
          openPosition.shortStrike,
          openPosition.longStrike,
          sourceCandle.optionChain.puts,
        ) ?? 0;
      const totalCloseCost = closeCost * lotSize;
      const realizedPnl = openCredit - totalCloseCost;

      cash -= totalCloseCost;
      trades.push({
        timestamp: snapshot.timestamp,
        side: 'SELL',
        quantity: lotSize,
        price: closeCost,
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        realizedPnl,
      });

      openPosition = null;
      openCredit = 0;
    }

    const markToMarketDebit = openPosition
      ? (calculateSpreadCloseCost(
          openPosition.shortStrike,
          openPosition.longStrike,
          sourceCandle.optionChain.puts,
        ) ?? openPosition.entryCredit)
      : 0;
    const unrealizedPnl = openPosition ? openCredit - markToMarketDebit * lotSize : 0;
    const equity = cash + unrealizedPnl;

    equityCurve.push({
      timestamp: snapshot.timestamp,
      equity,
      cash,
      positionValue: unrealizedPnl,
    });
  }

  const startDate = sortedCandles[0]?.timestamp ?? new Date();
  const endDate = sortedCandles.at(-1)?.timestamp ?? startDate;
  const metricsCalculator = new DefaultMetricsCalculator();

  const metrics = metricsCalculator.calculate({
    equityCurve,
    trades,
    initialCapital: config.initialCapital,
    startDate,
    endDate,
    riskFreeRate: config.riskFreeRate ?? 0.06,
  });

  return {
    instrumentId: config.instrumentId,
    symbol: config.symbol,
    strategyName: strategy.name,
    startDate,
    endDate,
    metrics,
    trades,
    equityCurve,
  };
}
