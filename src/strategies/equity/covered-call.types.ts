export interface CoveredCallConfig {
  callDelta: number;
  profitTargetPct: number;
  stopLossMultiple: number;
}

export const DEFAULT_COVERED_CALL_CONFIG: CoveredCallConfig = {
  callDelta: 0.3,
  profitTargetPct: 0.5,
  stopLossMultiple: 2.0,
};

export interface CoveredCallPosition {
  entryTimestamp: Date;
  stockEntryPrice: number;
  callStrike: number;
  callEntryPremium: number;
  entryCredit: number;
  maxLoss: number;
  expiryDate: Date;
}
