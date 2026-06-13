import {
  createDefaultBacktestEngineDependencies,
  createInMemoryEventBus,
  createMarketEvent,
  createReplayEngine,
  createUnifiedBacktestEngine,
} from '../../src/backtest/index.js';
import { PositionStatus } from '../../src/portfolio/types/portfolio.types.js';
import { BullPutSpreadStrategy } from '../../src/strategies/spreads/bull-put-spread.strategy.js';
import { IronCondorStrategy } from '../../src/strategies/spreads/iron-condor.strategy.js';
import { CoveredCallStrategy } from '../../src/strategies/equity/covered-call.strategy.js';
import { DEFAULT_RISK_CONFIG } from '../../src/risk/types/risk.types.js';

const bus = createInMemoryEventBus();
const engine = createUnifiedBacktestEngine(
  createDefaultBacktestEngineDependencies(createReplayEngine(bus), bus),
);

const baseConfig = {
  instrumentId: 'inst-nifty',
  symbol: 'NIFTY',
  initialCapital: 100_000,
  lotSize: 50,
  includeCosts: false,
};

const bullPutChain = {
  expiryDate: new Date('2024-01-25T00:00:00.000Z'),
  underlyingPrice: 22_000,
  puts: [
    { strike: 21_500, premium: 25, delta: 0.05 },
    { strike: 21_850, premium: 80, delta: 0.15 },
  ],
  calls: [] as { strike: number; premium: number; delta: number }[],
};

const ironCondorChain = {
  expiryDate: new Date('2024-01-25T00:00:00.000Z'),
  underlyingPrice: 22_000,
  puts: [
    { strike: 21_500, premium: 25, delta: 0.05 },
    { strike: 21_850, premium: 80, delta: 0.15 },
  ],
  calls: [
    { strike: 22_150, premium: 75, delta: 0.15 },
    { strike: 22_500, premium: 25, delta: 0.05 },
  ],
};

const coveredCallChain = {
  expiryDate: new Date('2024-01-25T00:00:00.000Z'),
  underlyingPrice: 22_000,
  puts: [] as { strike: number; premium: number; delta: number }[],
  calls: [
    { strike: 22_300, premium: 45, delta: 0.3 },
    { strike: 22_500, premium: 25, delta: 0.15 },
  ],
};

function marketEvents(
  chain: typeof bullPutChain,
  bars: { timestamp: string; price: number; chain?: typeof bullPutChain }[],
) {
  return bars.map((bar) =>
    createMarketEvent({
      timestamp: new Date(bar.timestamp),
      instrumentId: baseConfig.instrumentId,
      symbol: baseConfig.symbol,
      price: bar.price,
      optionChain: { ...(bar.chain ?? chain), underlyingPrice: bar.price },
    }),
  );
}

describe('UnifiedBacktestEngine', () => {
  it('runs bull put spread backtests end-to-end', () => {
    const strategy = new BullPutSpreadStrategy();
    const report = engine.runFromEvents({
      config: { ...baseConfig, strategyName: strategy.name },
      strategy,
      events: marketEvents(bullPutChain, [
        { timestamp: '2024-01-15T09:15:00.000Z', price: 22_000 },
        {
          timestamp: '2024-01-16T09:15:00.000Z',
          price: 21_950,
          chain: {
            ...bullPutChain,
            puts: [
              { strike: 21_500, premium: 20, delta: 0.05 },
              { strike: 21_850, premium: 25, delta: 0.15 },
            ],
          },
        },
      ]),
    });

    expect(report.trades).toHaveLength(2);
    expect(report.positions[0]?.status).toBe(PositionStatus.CLOSED);
    expect(report.metrics.finalCapital).toBeGreaterThan(baseConfig.initialCapital);
  });

  it('runs iron condor backtests end-to-end', () => {
    const strategy = new IronCondorStrategy();
    const report = engine.runFromEvents({
      config: { ...baseConfig, strategyName: strategy.name },
      strategy,
      events: marketEvents(ironCondorChain, [
        { timestamp: '2024-01-15T09:15:00.000Z', price: 22_000 },
        {
          timestamp: '2024-01-16T09:15:00.000Z',
          price: 22_010,
          chain: {
            ...ironCondorChain,
            puts: [
              { strike: 21_500, premium: 10, delta: 0.05 },
              { strike: 21_850, premium: 12, delta: 0.15 },
            ],
            calls: [
              { strike: 22_150, premium: 12, delta: 0.15 },
              { strike: 22_500, premium: 10, delta: 0.05 },
            ],
          },
        },
      ]),
    });

    expect(report.strategyName).toBe('iron-condor');
    expect(report.trades.length).toBeGreaterThanOrEqual(2);
    expect(report.equityCurve.length).toBe(2);
  });

  it('runs covered call backtests end-to-end', () => {
    const strategy = new CoveredCallStrategy();
    const report = engine.runFromEvents({
      config: { ...baseConfig, strategyName: strategy.name },
      strategy,
      events: marketEvents(coveredCallChain, [
        { timestamp: '2024-01-15T09:15:00.000Z', price: 22_000 },
        {
          timestamp: '2024-01-16T09:15:00.000Z',
          price: 22_050,
          chain: {
            ...coveredCallChain,
            calls: [
              { strike: 22_300, premium: 10, delta: 0.3 },
              { strike: 22_500, premium: 5, delta: 0.15 },
            ],
          },
        },
      ]),
    });

    expect(report.strategyName).toBe('covered-call');
    expect(report.trades.length).toBeGreaterThanOrEqual(2);
    expect(report.positions.length).toBeGreaterThan(0);
  });

  it('blocks new trades when risk limits are exceeded', () => {
    const strategy = new BullPutSpreadStrategy();
    const report = engine.runFromEvents({
      config: {
        ...baseConfig,
        strategyName: strategy.name,
        initialCapital: 100,
        lotSize: 50,
        riskConfig: DEFAULT_RISK_CONFIG,
      },
      strategy,
      events: marketEvents(bullPutChain, [
        { timestamp: '2024-01-15T09:15:00.000Z', price: 22_000 },
      ]),
    });

    expect(report.trades).toHaveLength(0);
  });
});
