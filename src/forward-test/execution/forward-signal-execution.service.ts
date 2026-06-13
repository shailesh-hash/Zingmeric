import type { PaperBroker } from '../../broker/paper/paper-broker.js';
import { OrderSide } from '../../broker/types/broker.types.js';
import type { PortfolioEngine } from '../../portfolio/engine/portfolio-engine.js';
import { PositionKind, createPositionId } from '../../portfolio/types/portfolio.types.js';
import type { MarketSnapshot } from '../../strategies/types/market-snapshot.type.js';
import {
  isCompositeExecution,
  type SignalExecution,
} from '../../strategies/types/signal-execution.type.js';
import { SignalAction, type Signal } from '../../strategies/types/signal.type.js';
import type { ForwardExecutionRecord } from '../types/forward-test.types.js';

export interface ForwardSignalExecutionConfig {
  lotSize: number;
}

export class ForwardSignalExecutionService {
  constructor(
    private readonly broker: PaperBroker,
    private readonly config: ForwardSignalExecutionConfig,
  ) {}

  async executeSignal(signal: Signal, snapshot: MarketSnapshot): Promise<ForwardExecutionRecord[]> {
    if (signal.action === SignalAction.HOLD || !signal.execution) {
      return [];
    }

    if (isCompositeExecution(signal.execution)) {
      const records: ForwardExecutionRecord[] = [];

      for (const step of signal.execution.steps) {
        records.push(...(await this.executeStep(step, signal, snapshot)));
      }

      return records;
    }

    return this.executeStep(signal.execution, signal, snapshot);
  }

  private async executeStep(
    step: SignalExecution,
    signal: Signal,
    snapshot: MarketSnapshot,
  ): Promise<ForwardExecutionRecord[]> {
    switch (step.kind) {
      case 'OPEN_DEFINED_RISK':
        return [await this.executeOpenDefinedRisk(step, signal, snapshot)];
      case 'CLOSE_DEFINED_RISK':
        return [await this.executeCloseDefinedRisk(step, signal, snapshot)];
      case 'OPEN_EQUITY':
        return [await this.executeOpenEquity(step, signal, snapshot)];
      case 'CLOSE_EQUITY':
        return [await this.executeCloseEquity(step, signal, snapshot)];
      default:
        return [];
    }
  }

  private async executeOpenDefinedRisk(
    step: Extract<SignalExecution, { kind: 'OPEN_DEFINED_RISK' }>,
    signal: Signal,
    snapshot: MarketSnapshot,
  ): Promise<ForwardExecutionRecord> {
    const quantity = step.quantity ?? this.config.lotSize;
    const expectedPrice = step.entryCredit;

    const result = await this.broker.placeOrder({
      instrumentId: signal.instrumentId,
      strategyName: signal.strategyName,
      side: OrderSide.BUY,
      quantity,
      price: expectedPrice,
      timestamp: snapshot.timestamp,
      legGroupId: step.legGroupId,
      definedRisk: {
        entryCredit: step.entryCredit,
        maxLoss: step.maxLoss,
      },
    });

    const fill = result.fill;
    const actualPrice = fill?.price ?? expectedPrice;

    return this.createRecord({
      snapshot,
      signal,
      side: OrderSide.BUY,
      quantity,
      expectedPrice,
      actualPrice,
      expectedPnl: 0,
      actualPnl: fill?.realizedPnl ?? 0,
      fillSlippage: fill?.slippage ?? 0,
    });
  }

  private async executeCloseDefinedRisk(
    step: Extract<SignalExecution, { kind: 'CLOSE_DEFINED_RISK' }>,
    signal: Signal,
    snapshot: MarketSnapshot,
  ): Promise<ForwardExecutionRecord> {
    const portfolio = this.broker.getPortfolioEngine();
    const positionId = createPositionId(signal.strategyName, signal.instrumentId, step.legGroupId);
    const position = portfolio.getPosition(positionId);
    const quantity = position?.quantity ?? this.config.lotSize;
    const expectedPrice = step.closeCost;
    const expectedPnl = this.computeExpectedClosePnl(
      portfolio,
      positionId,
      expectedPrice,
      quantity,
    );

    const result = await this.broker.placeOrder({
      instrumentId: signal.instrumentId,
      strategyName: signal.strategyName,
      side: OrderSide.SELL,
      quantity,
      price: expectedPrice,
      timestamp: snapshot.timestamp,
      legGroupId: step.legGroupId,
      definedRisk: {
        maxLoss: position?.kind === PositionKind.DEFINED_RISK ? position.maxLoss : 0,
        closeCost: expectedPrice,
      },
    });

    const fill = result.fill;
    const actualPrice = fill?.price ?? expectedPrice;

    return this.createRecord({
      snapshot,
      signal,
      side: OrderSide.SELL,
      quantity,
      expectedPrice,
      actualPrice,
      expectedPnl,
      actualPnl: fill?.realizedPnl ?? 0,
      fillSlippage: fill?.slippage ?? 0,
    });
  }

  private async executeOpenEquity(
    step: Extract<SignalExecution, { kind: 'OPEN_EQUITY' }>,
    signal: Signal,
    snapshot: MarketSnapshot,
  ): Promise<ForwardExecutionRecord> {
    const quantity = step.quantity ?? this.config.lotSize;
    const expectedPrice = step.price;

    const result = await this.broker.placeOrder({
      instrumentId: signal.instrumentId,
      strategyName: signal.strategyName,
      side: OrderSide.BUY,
      quantity,
      price: expectedPrice,
      timestamp: snapshot.timestamp,
    });

    const fill = result.fill;
    const actualPrice = fill?.price ?? expectedPrice;

    return this.createRecord({
      snapshot,
      signal,
      side: OrderSide.BUY,
      quantity,
      expectedPrice,
      actualPrice,
      expectedPnl: 0,
      actualPnl: fill?.realizedPnl ?? 0,
      fillSlippage: fill?.slippage ?? 0,
    });
  }

  private async executeCloseEquity(
    step: Extract<SignalExecution, { kind: 'CLOSE_EQUITY' }>,
    signal: Signal,
    snapshot: MarketSnapshot,
  ): Promise<ForwardExecutionRecord> {
    const portfolio = this.broker.getPortfolioEngine();
    const position = portfolio.getPosition(step.positionId);
    const quantity = step.quantity ?? position?.quantity ?? this.config.lotSize;
    const expectedPrice = step.price;
    const expectedPnl = this.computeExpectedClosePnl(
      portfolio,
      step.positionId,
      expectedPrice,
      quantity,
    );

    const result = await this.broker.placeOrder({
      instrumentId: signal.instrumentId,
      strategyName: signal.strategyName,
      side: OrderSide.SELL,
      quantity,
      price: expectedPrice,
      timestamp: snapshot.timestamp,
    });

    const fill = result.fill;
    const actualPrice = fill?.price ?? expectedPrice;

    return this.createRecord({
      snapshot,
      signal,
      side: OrderSide.SELL,
      quantity,
      expectedPrice,
      actualPrice,
      expectedPnl,
      actualPnl: fill?.realizedPnl ?? 0,
      fillSlippage: fill?.slippage ?? 0,
    });
  }

  private computeExpectedClosePnl(
    portfolio: PortfolioEngine,
    positionId: string,
    closePrice: number,
    quantity: number,
  ): number {
    const position = portfolio.getPosition(positionId);
    if (!position) {
      return 0;
    }

    if (position.kind === PositionKind.DEFINED_RISK) {
      return (position.entryCredit - closePrice) * quantity;
    }

    return (closePrice - position.averagePrice) * quantity;
  }

  private createRecord(params: {
    snapshot: MarketSnapshot;
    signal: Signal;
    side: OrderSide;
    quantity: number;
    expectedPrice: number;
    actualPrice: number;
    expectedPnl: number;
    actualPnl: number;
    fillSlippage: number;
  }): ForwardExecutionRecord {
    const priceSlippage =
      params.quantity > 0
        ? Math.abs(params.actualPrice - params.expectedPrice) / params.expectedPrice
        : 0;
    const slippageCost =
      Math.abs(params.actualPrice - params.expectedPrice) * params.quantity + params.fillSlippage;

    return {
      timestamp: params.snapshot.timestamp,
      strategyName: params.signal.strategyName,
      instrumentId: params.signal.instrumentId,
      side: params.side,
      quantity: params.quantity,
      expectedPrice: params.expectedPrice,
      actualPrice: params.actualPrice,
      expectedPnl: params.expectedPnl,
      actualPnl: params.actualPnl,
      slippage: priceSlippage,
      slippageCost,
    };
  }
}

export function createForwardSignalExecutionService(
  broker: PaperBroker,
  config: ForwardSignalExecutionConfig,
): ForwardSignalExecutionService {
  return new ForwardSignalExecutionService(broker, config);
}
