export interface BullPutSpreadV1Config {
  shortPutDeltaMin: number;
  shortPutDeltaMax: number;
  longPutDeltaMin: number;
  longPutDeltaMax: number;
  profitTargetPct: number;
  stopLossMultiple: number;
  maxRiskPct: number;
  lotSize: number;
}

export const DEFAULT_BULL_PUT_SPREAD_V1_CONFIG: BullPutSpreadV1Config = {
  shortPutDeltaMin: 0.15,
  shortPutDeltaMax: 0.2,
  longPutDeltaMin: 0.05,
  longPutDeltaMax: 0.1,
  profitTargetPct: 0.5,
  stopLossMultiple: 2.0,
  maxRiskPct: 0.01,
  lotSize: 50,
};

export interface BullPutSpreadV1Position {
  entryTimestamp: Date;
  entryCredit: number;
  shortStrike: number;
  longStrike: number;
  shortEntryPremium: number;
  longEntryPremium: number;
  expiryDate: Date;
  quantity: number;
}
