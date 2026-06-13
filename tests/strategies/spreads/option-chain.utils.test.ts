import type {
  OptionCallQuote,
  OptionPutQuote,
} from '../../../src/strategies/types/market-snapshot.type.js';
import {
  calculateCallSpreadCloseCost,
  calculateCallSpreadCredit,
  calculateIronCondorCloseCost,
  calculateIronCondorCredit,
  calculateIronCondorMaxLoss,
  calculatePutSpreadCloseCost,
  calculatePutSpreadCredit,
  calculateSpreadCloseCost,
  calculateSpreadCredit,
  findCallByTargetDelta,
  findPutByTargetDelta,
} from '../../../src/strategies/spreads/option-chain.utils.js';

const puts: OptionPutQuote[] = [
  { strike: 21_500, premium: 25, delta: 0.05 },
  { strike: 21_700, premium: 45, delta: 0.1 },
  { strike: 21_850, premium: 80, delta: 0.15 },
  { strike: 21_950, premium: 120, delta: 0.22 },
];

const calls: OptionCallQuote[] = [
  { strike: 22_150, premium: 75, delta: 0.15 },
  { strike: 22_300, premium: 45, delta: 0.1 },
  { strike: 22_500, premium: 20, delta: 0.05 },
  { strike: 22_650, premium: 12, delta: 0.03 },
];

describe('option-chain utils', () => {
  it('finds puts closest to target delta', () => {
    expect(findPutByTargetDelta(puts, 0.15)?.strike).toBe(21_850);
    expect(findPutByTargetDelta(puts, 0.05)?.strike).toBe(21_500);
  });

  it('finds calls closest to target delta', () => {
    expect(findCallByTargetDelta(calls, 0.15)?.strike).toBe(22_150);
    expect(findCallByTargetDelta(calls, 0.05)?.strike).toBe(22_500);
  });

  it('calculates spread credit and close cost', () => {
    const shortPut = puts[2];
    const longPut = puts[0];

    expect(calculateSpreadCredit(shortPut, longPut)).toBe(55);
    expect(calculateSpreadCloseCost(21_850, 21_500, puts)).toBe(55);
    expect(calculatePutSpreadCredit(shortPut, longPut)).toBe(55);
    expect(calculatePutSpreadCloseCost(21_850, 21_500, puts)).toBe(55);
  });

  it('calculates call spread credit and close cost', () => {
    const shortCall = calls[0];
    const longCall = calls[2];

    expect(calculateCallSpreadCredit(shortCall, longCall)).toBe(55);
    expect(calculateCallSpreadCloseCost(22_150, 22_500, calls)).toBe(55);
  });

  it('calculates iron condor credit, close cost, and max loss', () => {
    const shortPut = puts[2];
    const longPut = puts[0];
    const shortCall = calls[0];
    const longCall = calls[2];

    expect(calculateIronCondorCredit(shortPut, longPut, shortCall, longCall)).toBe(110);
    expect(
      calculateIronCondorCloseCost(
        { shortStrike: 21_850, longStrike: 21_500 },
        { shortStrike: 22_150, longStrike: 22_500 },
        puts,
        calls,
      ),
    ).toBe(110);
    expect(calculateIronCondorMaxLoss(21_850, 21_500, 22_150, 22_500, 110)).toBe(240);
  });
});
