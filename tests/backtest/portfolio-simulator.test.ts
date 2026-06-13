import {
  createPortfolioSimulator,
  resetPortfolioSimulatorCounter,
  SimulatedPositionStatus,
} from '../../src/backtest/index.js';

describe('PortfolioSimulator', () => {
  beforeEach(() => {
    resetPortfolioSimulatorCounter();
  });

  const optionChain = {
    expiryDate: new Date('2024-01-25T00:00:00.000Z'),
    underlyingPrice: 22_000,
    puts: [
      { strike: 21_500, premium: 25, delta: 0.05 },
      { strike: 21_850, premium: 80, delta: 0.15 },
    ],
    calls: [],
  };

  it('opens and closes credit spreads with position tracking', () => {
    const simulator = createPortfolioSimulator({
      initialCapital: 100_000,
      lotSize: 50,
      includeCosts: false,
    });

    simulator.openCreditSpread({
      strategyName: 'bull-put-spread',
      instrumentId: 'inst-nifty',
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      shortStrike: 21_850,
      longStrike: 21_500,
      entryCredit: 55,
    });

    expect(simulator.openPosition?.status).toBe(SimulatedPositionStatus.OPEN);
    expect(simulator.cashBalance).toBe(102_750);
    expect(simulator.tradeHistory).toHaveLength(1);

    simulator.closeCreditSpread({
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
      optionChain: {
        ...optionChain,
        puts: [
          { strike: 21_500, premium: 20, delta: 0.05 },
          { strike: 21_850, premium: 25, delta: 0.15 },
        ],
      },
    });

    expect(simulator.openPosition).toBeNull();
    expect(simulator.positions).toHaveLength(1);
    expect(simulator.positions[0]?.status).toBe(SimulatedPositionStatus.CLOSED);
    expect(simulator.positions[0]?.realizedPnl).toBeGreaterThan(0);
    expect(simulator.tradeHistory[1]?.realizedPnl).toBeGreaterThan(0);
  });

  it('tracks unrealized pnl while a spread is open', () => {
    const simulator = createPortfolioSimulator({
      initialCapital: 100_000,
      lotSize: 50,
      includeCosts: false,
    });

    simulator.openCreditSpread({
      strategyName: 'bull-put-spread',
      instrumentId: 'inst-nifty',
      timestamp: new Date('2024-01-15T09:15:00.000Z'),
      shortStrike: 21_850,
      longStrike: 21_500,
      entryCredit: 55,
    });

    const updatedChain = {
      ...optionChain,
      puts: [
        { strike: 21_500, premium: 22, delta: 0.05 },
        { strike: 21_850, premium: 60, delta: 0.15 },
      ],
    };

    const unrealized = simulator.getUnrealizedPnl(updatedChain);

    expect(unrealized).toBe(850);
    expect(simulator.getEquity(updatedChain)).toBe(102_750 + unrealized);
  });
});
