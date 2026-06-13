import type { BacktestCandle } from '../types/backtest-candle.type.js';
import type { BacktestConfig } from '../types/backtest-config.type.js';
import type { BacktestRunResult } from '../types/backtest-result.type.js';
import { InvalidBacktestRequestError } from '../errors/backtest.errors.js';
import type { MetricsCalculator } from '../metrics/metrics-calculator.js';
import type { OrderSimulator } from '../simulation/order-simulator.js';
import type { PortfolioTracker } from '../portfolio/portfolio-tracker.js';
import type { CandleReplayer } from '../replay/candle-replayer.js';
import { createBacktestMetricsPublisher } from '../observability/backtest-metrics.publisher.js';
import { getTracingService } from '../../observability/instrumentation.js';
import type { StrategyEngine } from '../../strategies/engine/strategy-engine.js';
import { createMarketSnapshot } from '../../strategies/types/market-snapshot.type.js';

export interface CandleBacktestRunRequest {
  config: BacktestConfig;
  candles: BacktestCandle[];
}

export interface CandleBacktestEngineDependencies {
  strategyEngine: StrategyEngine;
  candleReplayer: CandleReplayer;
  orderSimulator: OrderSimulator;
  metricsCalculator: MetricsCalculator;
  createPortfolioTracker: (initialCapital: number) => PortfolioTracker;
}

/** Legacy equity candle backtest path (non-option strategies). */
export class CandleBacktestEngine {
  constructor(private readonly dependencies: CandleBacktestEngineDependencies) {}

  run(request: CandleBacktestRunRequest): BacktestRunResult {
    this.validateRequest(request);

    const tracing = getTracingService();
    const metricsPublisher = createBacktestMetricsPublisher({
      strategyName: request.config.strategyName,
      portfolioId: `${request.config.instrumentId}-backtest`,
      portfolioMode: 'backtest',
      instrumentId: request.config.instrumentId,
      symbol: request.config.symbol,
    });

    metricsPublisher.beginReplay(request.candles.length);

    try {
      const result = tracing.withSpanSync(
        'backtest.run',
        {
          'strategy.name': request.config.strategyName,
          'instrument.id': request.config.instrumentId,
          'backtest.candles': request.candles.length,
        },
        () => this.executeRun(request, metricsPublisher),
      );

      metricsPublisher.finishReplay('success');
      return result;
    } catch (error) {
      metricsPublisher.finishReplay('error');
      throw error;
    }
  }

  private executeRun(
    request: CandleBacktestRunRequest,
    metricsPublisher: ReturnType<typeof createBacktestMetricsPublisher>,
  ): BacktestRunResult {
    const replayedCandles = this.dependencies.candleReplayer.replay(request.candles);
    const portfolioTracker = this.dependencies.createPortfolioTracker(
      request.config.initialCapital,
    );
    const portfolio = portfolioTracker.state;

    metricsPublisher.recordPortfolioEquity(portfolio.cash);

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
        metricsPublisher,
      );

      const trade = this.dependencies.orderSimulator.execute(
        signal,
        candle,
        portfolio,
        request.config,
      );

      if (trade) {
        portfolioTracker.recordTrade(trade);
        metricsPublisher.recordOrderExecuted({
          strategyName: request.config.strategyName,
          side: trade.side.toLowerCase() as 'buy' | 'sell',
        });
      }

      portfolioTracker.markToMarket(candle);
      metricsPublisher.recordPortfolioEquity(portfolioTracker.getEquity(candle.close));
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

  private validateRequest(request: CandleBacktestRunRequest): void {
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

export function createCandleBacktestEngine(
  dependencies: CandleBacktestEngineDependencies,
): CandleBacktestEngine {
  return new CandleBacktestEngine(dependencies);
}
