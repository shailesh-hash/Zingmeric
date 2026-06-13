/**
 * Bull Put Spread V1 backtest example.
 *
 * Run: npx tsx examples/bull-put-spread-v1-backtest.example.ts
 */
import {
  createDefaultBacktestEngineDependencies,
  createInMemoryEventBus,
  createMarketEvent,
  createReplayEngine,
  createUnifiedBacktestEngine,
} from '../src/backtest/index.js';
import { BullPutSpreadStrategyV1 } from '../src/strategies/spreads/bull-put-spread-v1.strategy.js';

const bus = createInMemoryEventBus();
const engine = createUnifiedBacktestEngine(
  createDefaultBacktestEngineDependencies(createReplayEngine(bus), bus),
);

const strategy = new BullPutSpreadStrategyV1();

const optionChain = {
  expiryDate: new Date('2024-01-25T00:00:00.000Z'),
  underlyingPrice: 22_000,
  puts: [
    { strike: 21_500, premium: 25, delta: 0.05 },
    { strike: 21_700, premium: 45, delta: 0.08 },
    { strike: 21_850, premium: 80, delta: 0.15 },
    { strike: 21_950, premium: 110, delta: 0.18 },
    { strike: 22_050, premium: 150, delta: 0.22 },
  ],
  calls: [],
};

const events = [
  createMarketEvent({
    timestamp: new Date('2024-01-15T09:15:00.000Z'),
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    price: 22_000,
    optionChain,
  }),
  createMarketEvent({
    timestamp: new Date('2024-01-16T09:15:00.000Z'),
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    price: 21_950,
    optionChain: {
      ...optionChain,
      underlyingPrice: 21_950,
      puts: [
        { strike: 21_500, premium: 20, delta: 0.05 },
        { strike: 21_700, premium: 18, delta: 0.08 },
        { strike: 21_850, premium: 25, delta: 0.15 },
        { strike: 21_950, premium: 28, delta: 0.18 },
        { strike: 22_050, premium: 40, delta: 0.22 },
      ],
    },
  }),
  createMarketEvent({
    timestamp: new Date('2024-01-17T09:15:00.000Z'),
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    price: 21_900,
    optionChain: {
      ...optionChain,
      underlyingPrice: 21_900,
      puts: [
        { strike: 21_500, premium: 18, delta: 0.05 },
        { strike: 21_700, premium: 16, delta: 0.08 },
        { strike: 21_850, premium: 22, delta: 0.15 },
        { strike: 21_950, premium: 24, delta: 0.18 },
        { strike: 22_050, premium: 35, delta: 0.22 },
      ],
    },
  }),
];

const report = engine.runFromEvents({
  config: {
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    initialCapital: 2_000_000,
    lotSize: 50,
    includeCosts: false,
    strategyName: strategy.name,
  },
  strategy,
  events,
});

console.log('Bull Put Spread V1 Backtest');
console.log('===========================');
console.log(`Period: ${report.startDate.toISOString()} -> ${report.endDate.toISOString()}`);
console.log(`Trades: ${String(report.trades.length)}`);
console.log(`CAGR: ${(report.metrics.cagr * 100).toFixed(2)}%`);
console.log(`Sharpe: ${report.metrics.sharpeRatio.toFixed(2)}`);
console.log(`Profit Factor: ${report.metrics.profitFactor.toFixed(2)}`);
console.log(`Max Drawdown: ${(report.metrics.maxDrawdown * 100).toFixed(2)}%`);
console.log(`Final Capital: ${report.metrics.finalCapital.toFixed(2)}`);

for (const trade of report.trades) {
  console.log(
    `${trade.timestamp.toISOString()} ${trade.side} qty=${String(trade.quantity)} price=${trade.price.toFixed(2)} pnl=${trade.realizedPnl.toFixed(2)}`,
  );
}
