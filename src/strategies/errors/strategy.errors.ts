export class StrategyNotFoundError extends Error {
  constructor(strategyName: string) {
    super(`Strategy not found: ${strategyName}`);
    this.name = 'StrategyNotFoundError';
  }
}

export class InvalidStrategyEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStrategyEngineError';
  }
}

export class InvalidSignalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSignalError';
  }
}
