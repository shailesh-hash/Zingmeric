import {
  createEquityCurveGenerator,
  type EquityCurveGenerator,
} from '../report/equity-curve-generator.js';
import { createBacktestReportService } from '../report/backtest-report.service.js';
import type { PortfolioEngine } from '../../portfolio/engine/portfolio-engine.js';
import { PositionKind } from '../../portfolio/types/portfolio.types.js';
import type { BacktestReport } from '../types/backtest-report.type.js';
import type { BacktestPositionRecord } from '../types/backtest-position.type.js';
import type { EquityPoint, SimulatedTrade } from '../types/portfolio-state.type.js';

export interface MetricsEngineInput {
  instrumentId: string;
  symbol: string;
  strategyName: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  riskFreeRate?: number;
  portfolioEngine: PortfolioEngine;
  trades: SimulatedTrade[];
  equityCurve: EquityPoint[];
}

export class MetricsEngine {
  constructor(
    private readonly equityCurveGenerator: EquityCurveGenerator = createEquityCurveGenerator(),
  ) {}

  recordEquityPoint(timestamp: Date, cash: number, unrealizedPnl: number): EquityPoint {
    return this.equityCurveGenerator.record({ timestamp, cash, unrealizedPnl });
  }

  buildReport(input: MetricsEngineInput): BacktestReport {
    return createBacktestReportService().generate({
      instrumentId: input.instrumentId,
      symbol: input.symbol,
      strategyName: input.strategyName,
      startDate: input.startDate,
      endDate: input.endDate,
      initialCapital: input.initialCapital,
      riskFreeRate: input.riskFreeRate,
      trades: input.trades,
      positions: this.mapPositions(input.portfolioEngine),
      equityCurve: input.equityCurve,
    });
  }

  getEquityCurve(): EquityPoint[] {
    return this.equityCurveGenerator.getCurve();
  }

  private mapPositions(portfolioEngine: PortfolioEngine): BacktestPositionRecord[] {
    const open = portfolioEngine.snapshot.openPositions;
    const closed = portfolioEngine.getClosedPositions();

    return [...open, ...closed].map((position) => ({
      id: position.id,
      strategyName: position.strategyName,
      instrumentId: position.instrumentId,
      status: position.status,
      kind: position.kind === PositionKind.EQUITY ? 'EQUITY' : 'DEFINED_RISK',
      quantity: position.quantity,
      openedAt: position.openedAt,
      closedAt: position.closedAt,
    }));
  }
}

export function createMetricsEngine(): MetricsEngine {
  return new MetricsEngine();
}
