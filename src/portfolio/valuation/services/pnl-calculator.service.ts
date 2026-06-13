import {
  calculateDefinedRiskUnrealizedPnl,
  calculateEquityUnrealizedPnl,
} from '../../margin/margin-calculator.js';
import { MissingMarketPriceError } from '../errors/valuation.errors.js';
import type { MarketPriceProvider } from '../types/market-price-provider.interface.js';
import {
  ValuationInstrumentType,
  type PositionValueBreakdown,
  type ValuationPosition,
  type ValuationTrade,
} from '../types/valuation.types.js';

export class PnlCalculatorService {
  constructor(private readonly priceProvider: MarketPriceProvider) {}

  calculateRealizedPnl(trades: ValuationTrade[]): number {
    return trades.reduce((total, trade) => total + (trade.realizedPnl ?? 0), 0);
  }

  calculateUnrealizedPnl(positions: ValuationPosition[]): number {
    return this.calculatePositionBreakdowns(positions).reduce(
      (total, breakdown) => total + breakdown.unrealizedPnl,
      0,
    );
  }

  calculatePositionBreakdowns(positions: ValuationPosition[]): PositionValueBreakdown[] {
    return positions.map((position) => this.valuePosition(position));
  }

  private valuePosition(position: ValuationPosition): PositionValueBreakdown {
    const markPrice = this.requireMarkPrice(position);
    const multiplier = position.contractMultiplier ?? 1;

    switch (position.instrumentType) {
      case ValuationInstrumentType.EQUITY:
      case ValuationInstrumentType.OPTION:
        return this.valueEquityLikePosition(position, markPrice, multiplier);

      case ValuationInstrumentType.DEFINED_RISK:
        return this.valueDefinedRiskPosition(position, markPrice);

      case ValuationInstrumentType.FUTURE:
        return this.valueFuturePosition(position, markPrice, multiplier);

      default:
        return {
          positionId: position.id,
          instrumentId: position.instrumentId,
          instrumentType: position.instrumentType,
          markPrice,
          marketValue: markPrice * position.quantity * multiplier,
          unrealizedPnl: 0,
        };
    }
  }

  private valueEquityLikePosition(
    position: ValuationPosition,
    markPrice: number,
    multiplier: number,
  ): PositionValueBreakdown {
    const averagePrice = position.averagePrice ?? 0;
    const unrealizedPnl = calculateEquityUnrealizedPnl(averagePrice, markPrice, position.quantity);

    return {
      positionId: position.id,
      instrumentId: position.instrumentId,
      instrumentType: position.instrumentType,
      markPrice,
      marketValue: markPrice * position.quantity * multiplier,
      unrealizedPnl: unrealizedPnl * multiplier,
    };
  }

  private valueDefinedRiskPosition(
    position: ValuationPosition,
    markPrice: number,
  ): PositionValueBreakdown {
    const entryCredit = position.entryCredit ?? 0;
    const unrealizedPnl = calculateDefinedRiskUnrealizedPnl(
      entryCredit,
      markPrice,
      position.quantity,
    );

    return {
      positionId: position.id,
      instrumentId: position.instrumentId,
      instrumentType: position.instrumentType,
      markPrice,
      marketValue: markPrice * position.quantity,
      unrealizedPnl,
    };
  }

  private valueFuturePosition(
    position: ValuationPosition,
    markPrice: number,
    multiplier: number,
  ): PositionValueBreakdown {
    const entryPrice = position.entryPrice ?? position.averagePrice ?? 0;
    const unrealizedPnl =
      calculateEquityUnrealizedPnl(entryPrice, markPrice, position.quantity) * multiplier;

    return {
      positionId: position.id,
      instrumentId: position.instrumentId,
      instrumentType: position.instrumentType,
      markPrice,
      marketValue: markPrice * position.quantity * multiplier,
      unrealizedPnl,
    };
  }

  private requireMarkPrice(position: ValuationPosition): number {
    const markPrice = this.priceProvider.getPrice(position.instrumentId, position.id);

    if (markPrice === undefined) {
      throw new MissingMarketPriceError(
        `Missing market price for position ${position.id} (${position.instrumentId})`,
      );
    }

    return markPrice;
  }
}

export function createPnlCalculatorService(
  priceProvider: MarketPriceProvider,
): PnlCalculatorService {
  return new PnlCalculatorService(priceProvider);
}
