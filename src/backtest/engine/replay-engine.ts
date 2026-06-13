import { InvalidBacktestRequestError } from '../errors/backtest.errors.js';
import {
  createBacktestMetricsPublisher,
  type BacktestMetricsPublisher,
} from '../observability/backtest-metrics.publisher.js';
import { getTracingService } from '../../observability/instrumentation.js';
import { BacktestEventType } from './events/backtest-event-type.enum.js';
import type { BacktestEvent } from './events/backtest-event.type.js';
import type { EventBus } from './event-bus.interface.js';
import {
  createHistoricalDataLoaderService,
  HistoricalDataLoaderService,
} from './historical-data-loader.service.js';
import type {
  BacktestEventSubscriber,
  ReplayInputDTO,
  ReplayResultDTO,
} from './replay-engine.types.js';

export interface ReplayOptions {
  metricsPublisher?: BacktestMetricsPublisher;
}

export class ReplayEngine {
  constructor(
    private readonly eventBus: EventBus,
    private readonly dataLoader: HistoricalDataLoaderService = createHistoricalDataLoaderService(),
  ) {}

  load(input: ReplayInputDTO): BacktestEvent[] {
    this.validate(input);

    const marketEvents = this.dataLoader.loadCandles(
      input.candles,
      input.instrumentId,
      input.symbol,
    );
    const optionChainEvents = this.dataLoader.loadOptionChains(input.optionChains ?? []);

    return this.dataLoader.mergeAndSort(marketEvents, optionChainEvents);
  }

  replay(
    input: ReplayInputDTO,
    subscribers: BacktestEventSubscriber[] = [],
    options: ReplayOptions = {},
  ): ReplayResultDTO {
    const tracing = getTracingService();
    const metricsPublisher = this.resolveMetricsPublisher(input, options);

    return tracing.withSpanSync(
      'backtest.replay',
      {
        'strategy.name': input.observability?.strategyName ?? 'unknown',
        'instrument.id': input.instrumentId,
        'instrument.symbol': input.symbol,
      },
      () => this.executeReplay(input, subscribers, metricsPublisher),
    );
  }

  private executeReplay(
    input: ReplayInputDTO,
    subscribers: BacktestEventSubscriber[],
    metricsPublisher?: BacktestMetricsPublisher,
  ): ReplayResultDTO {
    const events = this.load(input);
    const allSubscribers = metricsPublisher ? [metricsPublisher, ...subscribers] : subscribers;

    const subscriptions = allSubscribers.map((subscriber) =>
      this.eventBus.subscribeAll((event) => {
        subscriber.handle(event);
      }),
    );

    metricsPublisher?.beginReplay(events.length);

    try {
      for (const event of events) {
        this.eventBus.publish(event);
      }

      metricsPublisher?.finishReplay('success');
      return this.buildResult(events);
    } catch (error) {
      metricsPublisher?.finishReplay('error');
      throw error;
    } finally {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    }
  }

  private resolveMetricsPublisher(
    input: ReplayInputDTO,
    options: ReplayOptions,
  ): BacktestMetricsPublisher | undefined {
    if (options.metricsPublisher) {
      return options.metricsPublisher;
    }

    if (!input.observability) {
      return undefined;
    }

    return createBacktestMetricsPublisher({
      ...input.observability,
      instrumentId: input.observability.instrumentId ?? input.instrumentId,
      symbol: input.observability.symbol ?? input.symbol,
    });
  }

  private buildResult(events: BacktestEvent[]): ReplayResultDTO {
    const marketEventCount = events.filter(
      (event) => event.type === BacktestEventType.MARKET,
    ).length;
    const optionChainEventCount = events.filter(
      (event) => event.type === BacktestEventType.OPTION_CHAIN,
    ).length;

    const startDate = events[0]?.timestamp ?? new Date();
    const endDate = events.at(-1)?.timestamp ?? startDate;

    return {
      events,
      marketEventCount,
      optionChainEventCount,
      startDate,
      endDate,
    };
  }

  private validate(input: ReplayInputDTO): void {
    if (input.candles.length === 0 && (input.optionChains?.length ?? 0) === 0) {
      throw new InvalidBacktestRequestError(
        'At least one candle or option chain is required for replay',
      );
    }

    if (!input.instrumentId.trim()) {
      throw new InvalidBacktestRequestError('instrumentId is required');
    }

    if (!input.symbol.trim()) {
      throw new InvalidBacktestRequestError('symbol is required');
    }
  }
}

export function createReplayEngine(eventBus: EventBus): ReplayEngine {
  return new ReplayEngine(eventBus);
}
