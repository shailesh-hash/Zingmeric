import {
  DEFAULT_TRADING_COSTS,
  type TradingCostConfig,
} from '../../backtest/types/backtest-config.type.js';
import { calculateOrderCosts } from '../../backtest/simulation/trading-costs.js';
import {
  calculatePositionUnrealizedPnl,
  createPortfolioEngine,
  createPortfolioEngineConfig,
  createPositionId,
  PortfolioEngine,
  PositionKind,
  type MarkToMarketQuote,
  type PortfolioPosition,
} from '../../portfolio/index.js';
import type { Broker } from '../broker.interface.js';
import { InvalidOrderRequestError, OrderNotFoundError } from '../errors/broker.errors.js';
import {
  OrderSide,
  OrderStatus,
  OrderType,
  type BrokerFill,
  type BrokerOrder,
  type BrokerPnlSummary,
  type BrokerPositionView,
  type CancelOrderResult,
  type PaperBrokerConfig,
  type PaperMarketQuote,
  type PlaceOrderRequest,
  type PlaceOrderResult,
} from '../types/broker.types.js';
import { findFillableLimitOrders } from './limit-order.matcher.js';

export class PaperBroker implements Broker {
  private readonly portfolio: PortfolioEngine;
  private readonly orders = new Map<string, BrokerOrder>();
  private readonly pendingRequests = new Map<string, PlaceOrderRequest>();
  private readonly fills: BrokerFill[] = [];
  private readonly tradingCosts: TradingCostConfig;
  private readonly includeCosts: boolean;
  private orderCounter = 0;
  private realizedPnlTotal = 0;

  constructor(config: PaperBrokerConfig) {
    this.portfolio =
      config.portfolioEngine ??
      createPortfolioEngine(createPortfolioEngineConfig({ initialCapital: config.initialCapital }));
    this.tradingCosts = config.costs ?? DEFAULT_TRADING_COSTS;
    this.includeCosts = config.includeCosts ?? true;
  }

  placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    try {
      this.validateOrderRequest(request);

      const orderType = request.orderType ?? OrderType.MARKET;
      const order = this.createOrder(request, orderType);

      if (orderType === OrderType.LIMIT) {
        this.orders.set(order.id, order);
        this.pendingRequests.set(order.id, request);
        return Promise.resolve({ order, fill: null });
      }

      const fill = this.executeFill(order, request);
      order.status = OrderStatus.FILLED;
      order.filledAt = fill.timestamp;
      this.orders.set(order.id, order);
      this.fills.push(fill);
      this.realizedPnlTotal += fill.realizedPnl;

      return Promise.resolve({ order, fill });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  cancelOrder(orderId: string): Promise<CancelOrderResult> {
    try {
      const order = this.orders.get(orderId);

      if (!order) {
        throw new OrderNotFoundError(`Order not found: ${orderId}`);
      }

      if (order.status !== OrderStatus.PENDING) {
        return Promise.resolve({ cancelled: false, order });
      }

      order.status = OrderStatus.CANCELLED;
      this.pendingRequests.delete(orderId);
      return Promise.resolve({ cancelled: true, order });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  getPositions(): Promise<BrokerPositionView[]> {
    return Promise.resolve(
      this.portfolio.getOpenPositions().map((position) => this.toPositionView(position)),
    );
  }

  getPnlSummary(): BrokerPnlSummary {
    const snapshot = this.portfolio.snapshot;

    return {
      realizedPnl: this.realizedPnlTotal,
      unrealizedPnl: snapshot.unrealizedPnl,
      totalPnl: this.realizedPnlTotal + snapshot.unrealizedPnl,
      equity: snapshot.equity,
      cash: snapshot.cash,
    };
  }

  getFills(): BrokerFill[] {
    return [...this.fills];
  }

  getOrders(): BrokerOrder[] {
    return [...this.orders.values()];
  }

  markToMarket(quotes: MarkToMarketQuote[]): void {
    this.portfolio.markToMarket(quotes);
  }

  processMarketQuotes(quotes: PaperMarketQuote[]): BrokerFill[] {
    const newFills: BrokerFill[] = [];

    for (const quote of quotes) {
      const pending = [...this.pendingRequests.entries()]
        .filter(([, request]) => request.instrumentId === quote.instrumentId)
        .map(([orderId, request]) => ({ orderId, request }));

      const fillable = findFillableLimitOrders(
        pending.map((entry) => entry.request),
        quote,
      );

      for (const request of fillable) {
        const orderId = pending.find((entry) => entry.request === request)?.orderId;
        if (!orderId) {
          continue;
        }

        const fill = this.fillPendingLimitOrder(orderId, quote.timestamp);
        if (fill) {
          newFills.push(fill);
        }
      }
    }

    return newFills;
  }

  getPendingOrders(): BrokerOrder[] {
    return [...this.orders.values()].filter((order) => order.status === OrderStatus.PENDING);
  }

  getPortfolioEngine(): PortfolioEngine {
    return this.portfolio;
  }

  private fillPendingLimitOrder(orderId: string, timestamp?: Date): BrokerFill | null {
    const order = this.orders.get(orderId);
    const request = this.pendingRequests.get(orderId);

    if (!order || !request || order.status !== OrderStatus.PENDING) {
      return null;
    }

    const fill = this.executeFill(order, {
      ...request,
      timestamp: timestamp ?? request.timestamp ?? new Date(),
    });

    order.status = OrderStatus.FILLED;
    order.filledAt = fill.timestamp;
    this.pendingRequests.delete(orderId);
    this.fills.push(fill);
    this.realizedPnlTotal += fill.realizedPnl;

    return fill;
  }

  private executeFill(order: BrokerOrder, request: PlaceOrderRequest): BrokerFill {
    const timestamp = request.timestamp ?? new Date();

    if (request.definedRisk) {
      return this.executeDefinedRiskFill(order, request, timestamp);
    }

    return this.executeEquityFill(order, request, timestamp);
  }

  private executeEquityFill(
    order: BrokerOrder,
    request: PlaceOrderRequest,
    timestamp: Date,
  ): BrokerFill {
    const costs = this.resolveCosts(request.side, request.price, request.quantity);

    if (request.side === OrderSide.BUY) {
      this.portfolio.openEquityPosition({
        strategyName: request.strategyName,
        instrumentId: request.instrumentId,
        timestamp,
        quantity: request.quantity,
        price: costs.executionPrice,
        fees: costs.totalFees,
      });

      return this.createFill(order, request, timestamp, costs, 0);
    }

    const positionId = createPositionId(request.strategyName, request.instrumentId);
    const { realizedPnl } = this.portfolio.closeEquityPosition({
      positionId,
      timestamp,
      quantity: request.quantity,
      price: costs.executionPrice,
      fees: costs.totalFees,
    });

    return this.createFill(order, request, timestamp, costs, realizedPnl);
  }

  private executeDefinedRiskFill(
    order: BrokerOrder,
    request: PlaceOrderRequest,
    timestamp: Date,
  ): BrokerFill {
    const definedRisk = request.definedRisk;

    if (!definedRisk) {
      throw new InvalidOrderRequestError('Defined risk details are required');
    }

    if (request.side === OrderSide.BUY) {
      if (definedRisk.entryCredit === undefined) {
        throw new InvalidOrderRequestError(
          'entryCredit is required to open defined-risk positions',
        );
      }

      this.portfolio.openDefinedRiskPosition({
        strategyName: request.strategyName,
        instrumentId: request.instrumentId,
        timestamp,
        quantity: request.quantity,
        entryCredit: definedRisk.entryCredit,
        maxLoss: definedRisk.maxLoss,
        legGroupId: request.legGroupId,
      });

      return this.createFill(order, request, timestamp, this.zeroCosts(request.price), 0);
    }

    const closeCost = definedRisk.closeCost ?? request.price;
    const positionId = createPositionId(
      request.strategyName,
      request.instrumentId,
      request.legGroupId,
    );
    const { realizedPnl } = this.portfolio.closeDefinedRiskPosition({
      positionId,
      timestamp,
      closeCost,
    });

    return this.createFill(order, request, timestamp, this.zeroCosts(closeCost), realizedPnl);
  }

  private createFill(
    order: BrokerOrder,
    request: PlaceOrderRequest,
    timestamp: Date,
    costs: {
      executionPrice: number;
      brokerage: number;
      stt: number;
      exchangeCharges: number;
      slippage: number;
      totalFees: number;
    },
    realizedPnl: number,
  ): BrokerFill {
    return {
      orderId: order.id,
      timestamp,
      instrumentId: request.instrumentId,
      strategyName: request.strategyName,
      side: request.side,
      quantity: request.quantity,
      price: costs.executionPrice,
      brokerage: costs.brokerage,
      stt: costs.stt,
      exchangeCharges: costs.exchangeCharges,
      slippage: costs.slippage,
      totalFees: costs.totalFees,
      realizedPnl,
    };
  }

  private resolveCosts(side: OrderSide, price: number, quantity: number) {
    if (!this.includeCosts) {
      return this.zeroCosts(price);
    }

    const breakdown = calculateOrderCosts(side, price, quantity, this.tradingCosts);

    return breakdown;
  }

  private zeroCosts(price: number) {
    return {
      executionPrice: price,
      brokerage: 0,
      stt: 0,
      exchangeCharges: 0,
      slippage: 0,
      totalFees: 0,
    };
  }

  private createOrder(request: PlaceOrderRequest, orderType: OrderType): BrokerOrder {
    this.orderCounter += 1;

    return {
      id: `paper-${String(this.orderCounter)}`,
      instrumentId: request.instrumentId,
      strategyName: request.strategyName,
      side: request.side,
      orderType,
      quantity: request.quantity,
      price: request.price,
      status: OrderStatus.PENDING,
      createdAt: request.timestamp ?? new Date(),
      legGroupId: request.legGroupId,
    };
  }

  private toPositionView(position: PortfolioPosition): BrokerPositionView {
    const unrealizedPnl = calculatePositionUnrealizedPnl(position);

    if (position.kind === PositionKind.EQUITY) {
      return {
        id: position.id,
        strategyName: position.strategyName,
        instrumentId: position.instrumentId,
        kind: position.kind,
        quantity: position.quantity,
        averagePrice: position.averagePrice,
        markPrice: position.markPrice,
        unrealizedPnl,
        openedAt: position.openedAt,
      };
    }

    return {
      id: position.id,
      strategyName: position.strategyName,
      instrumentId: position.instrumentId,
      kind: position.kind,
      quantity: position.quantity,
      entryCredit: position.entryCredit,
      maxLoss: position.maxLoss,
      markPrice: position.markPrice,
      unrealizedPnl,
      openedAt: position.openedAt,
    };
  }

  private validateOrderRequest(request: PlaceOrderRequest): void {
    if (request.quantity <= 0) {
      throw new InvalidOrderRequestError('quantity must be greater than zero');
    }

    if (request.price <= 0 && !request.definedRisk) {
      throw new InvalidOrderRequestError('price must be greater than zero');
    }

    if (request.definedRisk && request.definedRisk.maxLoss <= 0) {
      throw new InvalidOrderRequestError('maxLoss must be greater than zero');
    }
  }
}

export function createPaperBroker(config: PaperBrokerConfig): PaperBroker {
  return new PaperBroker(config);
}
