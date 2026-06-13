export class InsufficientCashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientCashError';
  }
}

export class InsufficientMarginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientMarginError';
  }
}

export class PositionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PositionNotFoundError';
  }
}

export class InvalidPortfolioOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPortfolioOperationError';
  }
}
