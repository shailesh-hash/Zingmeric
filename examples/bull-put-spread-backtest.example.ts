/**
 * Bull Put Spread backtest example.
 *
 * Run: npx tsx examples/bull-put-spread-backtest.example.ts
 */
import {
  BullPutSpreadStrategy,
  runBullPutSpreadBacktest,
} from '../src/strategies/spreads/index.js';

const strategy = new BullPutSpreadStrategy();

const candles = [
  {
    timestamp: new Date('2024-01-15T09:15:00.000Z'),
    close: 22_000,
    optionChain: {
      expiryDate: new Date('2024-01-25T00:00:00.000Z'),
      underlyingPrice: 22_000,
      puts: [
        { strike: 21_500, premium: 25, delta: 0.05 },
        { strike: 21_700, premium: 45, delta: 0.1 },
        { strike: 21_850, premium: 80, delta: 0.15 },
        { strike: 21_950, premium: 120, delta: 0.22 },
      ],
      calls: [],
    },
  },
  {
    timestamp: new Date('2024-01-16T09:15:00.000Z'),
    close: 21_950,
    optionChain: {
      expiryDate: new Date('2024-01-25T00:00:00.000Z'),
      underlyingPrice: 21_950,
      puts: [
        { strike: 21_500, premium: 20, delta: 0.05 },
        { strike: 21_700, premium: 35, delta: 0.1 },
        { strike: 21_850, premium: 50, delta: 0.15 },
        { strike: 21_950, premium: 75, delta: 0.22 },
      ],
      calls: [],
    },
  },
  {
    timestamp: new Date('2024-01-17T09:15:00.000Z'),
    close: 21_900,
    optionChain: {
      expiryDate: new Date('2024-01-25T00:00:00.000Z'),
      underlyingPrice: 21_900,
      puts: [
        { strike: 21_500, premium: 18, delta: 0.05 },
        { strike: 21_700, premium: 30, delta: 0.1 },
        { strike: 21_850, premium: 25, delta: 0.15 },
        { strike: 21_950, premium: 40, delta: 0.22 },
      ],
      calls: [],
    },
  },
];

const result = runBullPutSpreadBacktest(
  strategy,
  {
    instrumentId: 'inst-nifty',
    symbol: 'NIFTY',
    initialCapital: 100_000,
    lotSize: 50,
  },
  candles,
);

console.log('Bull Put Spread Backtest');
console.log('========================');
console.log(`Period: ${result.startDate.toISOString()} -> ${result.endDate.toISOString()}`);
console.log(`Trades: ${String(result.trades.length)}`);
console.log(`CAGR: ${(result.metrics.cagr * 100).toFixed(2)}%`);
console.log(`Sharpe: ${result.metrics.sharpeRatio.toFixed(2)}`);
console.log(`Profit Factor: ${result.metrics.profitFactor.toFixed(2)}`);
console.log(`Max Drawdown: ${(result.metrics.maxDrawdown * 100).toFixed(2)}%`);
console.log(`Final Capital: ${result.metrics.finalCapital.toFixed(2)}`);

for (const trade of result.trades) {
  console.log(
    `${trade.timestamp.toISOString()} ${trade.side} qty=${String(trade.quantity)} price=${trade.price.toFixed(2)} pnl=${trade.realizedPnl.toFixed(2)}`,
  );
}
