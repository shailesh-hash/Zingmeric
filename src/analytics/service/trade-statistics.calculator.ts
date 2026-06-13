import type { TradeStatisticsDto } from '../dto/backtest-analytics.dto.js';
import type {
  BacktestPositionRecord,
  BacktestTradeRecord,
} from '../repository/backtest-analytics.repository.js';

function finiteProfitFactor(grossProfit: number, grossLoss: number): number | null {
  if (grossLoss === 0) {
    return grossProfit > 0 ? null : 0;
  }

  return grossProfit / grossLoss;
}

export function calculateTradeStatistics(
  trades: BacktestTradeRecord[],
  positions: BacktestPositionRecord[],
): TradeStatisticsDto {
  const closingTrades = trades.filter((trade) => trade.side === 'SELL');
  const closedPositions = positions.filter((position) => position.status === 'CLOSED');
  const realizedPnls =
    closedPositions.length > 0
      ? closedPositions.map((position) => position.realizedPnl)
      : closingTrades.map(() => 0);

  const winningTrades = realizedPnls.filter((pnl) => pnl > 0).length;
  const losingTrades = realizedPnls.filter((pnl) => pnl < 0).length;
  const breakEvenTrades = realizedPnls.filter((pnl) => pnl === 0).length;
  const totalTrades = closingTrades.length > 0 ? closingTrades.length : realizedPnls.length;

  const grossProfit = realizedPnls.filter((pnl) => pnl > 0).reduce((sum, pnl) => sum + pnl, 0);
  const grossLoss = Math.abs(
    realizedPnls.filter((pnl) => pnl < 0).reduce((sum, pnl) => sum + pnl, 0),
  );
  const netRealizedPnl = realizedPnls.reduce((sum, pnl) => sum + pnl, 0);
  const totalFees = trades.reduce((sum, trade) => sum + trade.totalFees, 0);

  const wins = realizedPnls.filter((pnl) => pnl > 0);
  const losses = realizedPnls.filter((pnl) => pnl < 0);

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate: totalTrades > 0 ? winningTrades / totalTrades : 0,
    grossProfit,
    grossLoss,
    netRealizedPnl,
    averageWin: wins.length > 0 ? grossProfit / wins.length : null,
    averageLoss: losses.length > 0 ? grossLoss / losses.length : null,
    profitFactor: finiteProfitFactor(grossProfit, grossLoss),
    totalFees,
    averageTradeFees: trades.length > 0 ? totalFees / trades.length : 0,
  };
}
