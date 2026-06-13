import type { Strategy } from '../strategy.interface.js';
import type { MarketSnapshot } from '../types/market-snapshot.type.js';
import { createSignal, SignalAction, type Signal } from '../types/signal.type.js';
import {
  DEFAULT_COVERED_CALL_CONFIG,
  type CoveredCallConfig,
  type CoveredCallPosition,
} from './covered-call.types.js';
import { findCallByTargetDelta } from '../spreads/option-chain.utils.js';

export class CoveredCallStrategy implements Strategy {
  readonly name = 'covered-call';

  private position: CoveredCallPosition | null = null;

  constructor(private readonly config: CoveredCallConfig = DEFAULT_COVERED_CALL_CONFIG) {}

  get openPosition(): CoveredCallPosition | null {
    return this.position;
  }

  evaluate(snapshot: MarketSnapshot): Signal {
    const chain = snapshot.optionChain;

    if (!chain || chain.calls.length === 0) {
      return this.hold(snapshot, 'Option chain unavailable');
    }

    if (this.position) {
      return this.evaluateOpenPosition(snapshot);
    }

    return this.evaluateEntry(snapshot, chain);
  }

  private evaluateEntry(
    snapshot: MarketSnapshot,
    chain: NonNullable<MarketSnapshot['optionChain']>,
  ): Signal {
    const shortCall = findCallByTargetDelta(chain.calls, this.config.callDelta);

    if (!shortCall) {
      return this.hold(snapshot, 'Unable to locate target delta call');
    }

    if (shortCall.strike <= snapshot.price) {
      return this.hold(snapshot, 'Call strike must be above current price');
    }

    const entryCredit = shortCall.premium;
    const maxLoss = Math.max(shortCall.strike - snapshot.price - entryCredit, 0);

    this.position = {
      entryTimestamp: snapshot.timestamp,
      stockEntryPrice: snapshot.price,
      callStrike: shortCall.strike,
      callEntryPremium: shortCall.premium,
      entryCredit,
      maxLoss,
      expiryDate: chain.expiryDate,
    };

    return createSignal({
      action: SignalAction.BUY,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
      reason: `Open covered call: long stock at ${snapshot.price.toFixed(2)}, sell ${String(shortCall.strike)}C for ${entryCredit.toFixed(2)}`,
      execution: {
        kind: 'COMPOSITE',
        steps: [
          {
            kind: 'OPEN_EQUITY',
            price: snapshot.price,
          },
          {
            kind: 'OPEN_DEFINED_RISK',
            entryCredit,
            maxLoss,
            legGroupId: 'short-call',
            markMetadata: {
              spreadKind: 'COVERED_CALL',
              callStrike: shortCall.strike,
            },
          },
        ],
      },
    });
  }

  private evaluateOpenPosition(snapshot: MarketSnapshot): Signal {
    const position = this.position;
    const chain = snapshot.optionChain;

    if (!position || !chain) {
      return this.hold(snapshot, 'Missing open position or option chain');
    }

    const shortCall = chain.calls.find((call) => call.strike === position.callStrike);

    if (!shortCall) {
      return this.hold(snapshot, 'Unable to mark short call to market');
    }

    const closeCost = shortCall.premium;
    const profitTargetDebit = position.entryCredit * (1 - this.config.profitTargetPct);
    const stopLossDebit = position.entryCredit * this.config.stopLossMultiple;

    if (closeCost <= profitTargetDebit) {
      return this.close(snapshot, `Profit target hit at debit ${closeCost.toFixed(2)}`, closeCost);
    }

    if (closeCost >= stopLossDebit) {
      return this.close(snapshot, `Stop loss hit at debit ${closeCost.toFixed(2)}`, closeCost);
    }

    return this.hold(
      snapshot,
      `Managing covered call: call debit ${closeCost.toFixed(2)}, credit ${position.entryCredit.toFixed(2)}`,
    );
  }

  private close(snapshot: MarketSnapshot, reason: string, closeCost: number): Signal {
    this.position = null;

    return createSignal({
      action: SignalAction.SELL,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
      reason,
      execution: {
        kind: 'COMPOSITE',
        steps: [
          {
            kind: 'CLOSE_DEFINED_RISK',
            legGroupId: 'short-call',
            closeCost,
          },
          {
            kind: 'CLOSE_EQUITY',
            positionId: `${this.name}:${snapshot.instrumentId}`,
            price: snapshot.price,
          },
        ],
      },
    });
  }

  private hold(snapshot: MarketSnapshot, reason: string): Signal {
    return createSignal({
      action: SignalAction.HOLD,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
      reason,
    });
  }
}

export function createCoveredCallStrategy(config?: CoveredCallConfig): CoveredCallStrategy {
  return new CoveredCallStrategy(config);
}
