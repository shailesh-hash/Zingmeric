import type { EquityPoint } from '../types/portfolio-state.type.js';

export interface EquitySnapshot {
  timestamp: Date;
  cash: number;
  unrealizedPnl: number;
}

export class EquityCurveGenerator {
  private readonly points: EquityPoint[] = [];

  record(snapshot: EquitySnapshot): EquityPoint {
    const point: EquityPoint = {
      timestamp: snapshot.timestamp,
      equity: snapshot.cash + snapshot.unrealizedPnl,
      cash: snapshot.cash,
      positionValue: snapshot.unrealizedPnl,
    };

    this.points.push(point);
    return point;
  }

  getCurve(): EquityPoint[] {
    return [...this.points];
  }

  getLatest(): EquityPoint | null {
    return this.points.at(-1) ?? null;
  }
}

export function createEquityCurveGenerator(): EquityCurveGenerator {
  return new EquityCurveGenerator();
}
