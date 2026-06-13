import { InvalidOrderRequestError, OrderNotFoundError } from '../errors/broker.errors.js';
import {
  OrderStatus,
  OrderType,
  type BrokerFill,
  type BrokerOrder,
  type BrokerPnlSummary,
  type BrokerPositionView,
  type CancelOrderResult,
  type PlaceOrderRequest,
  type PlaceOrderResult,
} from '../types/broker.types.js';
import { LiveBrokerAdapter } from '../live/live-broker.adapter.js';
import type { LiveBrokerAdapterConfig } from '../live/live-broker.adapter.js';
import type { UpstoxApiClient } from './upstox-api.client.interface.js';
import type { UpstoxInstrumentResolver } from './upstox.instrument-resolver.js';
import {
  buildUpstoxPlaceOrderRequest,
  createPendingFill,
  positionKey,
  toBrokerOrder,
  toBrokerPositionView,
} from './upstox.mapper.js';
import type { UpstoxBrokerConfig } from './types/upstox.types.js';

interface TrackedPositionMeta {
  instrumentId: string;
  strategyName: string;
}

export interface UpstoxBrokerAdapterConfig extends LiveBrokerAdapterConfig {
  client: UpstoxApiClient;
  instrumentResolver: UpstoxInstrumentResolver;
  brokerConfig?: UpstoxBrokerConfig;
}

export class UpstoxBroker extends LiveBrokerAdapter {
  private readonly orders = new Map<string, BrokerOrder>();
  private readonly fills: BrokerFill[] = [];
  private readonly positionMeta = new Map<string, TrackedPositionMeta>();
  private readonly defaultProduct: 'D' | 'I';
  private readonly tagPrefix?: string;

  constructor(private readonly deps: UpstoxBrokerAdapterConfig) {
    super({ ...deps, provider: 'upstox' });
    this.defaultProduct = deps.brokerConfig?.defaultProduct ?? 'I';
    this.tagPrefix = deps.brokerConfig?.tagPrefix;
  }

  protected async placeOrderInternal(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    this.validatePlaceOrderRequest(request);

    const instrument = this.deps.instrumentResolver.resolve(request.instrumentId);
    const orderType = request.orderType ?? OrderType.MARKET;
    const upstoxRequest = buildUpstoxPlaceOrderRequest({
      request,
      instrument,
      defaultProduct: this.defaultProduct,
      tagPrefix: this.tagPrefix,
    });

    const response = await this.deps.client.placeOrder(upstoxRequest);
    const order = toBrokerOrder({
      upstoxOrderId: response.orderId,
      request,
      orderType,
    });

    this.orders.set(order.id, order);
    this.trackPositionMeta(instrument, request);

    return { order, fill: createPendingFill(order) };
  }

  protected async cancelOrderInternal(orderId: string): Promise<CancelOrderResult> {
    const order = this.orders.get(orderId);

    if (!order) {
      throw new OrderNotFoundError(`Order not found: ${orderId}`);
    }

    await this.deps.client.cancelOrder({ orderId });

    order.status = OrderStatus.CANCELLED;

    return { cancelled: true, order };
  }

  protected async getPositionsInternal(): Promise<BrokerPositionView[]> {
    const response = await this.deps.client.getPositions();

    return response.data
      .filter((position) => position.quantity !== 0)
      .map((position) => {
        const key = positionKey(position.instrument_token, position.product);
        const meta = this.positionMeta.get(key);

        return toBrokerPositionView({
          position,
          instrumentId: meta?.instrumentId ?? position.instrument_token,
          strategyName: meta?.strategyName ?? 'untracked',
        });
      });
  }

  getPnlSummary(): BrokerPnlSummary {
    let realizedPnl = 0;
    const unrealizedPnl = 0;

    for (const fill of this.fills) {
      realizedPnl += fill.realizedPnl;
    }

    return {
      realizedPnl,
      unrealizedPnl,
      totalPnl: realizedPnl + unrealizedPnl,
      equity: 0,
      cash: 0,
    };
  }

  getFills(): BrokerFill[] {
    return [...this.fills];
  }

  getOrders(): BrokerOrder[] {
    return [...this.orders.values()];
  }

  recordFill(fill: BrokerFill): void {
    this.fills.push(fill);

    const order = this.orders.get(fill.orderId);
    if (order) {
      order.status = OrderStatus.FILLED;
      order.filledAt = fill.timestamp;
    }
  }

  private validatePlaceOrderRequest(request: PlaceOrderRequest): void {
    if (request.quantity <= 0) {
      throw new InvalidOrderRequestError('quantity must be greater than zero');
    }

    if (request.definedRisk) {
      throw new InvalidOrderRequestError(
        'Defined-risk spread orders must be routed through execution orchestration, not directly to Upstox',
      );
    }

    const orderType = request.orderType ?? OrderType.MARKET;

    if (orderType === OrderType.LIMIT && request.price <= 0) {
      throw new InvalidOrderRequestError('limit orders require a positive price');
    }
  }

  private trackPositionMeta(
    instrument: { instrumentToken: string; product?: string },
    request: PlaceOrderRequest,
  ): void {
    const product = instrument.product ?? this.defaultProduct;
    const key = positionKey(instrument.instrumentToken, product);

    this.positionMeta.set(key, {
      instrumentId: request.instrumentId,
      strategyName: request.strategyName,
    });
  }
}

export function createUpstoxBroker(deps: UpstoxBrokerAdapterConfig): UpstoxBroker {
  return new UpstoxBroker(deps);
}
