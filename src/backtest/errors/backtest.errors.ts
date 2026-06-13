export class InvalidBacktestRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBacktestRequestError';
  }
}

export class InsufficientCapitalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientCapitalError';
  }
}
