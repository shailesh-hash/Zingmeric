export class InstrumentNotFoundError extends Error {
  constructor(instrumentId: string) {
    super(`Instrument not found: ${instrumentId}`);
    this.name = 'InstrumentNotFoundError';
  }
}

export class InvalidImportRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImportRequestError';
  }
}

export class UnsupportedUnderlyingError extends Error {
  constructor(symbol: string) {
    super(`Unsupported option underlying: ${symbol}. Supported: NIFTY, BANKNIFTY, FINNIFTY`);
    this.name = 'UnsupportedUnderlyingError';
  }
}

export class OptionChainNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OptionChainNotFoundError';
  }
}
