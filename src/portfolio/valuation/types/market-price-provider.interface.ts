export interface MarketPriceProvider {
  getPrice(instrumentId: string, positionId?: string): number | undefined;
}
