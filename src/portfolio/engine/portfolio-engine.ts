import {
  InsufficientCashError,
  InsufficientMarginError,
  InvalidPortfolioOperationError,
  PositionNotFoundError,
} from '../errors/portfolio.errors.js';
import {
  calculateDefinedRiskMargin,
  calculatePositionUnrealizedPnl,
  calculateTotalMarginUsed,
} from '../margin/margin-calculator.js';
import {
  createPositionId,
  PositionKind,
  PositionStatus,
  type CloseDefinedRiskPositionRequest,
  type CloseEquityPositionRequest,
  type DefinedRiskPosition,
  type EquityPosition,
  type MarkToMarketQuote,
  type MarginSummary,
  type OpenDefinedRiskPositionRequest,
  type OpenEquityPositionRequest,
  type PortfolioEngineConfig,
  type PortfolioLedgerEntry,
  type PortfolioPosition,
  type PortfolioSnapshot,
} from '../types/portfolio.types.js';

export class PortfolioEngine {
  private cash: number;
  private readonly openPositions = new Map<string, PortfolioPosition>();
  private readonly closedPositions: PortfolioPosition[] = [];
  private readonly ledger: PortfolioLedgerEntry[] = [];

  constructor(private readonly config: PortfolioEngineConfig) {
    if (config.initialCapital <= 0) {
      throw new InvalidPortfolioOperationError('initialCapital must be greater than zero');
    }

    this.cash = config.initialCapital;
  }

  get snapshot(): PortfolioSnapshot {
    const openPositions = this.getOpenPositions();
    const marginUsed = calculateTotalMarginUsed(openPositions);
    const unrealizedPnl = openPositions.reduce(
      (total, position) => total + calculatePositionUnrealizedPnl(position),
      0,
    );

    return {
      initialCapital: this.config.initialCapital,
      cash: this.cash,
      marginUsed,
      marginAvailable: this.cash - marginUsed,
      unrealizedPnl,
      equity: this.cash + unrealizedPnl,
      openPositions,
      closedPositionCount: this.closedPositions.length,
    };
  }

  get ledgerEntries(): PortfolioLedgerEntry[] {
    return [...this.ledger];
  }

  getOpenPositions(strategyName?: string): PortfolioPosition[] {
    const positions = [...this.openPositions.values()];

    if (!strategyName) {
      return positions;
    }

    return positions.filter((position) => position.strategyName === strategyName);
  }

  getPosition(positionId: string): PortfolioPosition | null {
    return this.openPositions.get(positionId) ?? null;
  }

  getMarginSummary(): MarginSummary {
    const openPositions = this.getOpenPositions();
    const marginUsed = calculateTotalMarginUsed(openPositions);

    return {
      marginUsed,
      marginAvailable: this.cash - marginUsed,
      openPositionCount: openPositions.length,
    };
  }

  canOpenDefinedRiskPosition(maxLoss: number, quantity: number): boolean {
    const requiredMargin = calculateDefinedRiskMargin(maxLoss, quantity);
    return this.getMarginSummary().marginAvailable >= requiredMargin;
  }

  canOpenEquityPosition(totalCost: number): boolean {
    return this.cash >= totalCost;
  }

  openEquityPosition(request: OpenEquityPositionRequest): EquityPosition {
    if (request.quantity <= 0) {
      throw new InvalidPortfolioOperationError('quantity must be greater than zero');
    }

    const fees = request.fees ?? 0;
    const totalCost = request.price * request.quantity + fees;

    if (!this.canOpenEquityPosition(totalCost)) {
      throw new InsufficientCashError(
        `Insufficient cash for equity buy: need ${totalCost.toFixed(2)}, have ${this.cash.toFixed(2)}`,
      );
    }

    const positionId = createPositionId(request.strategyName, request.instrumentId);
    const existing = this.openPositions.get(positionId);

    let position: EquityPosition;

    if (existing?.kind === PositionKind.EQUITY) {
      const newQuantity = existing.quantity + request.quantity;
      const newAveragePrice =
        (existing.averagePrice * existing.quantity + request.price * request.quantity) /
        newQuantity;

      position = {
        ...existing,
        quantity: newQuantity,
        averagePrice: newAveragePrice,
        markPrice: request.price,
      };
    } else if (existing) {
      throw new InvalidPortfolioOperationError(
        `Position ${positionId} already exists with incompatible kind`,
      );
    } else {
      position = {
        id: positionId,
        strategyName: request.strategyName,
        instrumentId: request.instrumentId,
        status: PositionStatus.OPEN,
        openedAt: request.timestamp,
        kind: PositionKind.EQUITY,
        quantity: request.quantity,
        averagePrice: request.price,
        markPrice: request.price,
      };
    }

    this.cash -= totalCost;
    this.openPositions.set(positionId, position);
    this.recordLedgerEntry({
      timestamp: request.timestamp,
      strategyName: request.strategyName,
      instrumentId: request.instrumentId,
      positionId,
      type: 'EQUITY_BUY',
      cashDelta: -totalCost,
      marginDelta: 0,
      realizedPnl: 0,
      quantity: request.quantity,
      price: request.price,
    });

    return position;
  }

  closeEquityPosition(request: CloseEquityPositionRequest): {
    position: EquityPosition | null;
    realizedPnl: number;
  } {
    const position = this.requireOpenEquityPosition(request.positionId);

    if (request.quantity <= 0 || request.quantity > position.quantity) {
      throw new InvalidPortfolioOperationError('Invalid close quantity');
    }

    const fees = request.fees ?? 0;
    const proceeds = request.price * request.quantity - fees;
    const costBasis = position.averagePrice * request.quantity;
    const realizedPnl = proceeds - costBasis;

    this.cash += proceeds;

    const remainingQuantity = position.quantity - request.quantity;
    let updatedPosition: EquityPosition | null = null;

    if (remainingQuantity > 0) {
      updatedPosition = {
        ...position,
        quantity: remainingQuantity,
        markPrice: request.price,
      };
      this.openPositions.set(position.id, updatedPosition);
    } else {
      this.closePositionRecord(position, request.timestamp);
    }

    this.recordLedgerEntry({
      timestamp: request.timestamp,
      strategyName: position.strategyName,
      instrumentId: position.instrumentId,
      positionId: position.id,
      type: 'EQUITY_SELL',
      cashDelta: proceeds,
      marginDelta: 0,
      realizedPnl,
      quantity: request.quantity,
      price: request.price,
    });

    return { position: updatedPosition, realizedPnl };
  }

  openDefinedRiskPosition(request: OpenDefinedRiskPositionRequest): DefinedRiskPosition {
    if (request.quantity <= 0) {
      throw new InvalidPortfolioOperationError('quantity must be greater than zero');
    }

    if (request.entryCredit <= 0 || request.maxLoss <= 0) {
      throw new InvalidPortfolioOperationError('entryCredit and maxLoss must be positive');
    }

    const positionId = createPositionId(
      request.strategyName,
      request.instrumentId,
      request.legGroupId,
    );

    if (this.openPositions.has(positionId)) {
      throw new InvalidPortfolioOperationError(`Position ${positionId} is already open`);
    }

    const requiredMargin = calculateDefinedRiskMargin(request.maxLoss, request.quantity);

    if (!this.canOpenDefinedRiskPosition(request.maxLoss, request.quantity)) {
      throw new InsufficientMarginError(
        `Insufficient margin: need ${requiredMargin.toFixed(2)}, available ${this.getMarginSummary().marginAvailable.toFixed(2)}`,
      );
    }

    const creditReceived = request.entryCredit * request.quantity;
    const position: DefinedRiskPosition = {
      id: positionId,
      strategyName: request.strategyName,
      instrumentId: request.instrumentId,
      status: PositionStatus.OPEN,
      openedAt: request.timestamp,
      kind: PositionKind.DEFINED_RISK,
      quantity: request.quantity,
      entryCredit: request.entryCredit,
      maxLoss: request.maxLoss,
      markPrice: request.entryCredit,
    };

    this.cash += creditReceived;
    this.openPositions.set(positionId, position);
    this.recordLedgerEntry({
      timestamp: request.timestamp,
      strategyName: request.strategyName,
      instrumentId: request.instrumentId,
      positionId,
      type: 'CREDIT_SPREAD_OPEN',
      cashDelta: creditReceived,
      marginDelta: requiredMargin,
      realizedPnl: 0,
      quantity: request.quantity,
      price: request.entryCredit,
    });

    return position;
  }

  closeDefinedRiskPosition(request: CloseDefinedRiskPositionRequest): {
    position: null;
    realizedPnl: number;
  } {
    const position = this.requireOpenDefinedRiskPosition(request.positionId);

    if (request.closeCost < 0) {
      throw new InvalidPortfolioOperationError('closeCost cannot be negative');
    }

    const totalCloseCost = request.closeCost * position.quantity;
    const creditReceived = position.entryCredit * position.quantity;
    const realizedPnl = creditReceived - totalCloseCost;

    if (this.cash < totalCloseCost) {
      throw new InsufficientCashError(
        `Insufficient cash to close position: need ${totalCloseCost.toFixed(2)}, have ${this.cash.toFixed(2)}`,
      );
    }

    this.cash -= totalCloseCost;
    this.closePositionRecord(position, request.timestamp);
    this.recordLedgerEntry({
      timestamp: request.timestamp,
      strategyName: position.strategyName,
      instrumentId: position.instrumentId,
      positionId: position.id,
      type: 'CREDIT_SPREAD_CLOSE',
      cashDelta: -totalCloseCost,
      marginDelta: -calculateDefinedRiskMargin(position.maxLoss, position.quantity),
      realizedPnl,
      quantity: position.quantity,
      price: request.closeCost,
    });

    return { position: null, realizedPnl };
  }

  markToMarket(quotes: MarkToMarketQuote[]): void {
    for (const quote of quotes) {
      const position = this.openPositions.get(quote.positionId);

      if (!position) {
        continue;
      }

      this.openPositions.set(quote.positionId, {
        ...position,
        markPrice: quote.markPrice,
      });
    }
  }

  private requireOpenEquityPosition(positionId: string): EquityPosition {
    const position = this.openPositions.get(positionId);

    if (!position) {
      throw new PositionNotFoundError(`Position not found: ${positionId}`);
    }

    if (position.kind !== PositionKind.EQUITY) {
      throw new InvalidPortfolioOperationError(`Position ${positionId} is not an equity position`);
    }

    return position;
  }

  private requireOpenDefinedRiskPosition(positionId: string): DefinedRiskPosition {
    const position = this.openPositions.get(positionId);

    if (!position) {
      throw new PositionNotFoundError(`Position not found: ${positionId}`);
    }

    if (position.kind !== PositionKind.DEFINED_RISK) {
      throw new InvalidPortfolioOperationError(
        `Position ${positionId} is not a defined-risk position`,
      );
    }

    return position;
  }

  private closePositionRecord(position: PortfolioPosition, closedAt: Date): void {
    const closedPosition: PortfolioPosition = {
      ...position,
      status: PositionStatus.CLOSED,
      closedAt,
    };

    this.openPositions.delete(position.id);
    this.closedPositions.push(closedPosition);
  }

  private recordLedgerEntry(entry: PortfolioLedgerEntry): void {
    this.ledger.push(entry);
  }
}

export function createPortfolioEngine(config: PortfolioEngineConfig): PortfolioEngine {
  return new PortfolioEngine(config);
}
