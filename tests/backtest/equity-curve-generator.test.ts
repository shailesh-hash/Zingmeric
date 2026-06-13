import { createEquityCurveGenerator } from '../../src/backtest/index.js';

describe('EquityCurveGenerator', () => {
  it('records equity points from cash and unrealized pnl', () => {
    const generator = createEquityCurveGenerator();

    generator.record({
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      cash: 100_000,
      unrealizedPnl: 0,
    });
    generator.record({
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
      cash: 102_750,
      unrealizedPnl: 750,
    });

    const curve = generator.getCurve();

    expect(curve).toHaveLength(2);
    expect(curve[0]?.equity).toBe(100_000);
    expect(curve[1]?.equity).toBe(103_500);
    expect(curve[1]?.positionValue).toBe(750);
    expect(generator.getLatest()?.equity).toBe(103_500);
  });
});
