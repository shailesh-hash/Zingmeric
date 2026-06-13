import {
  runBullPutSpreadBacktestV1,
  type BullPutSpreadBacktestConfig,
} from '../../backtest/pipeline/bull-put-spread-backtest.pipeline.js';
import { createMarketEvent } from '../../backtest/types/market-event.type.js';
import type { BacktestMetrics } from '../../backtest/types/backtest-result.type.js';
import type { EquityPoint, SimulatedTrade } from '../../backtest/types/portfolio-state.type.js';
import type { OptionChainSnapshot } from '../types/market-snapshot.type.js';
import { BullPutSpreadStrategy } from './bull-put-spread.strategy.js';

export interface BullPutSpreadBacktestCandle {
  timestamp: Date;
  close: number;
  optionChain: OptionChainSnapshot;
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

function toMarketEvents(
  config: Pick<BullPutSpreadBacktestConfig, 'instrumentId' | 'symbol'>,
  candles: BullPutSpreadBacktestCandle[],
) {
  return candles.map((candle) =>
    createMarketEvent({
      timestamp: candle.timestamp,
      instrumentId: config.instrumentId,
      symbol: config.symbol,
      price: candle.close,
      close: candle.close,
      optionChain: candle.optionChain,
    }),
  );
}

export function runBullPutSpreadBacktest(
  strategy: BullPutSpreadStrategy,
  config: Pick<
    BullPutSpreadBacktestConfig,
    'instrumentId' | 'symbol' | 'initialCapital' | 'lotSize' | 'riskFreeRate'
  >,
  candles: BullPutSpreadBacktestCandle[],
): BullPutSpreadBacktestResult {
  const pipelineConfig: BullPutSpreadBacktestConfig = {
    instrumentId: config.instrumentId,
    symbol: config.symbol,
    strategyName: strategy.name,
    initialCapital: config.initialCapital,
    lotSize: config.lotSize,
    riskFreeRate: config.riskFreeRate,
    includeCosts: false,
  };

  const report = runBullPutSpreadBacktestV1(
    strategy,
    pipelineConfig,
    toMarketEvents(config, candles),
  );

  return {
    instrumentId: report.instrumentId,
    symbol: report.symbol,
    strategyName: report.strategyName,
    startDate: report.startDate,
    endDate: report.endDate,
    metrics: report.metrics,
    trades: report.trades,
    equityCurve: report.equityCurve,
  };
}
