import { PositionKind, type PortfolioPosition } from '../types/portfolio.types.js';

export function calculateDefinedRiskMargin(maxLoss: number, quantity: number): number {
  if (maxLoss <= 0 || quantity <= 0) {
    return 0;
  }

  return maxLoss * quantity;
}

export function calculateEquityMargin(markPrice: number, quantity: number): number {
  if (markPrice <= 0 || quantity <= 0) {
    return 0;
  }

  return markPrice * quantity;
}

export function calculatePositionMargin(position: PortfolioPosition): number {
  if (position.kind === PositionKind.DEFINED_RISK) {
    return calculateDefinedRiskMargin(position.maxLoss, position.quantity);
  }

  const markPrice = position.markPrice ?? position.averagePrice;

  return calculateEquityMargin(markPrice, position.quantity);
}

export function calculateTotalMarginUsed(positions: PortfolioPosition[]): number {
  return positions.reduce((total, position) => total + calculatePositionMargin(position), 0);
}

export function calculateDefinedRiskUnrealizedPnl(
  entryCredit: number,
  markPrice: number,
  quantity: number,
): number {
  return (entryCredit - markPrice) * quantity;
}

export function calculateEquityUnrealizedPnl(
  averagePrice: number,
  markPrice: number,
  quantity: number,
): number {
  return (markPrice - averagePrice) * quantity;
}

export function calculatePositionUnrealizedPnl(position: PortfolioPosition): number {
  if (position.markPrice === undefined) {
    return 0;
  }

  if (position.kind === PositionKind.DEFINED_RISK) {
    return calculateDefinedRiskUnrealizedPnl(
      position.entryCredit,
      position.markPrice,
      position.quantity,
    );
  }

  return calculateEquityUnrealizedPnl(position.averagePrice, position.markPrice, position.quantity);
}
