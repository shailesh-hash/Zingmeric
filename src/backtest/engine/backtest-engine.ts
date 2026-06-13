import type { BacktestCandle } from '../types/backtest-candle.type.js';
import type { BacktestConfig } from '../types/backtest-config.type.js';
import type { BacktestRunResult } from '../types/backtest-result.type.js';
import { InvalidBacktestRequestError } from '../errors/backtest.errors.js';
import type { MetricsCalculator } from '../metrics/metrics-calculator.js';
import type { OrderSimulator } from '../simulation/order-simulator.js';
import type { PortfolioTracker } from '../portfolio/portfolio-tracker.js';
import type { CandleReplayer } from '../replay/candle-replayer.js';
import type { StrategyEngine } from '../../strategies/engine/strategy-engine.js';
import { createMarketSnapshot } from '../../strategies/types/market-snapshot.type.js';

export interface BacktestRunRequest {
  config: BacktestConfig;
  candles: BacktestCandle[];
}

export interface BacktestEngineDependencies {
  strategyEngine: StrategyEngine;
  candleReplayer: CandleReplayer;
  orderSimulator: OrderSimulator;
  metricsCalculator: MetricsCalculator;
  createPortfolioTracker: (initialCapital: number) => PortfolioTracker;
}

export class BacktestEngine {
  constructor(private readonly dependencies: BacktestEngineDependencies) {}

  run(request: BacktestRunRequest): BacktestRunResult {
    this.validateRequest(request);

    const replayedCandles = this.dependencies.candleReplayer.replay(request.candles);
    const portfolioTracker = this.dependencies.createPortfolioTracker(
      request.config.initialCapital,
    );
    const portfolio = portfolioTracker.state;

    for (const candle of replayedCandles) {
      const snapshot = createMarketSnapshot({
        timestamp: candle.timestamp,
        instrumentId: request.config.instrumentId,
        symbol: request.config.symbol,
        price: candle.close,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });

      const signal = this.dependencies.strategyEngine.generateSignal(
        snapshot,
        request.config.strategyName,
      );

      const trade = this.dependencies.orderSimulator.execute(
        signal,
        candle,
        portfolio,
        request.config,
      );

      if (trade) {
        portfolioTracker.recordTrade(trade);
      }

      portfolioTracker.markToMarket(candle);
    }

    const startDate = replayedCandles[0]?.timestamp ?? new Date();
    const endDate = replayedCandles.at(-1)?.timestamp ?? startDate;

    const metrics = this.dependencies.metricsCalculator.calculate({
      equityCurve: portfolio.equityCurve,
      trades: portfolio.trades,
      initialCapital: request.config.initialCapital,
      startDate,
      endDate,
      riskFreeRate: request.config.riskFreeRate ?? 0.06,
    });

    return {
      instrumentId: request.config.instrumentId,
      symbol: request.config.symbol,
      strategyName: request.config.strategyName,
      startDate,
      endDate,
      metrics,
      trades: portfolio.trades,
      equityCurve: portfolio.equityCurve,
    };
  }

  private validateRequest(request: BacktestRunRequest): void {
    if (request.candles.length === 0) {
      throw new InvalidBacktestRequestError('At least one candle is required');
    }

    if (request.config.initialCapital <= 0) {
      throw new InvalidBacktestRequestError('initialCapital must be greater than zero');
    }

    if (request.config.quantityPerTrade <= 0) {
      throw new InvalidBacktestRequestError('quantityPerTrade must be greater than zero');
    }
  }
}

export function createBacktestEngine(dependencies: BacktestEngineDependencies): BacktestEngine {
  return new BacktestEngine(dependencies);
}
