export class ForwardTestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForwardTestError';
  }
}

export class MarketFeedUnavailableError extends ForwardTestError {
  constructor(instrumentId: string) {
    super(`Market feed unavailable for instrument: ${instrumentId}`);
    this.name = 'MarketFeedUnavailableError';
  }
}
