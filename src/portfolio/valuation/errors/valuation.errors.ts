export class InvalidValuationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidValuationInputError';
  }
}

export class MissingMarketPriceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingMarketPriceError';
  }
}
