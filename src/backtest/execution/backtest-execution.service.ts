import { DEFAULT_TRADING_COSTS, type TradingCostConfig } from '../types/backtest-config.type.js';
import { calculateOrderCosts } from '../simulation/trading-costs.js';
import { PositionKind, createPositionId } from '../../portfolio/types/portfolio.types.js';
import type { PortfolioEngine } from '../../portfolio/engine/portfolio-engine.js';
import type { RiskEngine } from '../../risk/engine/risk-engine.js';
import { updatePeakEquity } from '../../risk/engine/risk-engine.js';
import { createRiskContext } from '../../risk/types/risk.types.js';
import type { MarketSnapshot } from '../../strategies/types/market-snapshot.type.js';
import type { Signal } from '../../strategies/types/signal.type.js';
import {
  isCompositeExecution,
  type DefinedRiskMarkMetadata,
  type SignalExecution,
} from '../../strategies/types/signal-execution.type.js';
import { SignalAction } from '../../strategies/types/signal.type.js';
import type { BacktestTradeLedger } from './backtest-trade-ledger.js';

export interface BacktestExecutionConfig {
  lotSize: number;
  includeCosts?: boolean;
  costs?: TradingCostConfig;
}

export interface BacktestExecutionContext {
  peakEquity: number;
}

export class BacktestExecutionService {
  private peakEquity: number;
  private readonly positionMetadata = new Map<string, DefinedRiskMarkMetadata>();
  private readonly includeCosts: boolean;
  private readonly costs: TradingCostConfig;

  constructor(
    private readonly portfolioEngine: PortfolioEngine,
    private readonly riskEngine: RiskEngine,
    private readonly tradeLedger: BacktestTradeLedger,
    private readonly config: BacktestExecutionConfig,
    initialEquity: number,
  ) {
    this.peakEquity = initialEquity;
    this.includeCosts = config.includeCosts ?? true;
    this.costs = config.costs ?? DEFAULT_TRADING_COSTS;
  }

  get context(): BacktestExecutionContext {
    return { peakEquity: this.peakEquity };
  }

  executeSignal(signal: Signal, snapshot: MarketSnapshot): void {
    if (signal.action === SignalAction.HOLD || !signal.execution) {
      return;
    }

    if (isCompositeExecution(signal.execution)) {
      for (const step of signal.execution.steps) {
        this.executeStep(step, signal, snapshot);
      }
      return;
    }

    this.executeStep(signal.execution, signal, snapshot);
  }

  getPositionMetadata(positionId: string): DefinedRiskMarkMetadata | undefined {
    return this.positionMetadata.get(positionId);
  }

  private executeStep(step: SignalExecution, signal: Signal, snapshot: MarketSnapshot): void {
    switch (step.kind) {
      case 'OPEN_DEFINED_RISK':
        this.openDefinedRisk(step, signal, snapshot);
        break;
      case 'CLOSE_DEFINED_RISK':
        this.closeDefinedRisk(step, signal, snapshot);
        break;
      case 'OPEN_EQUITY':
        this.openEquity(step, signal, snapshot);
        break;
      case 'CLOSE_EQUITY':
        this.closeEquity(step, signal, snapshot);
        break;
      default:
        break;
    }

    this.refreshPeakEquity();
  }

  private openDefinedRisk(
    step: Extract<SignalExecution, { kind: 'OPEN_DEFINED_RISK' }>,
    signal: Signal,
    snapshot: MarketSnapshot,
  ): void {
    const quantity = step.quantity ?? this.config.lotSize;
    const tradeRiskAmount = step.maxLoss * quantity;
    const riskContext = createRiskContext({
      equity: this.portfolioEngine.snapshot.equity,
      peakEquity: this.peakEquity,
    });

    const validation = this.riskEngine.validateNewTrade(riskContext, { tradeRiskAmount });
    if (!validation.allowed) {
      return;
    }

    const fees = this.calculateFees('SELL', step.entryCredit, quantity);
    const position = this.portfolioEngine.openDefinedRiskPosition({
      strategyName: signal.strategyName,
      instrumentId: signal.instrumentId,
      timestamp: snapshot.timestamp,
      quantity,
      entryCredit: step.entryCredit,
      maxLoss: step.maxLoss,
      legGroupId: step.legGroupId,
    });

    if (step.markMetadata) {
      this.positionMetadata.set(position.id, step.markMetadata);
    }

    this.tradeLedger.record({
      timestamp: snapshot.timestamp,
      side: 'BUY',
      quantity,
      price: step.entryCredit,
      brokerage: fees.brokerage,
      stt: fees.stt,
      exchangeCharges: fees.exchangeCharges,
      slippage: fees.slippage,
      totalFees: fees.totalFees,
      realizedPnl: 0,
    });
  }

  private closeDefinedRisk(
    step: Extract<SignalExecution, { kind: 'CLOSE_DEFINED_RISK' }>,
    signal: Signal,
    snapshot: MarketSnapshot,
  ): void {
    const legGroupId = step.legGroupId ?? 'default';
    const positionId = createPositionId(signal.strategyName, signal.instrumentId, legGroupId);
    const openPosition = this.portfolioEngine.getPosition(positionId);

    if (!openPosition) {
      return;
    }

    const quantity = openPosition.quantity;
    const fees = this.calculateFees('BUY', step.closeCost, quantity);
    const { realizedPnl } = this.portfolioEngine.closeDefinedRiskPosition({
      positionId,
      timestamp: snapshot.timestamp,
      closeCost: step.closeCost,
    });

    this.positionMetadata.delete(positionId);
    this.tradeLedger.record({
      timestamp: snapshot.timestamp,
      side: 'SELL',
      quantity,
      price: step.closeCost,
      brokerage: fees.brokerage,
      stt: fees.stt,
      exchangeCharges: fees.exchangeCharges,
      slippage: fees.slippage,
      totalFees: fees.totalFees,
      realizedPnl,
    });
  }

  private openEquity(
    step: Extract<SignalExecution, { kind: 'OPEN_EQUITY' }>,
    signal: Signal,
    snapshot: MarketSnapshot,
  ): void {
    const quantity = step.quantity ?? this.config.lotSize;
    const tradeRiskAmount = step.price * quantity;
    const riskContext = createRiskContext({
      equity: this.portfolioEngine.snapshot.equity,
      peakEquity: this.peakEquity,
    });

    const validation = this.riskEngine.validateNewTrade(riskContext, { tradeRiskAmount });
    if (!validation.allowed) {
      return;
    }

    const fees = this.calculateFees('BUY', step.price, quantity);
    this.portfolioEngine.openEquityPosition({
      strategyName: signal.strategyName,
      instrumentId: signal.instrumentId,
      timestamp: snapshot.timestamp,
      quantity,
      price: step.price,
      fees: fees.totalFees,
    });

    this.tradeLedger.record({
      timestamp: snapshot.timestamp,
      side: 'BUY',
      quantity,
      price: step.price,
      brokerage: fees.brokerage,
      stt: fees.stt,
      exchangeCharges: fees.exchangeCharges,
      slippage: fees.slippage,
      totalFees: fees.totalFees,
      realizedPnl: 0,
    });
  }

  private closeEquity(
    step: Extract<SignalExecution, { kind: 'CLOSE_EQUITY' }>,
    _signal: Signal,
    snapshot: MarketSnapshot,
  ): void {
    const position = this.portfolioEngine.getPosition(step.positionId);

    if (position?.kind !== PositionKind.EQUITY) {
      return;
    }

    const quantity = step.quantity ?? position.quantity;
    const fees = this.calculateFees('SELL', step.price, quantity);
    const { realizedPnl } = this.portfolioEngine.closeEquityPosition({
      positionId: step.positionId,
      timestamp: snapshot.timestamp,
      quantity,
      price: step.price,
      fees: fees.totalFees,
    });

    this.tradeLedger.record({
      timestamp: snapshot.timestamp,
      side: 'SELL',
      quantity,
      price: step.price,
      brokerage: fees.brokerage,
      stt: fees.stt,
      exchangeCharges: fees.exchangeCharges,
      slippage: fees.slippage,
      totalFees: fees.totalFees,
      realizedPnl,
    });
  }

  private calculateFees(side: 'BUY' | 'SELL', price: number, quantity: number) {
    if (!this.includeCosts) {
      return {
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        executionPrice: price,
      };
    }

    return calculateOrderCosts(side, price, quantity, this.costs);
  }

  private refreshPeakEquity(): void {
    this.peakEquity = updatePeakEquity(this.peakEquity, this.portfolioEngine.snapshot.equity);
  }
}

export function createBacktestExecutionService(
  portfolioEngine: PortfolioEngine,
  riskEngine: RiskEngine,
  tradeLedger: BacktestTradeLedger,
  config: BacktestExecutionConfig,
  initialEquity: number,
): BacktestExecutionService {
  return new BacktestExecutionService(
    portfolioEngine,
    riskEngine,
    tradeLedger,
    config,
    initialEquity,
  );
}
