import {
  OrderSide,
  OrderType,
  type PaperMarketQuote,
  type PlaceOrderRequest,
} from '../types/broker.types.js';

export function shouldFillLimitOrder(
  side: OrderSide,
  limitPrice: number,
  marketPrice: number,
): boolean {
  if (side === OrderSide.BUY) {
    return marketPrice <= limitPrice;
  }

  return marketPrice >= limitPrice;
}

export function resolveLimitFillPrice(limitPrice: number): number {
  return limitPrice;
}

export function findFillableLimitOrders(
  pendingOrders: PlaceOrderRequest[],
  quote: PaperMarketQuote,
): PlaceOrderRequest[] {
  return pendingOrders.filter(
    (request) =>
      request.instrumentId === quote.instrumentId &&
      (request.orderType ?? OrderType.LIMIT) === OrderType.LIMIT &&
      shouldFillLimitOrder(request.side, request.price, quote.price),
  );
}
