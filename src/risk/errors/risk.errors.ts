import type { RiskViolation } from '../types/risk.types.js';

export class RiskViolationError extends Error {
  constructor(
    message: string,
    readonly violations: RiskViolation[],
  ) {
    super(message);
    this.name = 'RiskViolationError';
  }
}

export class InvalidRiskRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRiskRequestError';
  }
}
