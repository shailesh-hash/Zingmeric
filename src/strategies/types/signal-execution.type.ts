export interface OpenDefinedRiskExecution {
  kind: 'OPEN_DEFINED_RISK';
  entryCredit: number;
  maxLoss: number;
  quantity?: number;
  legGroupId?: string;
  markMetadata?: DefinedRiskMarkMetadata;
}

export interface CloseDefinedRiskExecution {
  kind: 'CLOSE_DEFINED_RISK';
  legGroupId?: string;
  closeCost: number;
}

export interface OpenEquityExecution {
  kind: 'OPEN_EQUITY';
  price: number;
  quantity?: number;
}

export interface CloseEquityExecution {
  kind: 'CLOSE_EQUITY';
  positionId: string;
  price: number;
  quantity?: number;
}

export interface CompositeExecution {
  kind: 'COMPOSITE';
  steps: SignalExecution[];
}

export interface BullPutSpreadMarkMetadata {
  spreadKind: 'BULL_PUT';
  shortStrike: number;
  longStrike: number;
}

export interface IronCondorMarkMetadata {
  spreadKind: 'IRON_CONDOR';
  putSpread: {
    shortStrike: number;
    longStrike: number;
  };
  callSpread: {
    shortStrike: number;
    longStrike: number;
  };
}

export interface CoveredCallMarkMetadata {
  spreadKind: 'COVERED_CALL';
  callStrike: number;
}

export type DefinedRiskMarkMetadata =
  | BullPutSpreadMarkMetadata
  | IronCondorMarkMetadata
  | CoveredCallMarkMetadata;

export type SignalExecution =
  | OpenDefinedRiskExecution
  | CloseDefinedRiskExecution
  | OpenEquityExecution
  | CloseEquityExecution
  | CompositeExecution;

export function isCompositeExecution(execution: SignalExecution): execution is CompositeExecution {
  return execution.kind === 'COMPOSITE';
}
