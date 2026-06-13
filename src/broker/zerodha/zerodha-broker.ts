import { InvalidOrderRequestError, OrderNotFoundError } from '../errors/broker.errors.js';
import { LiveBrokerAdapter } from '../live/live-broker.adapter.js';
import type { LiveBrokerAdapterConfig } from '../live/live-broker.adapter.js';
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
import type { KiteApiClient } from './kite-api.client.interface.js';
import type { ZerodhaInstrumentResolver } from './instrument-resolver.js';
import {
  buildKitePlaceOrderRequest,
  createPendingFill,
  positionKey,
  toBrokerOrder,
  toBrokerPositionView,
} from './zerodha.mapper.js';
import type { ZerodhaBrokerConfig } from './types/zerodha.types.js';

interface TrackedPositionMeta {
  instrumentId: string;
  strategyName: string;
}

export interface ZerodhaBrokerAdapterConfig extends LiveBrokerAdapterConfig {
  client: KiteApiClient;
  instrumentResolver: ZerodhaInstrumentResolver;
  brokerConfig?: ZerodhaBrokerConfig;
}

export class ZerodhaBroker extends LiveBrokerAdapter {
  private readonly orders = new Map<string, BrokerOrder>();
  private readonly fills: BrokerFill[] = [];
  private readonly positionMeta = new Map<string, TrackedPositionMeta>();
  private readonly defaultProduct: 'CNC' | 'MIS' | 'NRML';
  private readonly orderVariety: string;

  constructor(private readonly deps: ZerodhaBrokerAdapterConfig) {
    super({ ...deps, provider: 'zerodha' });
    this.defaultProduct = deps.brokerConfig?.defaultProduct ?? 'NRML';
    this.orderVariety = deps.brokerConfig?.orderVariety ?? 'regular';
  }

  protected async placeOrderInternal(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    this.validatePlaceOrderRequest(request);

    const instrument = this.deps.instrumentResolver.resolve(request.instrumentId);
    const orderType = request.orderType ?? OrderType.MARKET;
    const kiteRequest = buildKitePlaceOrderRequest({
      request,
      instrument,
      variety: this.orderVariety,
      defaultProduct: this.defaultProduct,
    });

    const response = await this.deps.client.placeOrder(kiteRequest);
    const order = toBrokerOrder({
      kiteOrderId: response.orderId,
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

    await this.deps.client.cancelOrder({
      variety: this.orderVariety,
      orderId,
    });

    order.status = OrderStatus.CANCELLED;

    return { cancelled: true, order };
  }

  protected async getPositionsInternal(): Promise<BrokerPositionView[]> {
    const response = await this.deps.client.getPositions();

    return response.net
      .filter((position) => position.quantity !== 0)
      .map((position) => {
        const key = positionKey(position.exchange, position.tradingsymbol, position.product);
        const meta = this.positionMeta.get(key);

        return toBrokerPositionView({
          position,
          instrumentId: meta?.instrumentId ?? `${position.exchange}:${position.tradingsymbol}`,
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
        'Defined-risk spread orders must be routed through execution orchestration, not directly to Zerodha',
      );
    }

    const orderType = request.orderType ?? OrderType.MARKET;

    if (orderType === OrderType.LIMIT && request.price <= 0) {
      throw new InvalidOrderRequestError('limit orders require a positive price');
    }
  }

  private trackPositionMeta(
    instrument: { exchange: string; tradingsymbol: string; product?: string },
    request: PlaceOrderRequest,
  ): void {
    const product = instrument.product ?? this.defaultProduct;
    const key = positionKey(instrument.exchange, instrument.tradingsymbol, product);

    this.positionMeta.set(key, {
      instrumentId: request.instrumentId,
      strategyName: request.strategyName,
    });
  }
}

export function createZerodhaBroker(deps: ZerodhaBrokerAdapterConfig): ZerodhaBroker {
  return new ZerodhaBroker(deps);
}
