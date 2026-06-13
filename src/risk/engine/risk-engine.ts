import { InvalidRiskRequestError, RiskViolationError } from '../errors/risk.errors.js';
import {
  RiskViolationCode,
  type NewTradeRiskRequest,
  type RiskContext,
  type RiskEngineConfig,
  type RiskValidationResult,
  type RiskViolation,
} from '../types/risk.types.js';

export function calculateTradeRiskPct(tradeRiskAmount: number, equity: number): number {
  if (tradeRiskAmount < 0) {
    throw new InvalidRiskRequestError('tradeRiskAmount cannot be negative');
  }

  if (equity <= 0) {
    throw new InvalidRiskRequestError('equity must be greater than zero');
  }

  return tradeRiskAmount / equity;
}

export function calculateDrawdownPct(peakEquity: number, currentEquity: number): number {
  if (peakEquity <= 0) {
    throw new InvalidRiskRequestError('peakEquity must be greater than zero');
  }

  if (currentEquity > peakEquity) {
    return 0;
  }

  return (peakEquity - currentEquity) / peakEquity;
}

export function updatePeakEquity(currentPeak: number, currentEquity: number): number {
  return Math.max(currentPeak, currentEquity);
}

export class RiskEngine {
  constructor(private readonly config: RiskEngineConfig) {
    if (config.maxRiskPerTradePct <= 0 || config.maxRiskPerTradePct > 1) {
      throw new InvalidRiskRequestError('maxRiskPerTradePct must be between 0 and 1');
    }

    if (config.hardStopRiskPerTradePct <= config.maxRiskPerTradePct) {
      throw new InvalidRiskRequestError(
        'hardStopRiskPerTradePct must be greater than maxRiskPerTradePct',
      );
    }

    if (config.maxPortfolioDrawdownPct <= 0 || config.maxPortfolioDrawdownPct > 1) {
      throw new InvalidRiskRequestError('maxPortfolioDrawdownPct must be between 0 and 1');
    }
  }

  validateNewTrade(context: RiskContext, request: NewTradeRiskRequest): RiskValidationResult {
    const tradeRiskPct = calculateTradeRiskPct(request.tradeRiskAmount, context.equity);
    const drawdownPct = calculateDrawdownPct(context.peakEquity, context.equity);
    const violations: RiskViolation[] = [];

    if (tradeRiskPct > this.config.hardStopRiskPerTradePct) {
      violations.push(
        this.createViolation({
          code: RiskViolationCode.HARD_STOP_RISK,
          message: 'Trade risk exceeds hard stop limit',
          limit: this.config.hardStopRiskPerTradePct,
          actual: tradeRiskPct,
        }),
      );
    } else if (tradeRiskPct > this.config.maxRiskPerTradePct) {
      violations.push(
        this.createViolation({
          code: RiskViolationCode.MAX_RISK_PER_TRADE,
          message: 'Trade risk exceeds maximum per-trade limit',
          limit: this.config.maxRiskPerTradePct,
          actual: tradeRiskPct,
        }),
      );
    }

    if (drawdownPct >= this.config.maxPortfolioDrawdownPct) {
      violations.push(
        this.createViolation({
          code: RiskViolationCode.PORTFOLIO_DRAWDOWN,
          message: 'Portfolio drawdown limit reached; new trades blocked',
          limit: this.config.maxPortfolioDrawdownPct,
          actual: drawdownPct,
        }),
      );
    }

    return {
      allowed: violations.length === 0,
      violations,
      tradeRiskPct,
      drawdownPct,
    };
  }

  assertNewTradeAllowed(context: RiskContext, request: NewTradeRiskRequest): RiskValidationResult {
    const result = this.validateNewTrade(context, request);

    if (!result.allowed) {
      throw new RiskViolationError('Trade blocked by risk engine', result.violations);
    }

    return result;
  }

  private createViolation(params: {
    code: RiskViolationCode;
    message: string;
    limit: number;
    actual: number;
  }): RiskViolation {
    return {
      code: params.code,
      message: params.message,
      limit: params.limit,
      actual: params.actual,
    };
  }
}

export function createRiskEngine(config: RiskEngineConfig): RiskEngine {
  return new RiskEngine(config);
}
