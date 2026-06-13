export interface IronCondorSpreadLeg {
  shortStrike: number;
  longStrike: number;
  shortEntryPremium: number;
  longEntryPremium: number;
}

export interface IronCondorConfig {
  shortPutDelta: number;
  longPutDelta: number;
  shortCallDelta: number;
  longCallDelta: number;
  profitTargetPct: number;
  stopLossMultiple: number;
}

export const DEFAULT_IRON_CONDOR_CONFIG: IronCondorConfig = {
  shortPutDelta: 0.15,
  longPutDelta: 0.05,
  shortCallDelta: 0.15,
  longCallDelta: 0.05,
  profitTargetPct: 0.5,
  stopLossMultiple: 2.0,
};

export interface IronCondorPosition {
  entryTimestamp: Date;
  entryCredit: number;
  maxLoss: number;
  expiryDate: Date;
  putSpread: IronCondorSpreadLeg;
  callSpread: IronCondorSpreadLeg;
}
