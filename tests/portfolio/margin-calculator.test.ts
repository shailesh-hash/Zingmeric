import {
  calculateDefinedRiskMargin,
  calculateDefinedRiskUnrealizedPnl,
  calculateEquityMargin,
  calculateEquityUnrealizedPnl,
  calculatePositionMargin,
  calculatePositionUnrealizedPnl,
  calculateTotalMarginUsed,
  PositionKind,
  PositionStatus,
  type DefinedRiskPosition,
  type EquityPosition,
} from '../../src/portfolio/index.js';

const equityPosition: EquityPosition = {
  id: 'equity:nifty:default',
  strategyName: 'equity',
  instrumentId: 'inst-nifty',
  status: PositionStatus.OPEN,
  openedAt: new Date('2024-01-15T09:15:00.000Z'),
  kind: PositionKind.EQUITY,
  quantity: 10,
  averagePrice: 100,
  markPrice: 110,
};

const definedRiskPosition: DefinedRiskPosition = {
  id: 'bull-put-spread:inst-nifty:default',
  strategyName: 'bull-put-spread',
  instrumentId: 'inst-nifty',
  status: PositionStatus.OPEN,
  openedAt: new Date('2024-01-15T09:15:00.000Z'),
  kind: PositionKind.DEFINED_RISK,
  quantity: 50,
  entryCredit: 55,
  maxLoss: 295,
  markPrice: 30,
};

describe('margin calculator', () => {
  it('calculates defined-risk margin from max loss and quantity', () => {
    expect(calculateDefinedRiskMargin(295, 50)).toBe(14_750);
  });

  it('calculates equity margin from mark price and quantity', () => {
    expect(calculateEquityMargin(110, 10)).toBe(1_100);
  });

  it('calculates position margin by kind', () => {
    expect(calculatePositionMargin(equityPosition)).toBe(1_100);
    expect(calculatePositionMargin(definedRiskPosition)).toBe(14_750);
  });

  it('sums margin across open positions', () => {
    expect(calculateTotalMarginUsed([equityPosition, definedRiskPosition])).toBe(15_850);
  });

  it('calculates unrealized pnl for equity and defined-risk positions', () => {
    expect(calculateEquityUnrealizedPnl(100, 110, 10)).toBe(100);
    expect(calculateDefinedRiskUnrealizedPnl(55, 30, 50)).toBe(1_250);
    expect(calculatePositionUnrealizedPnl(equityPosition)).toBe(100);
    expect(calculatePositionUnrealizedPnl(definedRiskPosition)).toBe(1_250);
  });

  it('returns zero unrealized pnl when mark price is missing', () => {
    const unmarked: EquityPosition = {
      ...equityPosition,
      markPrice: undefined,
    };

    expect(calculatePositionUnrealizedPnl(unmarked)).toBe(0);
  });
});
