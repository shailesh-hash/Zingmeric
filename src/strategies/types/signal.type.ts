export enum SignalAction {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
}

export interface Signal {
  action: SignalAction;
  strategyName: string;
  timestamp: Date;
  instrumentId: string;
  reason?: string;
}

const SIGNAL_ACTIONS = new Set<string>([SignalAction.BUY, SignalAction.SELL, SignalAction.HOLD]);

export function isSignalAction(value: string): value is SignalAction {
  return SIGNAL_ACTIONS.has(value);
}

export function createSignal(params: {
  action: SignalAction;
  strategyName: string;
  timestamp: Date;
  instrumentId: string;
  reason?: string;
}): Signal {
  return {
    action: params.action,
    strategyName: params.strategyName,
    timestamp: params.timestamp,
    instrumentId: params.instrumentId,
    reason: params.reason,
  };
}
