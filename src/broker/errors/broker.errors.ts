export class OrderNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderNotFoundError';
  }
}

export class OrderRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderRejectedError';
  }
}

export class InvalidOrderRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderRequestError';
  }
}
