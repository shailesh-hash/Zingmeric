import type { MarketPriceProvider } from '../types/market-price-provider.interface.js';
import type { MarketPrice } from '../types/valuation.types.js';

export class InMemoryMarketPriceProvider implements MarketPriceProvider {
  private readonly byPositionId = new Map<string, number>();
  private readonly byInstrumentId = new Map<string, number>();

  constructor(prices: MarketPrice[] = []) {
    for (const price of prices) {
      this.setPrice(price);
    }
  }

  setPrice(price: MarketPrice): void {
    if (price.positionId) {
      this.byPositionId.set(price.positionId, price.price);
    }

    this.byInstrumentId.set(price.instrumentId, price.price);
  }

  getPrice(instrumentId: string, positionId?: string): number | undefined {
    if (positionId) {
      const positionPrice = this.byPositionId.get(positionId);
      if (positionPrice !== undefined) {
        return positionPrice;
      }
    }

    return this.byInstrumentId.get(instrumentId);
  }
}

export function createInMemoryMarketPriceProvider(
  prices: MarketPrice[] = [],
): InMemoryMarketPriceProvider {
  return new InMemoryMarketPriceProvider(prices);
}
