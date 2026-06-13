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
