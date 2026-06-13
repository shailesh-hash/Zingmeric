export interface BullPutSpreadConfig {
  shortPutDelta: number;
  longPutDelta: number;
  profitTargetPct: number;
  stopLossMultiple: number;
}

export const DEFAULT_BULL_PUT_SPREAD_CONFIG: BullPutSpreadConfig = {
  shortPutDelta: 0.15,
  longPutDelta: 0.05,
  profitTargetPct: 0.5,
  stopLossMultiple: 2.0,
};

export interface BullPutSpreadPosition {
  entryTimestamp: Date;
  entryCredit: number;
  shortStrike: number;
  longStrike: number;
  shortEntryPremium: number;
  longEntryPremium: number;
  expiryDate: Date;
}

export interface BullPutSpreadSnapshot {
  timestamp: Date;
  instrumentId: string;
  symbol: string;
  price: number;
  optionChain: import('../types/market-snapshot.type.js').OptionChainSnapshot;
}
