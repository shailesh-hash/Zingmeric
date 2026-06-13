export enum RiskViolationCode {
  MAX_RISK_PER_TRADE = 'MAX_RISK_PER_TRADE',
  HARD_STOP_RISK = 'HARD_STOP_RISK',
  PORTFOLIO_DRAWDOWN = 'PORTFOLIO_DRAWDOWN',
}

export interface RiskEngineConfig {
  maxRiskPerTradePct: number;
  hardStopRiskPerTradePct: number;
  maxPortfolioDrawdownPct: number;
}

export const DEFAULT_RISK_CONFIG: RiskEngineConfig = {
  maxRiskPerTradePct: 0.01,
  hardStopRiskPerTradePct: 0.02,
  maxPortfolioDrawdownPct: 0.15,
};

export interface RiskContext {
  equity: number;
  peakEquity: number;
}

export interface NewTradeRiskRequest {
  tradeRiskAmount: number;
}

export interface RiskViolation {
  code: RiskViolationCode;
  message: string;
  limit: number;
  actual: number;
}

export interface RiskValidationResult {
  allowed: boolean;
  violations: RiskViolation[];
  tradeRiskPct: number;
  drawdownPct: number;
}

export function createRiskEngineConfig(
  overrides: Partial<RiskEngineConfig> = {},
): RiskEngineConfig {
  return {
    maxRiskPerTradePct: overrides.maxRiskPerTradePct ?? DEFAULT_RISK_CONFIG.maxRiskPerTradePct,
    hardStopRiskPerTradePct:
      overrides.hardStopRiskPerTradePct ?? DEFAULT_RISK_CONFIG.hardStopRiskPerTradePct,
    maxPortfolioDrawdownPct:
      overrides.maxPortfolioDrawdownPct ?? DEFAULT_RISK_CONFIG.maxPortfolioDrawdownPct,
  };
}

export function createRiskContext(params: { equity: number; peakEquity?: number }): RiskContext {
  return {
    equity: params.equity,
    peakEquity: params.peakEquity ?? params.equity,
  };
}

export function createRiskContextFromPortfolio(params: {
  equity: number;
  peakEquity: number;
}): RiskContext {
  return createRiskContext(params);
}
