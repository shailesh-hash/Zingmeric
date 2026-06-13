import type { OptionCallQuote, OptionPutQuote } from '../types/market-snapshot.type.js';

export function findPutByTargetDelta(
  puts: OptionPutQuote[],
  targetDelta: number,
): OptionPutQuote | null {
  if (puts.length === 0) {
    return null;
  }

  return puts.reduce<OptionPutQuote | null>((closest, put) => {
    if (!closest) {
      return put;
    }

    const currentDistance = Math.abs(Math.abs(put.delta) - targetDelta);
    const closestDistance = Math.abs(Math.abs(closest.delta) - targetDelta);

    return currentDistance < closestDistance ? put : closest;
  }, null);
}

export function findPutInDeltaRange(
  puts: OptionPutQuote[],
  minDelta: number,
  maxDelta: number,
): OptionPutQuote | null {
  const inRange = puts.filter((put) => {
    const delta = Math.abs(put.delta);
    return delta >= minDelta && delta <= maxDelta;
  });

  if (inRange.length === 0) {
    return null;
  }

  const targetDelta = (minDelta + maxDelta) / 2;

  return inRange.reduce<OptionPutQuote | null>((closest, put) => {
    if (!closest) {
      return put;
    }

    const currentDistance = Math.abs(Math.abs(put.delta) - targetDelta);
    const closestDistance = Math.abs(Math.abs(closest.delta) - targetDelta);

    return currentDistance < closestDistance ? put : closest;
  }, null);
}

export function calculateDefinedRiskQuantity(
  accountEquity: number,
  maxLossPerUnit: number,
  lotSize: number,
  maxRiskPct: number,
): number {
  if (accountEquity <= 0 || maxLossPerUnit <= 0 || lotSize <= 0 || maxRiskPct <= 0) {
    return 0;
  }

  const maxRiskAmount = accountEquity * maxRiskPct;
  const riskPerLot = maxLossPerUnit * lotSize;
  const lots = Math.floor(maxRiskAmount / riskPerLot);

  if (lots < 1) {
    return 0;
  }

  return lots * lotSize;
}

export function findCallByTargetDelta(
  calls: OptionCallQuote[],
  targetDelta: number,
): OptionCallQuote | null {
  if (calls.length === 0) {
    return null;
  }

  return calls.reduce<OptionCallQuote | null>((closest, call) => {
    if (!closest) {
      return call;
    }

    const currentDistance = Math.abs(Math.abs(call.delta) - targetDelta);
    const closestDistance = Math.abs(Math.abs(closest.delta) - targetDelta);

    return currentDistance < closestDistance ? call : closest;
  }, null);
}

export function calculatePutSpreadCredit(
  shortPut: OptionPutQuote,
  longPut: OptionPutQuote,
): number {
  return shortPut.premium - longPut.premium;
}

export function calculateCallSpreadCredit(
  shortCall: OptionCallQuote,
  longCall: OptionCallQuote,
): number {
  return shortCall.premium - longCall.premium;
}

export function calculateSpreadCredit(shortPut: OptionPutQuote, longPut: OptionPutQuote): number {
  return calculatePutSpreadCredit(shortPut, longPut);
}

export function calculatePutSpreadCloseCost(
  shortStrike: number,
  longStrike: number,
  puts: OptionPutQuote[],
): number | null {
  const shortPut = puts.find((put) => put.strike === shortStrike);
  const longPut = puts.find((put) => put.strike === longStrike);

  if (!shortPut || !longPut) {
    return null;
  }

  return shortPut.premium - longPut.premium;
}

export function calculateCallSpreadCloseCost(
  shortStrike: number,
  longStrike: number,
  calls: OptionCallQuote[],
): number | null {
  const shortCall = calls.find((call) => call.strike === shortStrike);
  const longCall = calls.find((call) => call.strike === longStrike);

  if (!shortCall || !longCall) {
    return null;
  }

  return shortCall.premium - longCall.premium;
}

export function calculateSpreadCloseCost(
  shortStrike: number,
  longStrike: number,
  puts: OptionPutQuote[],
): number | null {
  return calculatePutSpreadCloseCost(shortStrike, longStrike, puts);
}

export function calculateIronCondorCredit(
  shortPut: OptionPutQuote,
  longPut: OptionPutQuote,
  shortCall: OptionCallQuote,
  longCall: OptionCallQuote,
): number {
  return (
    calculatePutSpreadCredit(shortPut, longPut) + calculateCallSpreadCredit(shortCall, longCall)
  );
}

export function calculateIronCondorCloseCost(
  putSpread: { shortStrike: number; longStrike: number },
  callSpread: { shortStrike: number; longStrike: number },
  puts: OptionPutQuote[],
  calls: OptionCallQuote[],
): number | null {
  const putCloseCost = calculatePutSpreadCloseCost(
    putSpread.shortStrike,
    putSpread.longStrike,
    puts,
  );
  const callCloseCost = calculateCallSpreadCloseCost(
    callSpread.shortStrike,
    callSpread.longStrike,
    calls,
  );

  if (putCloseCost === null || callCloseCost === null) {
    return null;
  }

  return putCloseCost + callCloseCost;
}

export function calculateIronCondorMaxLoss(
  shortPutStrike: number,
  longPutStrike: number,
  shortCallStrike: number,
  longCallStrike: number,
  totalCredit: number,
): number {
  const putWidth = shortPutStrike - longPutStrike;
  const callWidth = longCallStrike - shortCallStrike;
  const widestWing = Math.max(putWidth, callWidth);

  return widestWing - totalCredit;
}
