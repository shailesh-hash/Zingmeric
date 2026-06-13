import type { Strategy } from '../strategy.interface.js';
import type { MarketSnapshot } from '../types/market-snapshot.type.js';
import { createSignal, SignalAction, type Signal } from '../types/signal.type.js';
import type { OpenDefinedRiskExecution } from '../types/signal-execution.type.js';
import {
  DEFAULT_IRON_CONDOR_CONFIG,
  type IronCondorConfig,
  type IronCondorPosition,
} from './iron-condor.types.js';
import {
  calculateIronCondorCloseCost,
  calculateIronCondorCredit,
  calculateIronCondorMaxLoss,
  findCallByTargetDelta,
  findPutByTargetDelta,
} from './option-chain.utils.js';

export class IronCondorStrategy implements Strategy {
  readonly name = 'iron-condor';

  private position: IronCondorPosition | null = null;

  constructor(private readonly config: IronCondorConfig = DEFAULT_IRON_CONDOR_CONFIG) {}

  get openPosition(): IronCondorPosition | null {
    return this.position;
  }

  evaluate(snapshot: MarketSnapshot): Signal {
    const chain = snapshot.optionChain;

    if (!chain || chain.puts.length === 0 || chain.calls.length === 0) {
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
    const shortPut = findPutByTargetDelta(chain.puts, this.config.shortPutDelta);
    const longPut = findPutByTargetDelta(chain.puts, this.config.longPutDelta);
    const shortCall = findCallByTargetDelta(chain.calls, this.config.shortCallDelta);
    const longCall = findCallByTargetDelta(chain.calls, this.config.longCallDelta);

    if (!shortPut || !longPut || !shortCall || !longCall) {
      return this.hold(snapshot, 'Unable to locate target delta strikes');
    }

    if (shortPut.strike <= longPut.strike) {
      return this.hold(snapshot, 'Invalid put spread strikes');
    }

    if (shortCall.strike >= longCall.strike) {
      return this.hold(snapshot, 'Invalid call spread strikes');
    }

    if (shortPut.strike >= shortCall.strike) {
      return this.hold(snapshot, 'Put and call wings overlap');
    }

    const credit = calculateIronCondorCredit(shortPut, longPut, shortCall, longCall);

    if (credit <= 0) {
      return this.hold(snapshot, 'Iron condor credit must be positive');
    }

    const maxLoss = calculateIronCondorMaxLoss(
      shortPut.strike,
      longPut.strike,
      shortCall.strike,
      longCall.strike,
      credit,
    );

    if (maxLoss <= 0) {
      return this.hold(snapshot, 'Iron condor must have defined risk');
    }

    this.position = {
      entryTimestamp: snapshot.timestamp,
      entryCredit: credit,
      maxLoss,
      expiryDate: chain.expiryDate,
      putSpread: {
        shortStrike: shortPut.strike,
        longStrike: longPut.strike,
        shortEntryPremium: shortPut.premium,
        longEntryPremium: longPut.premium,
      },
      callSpread: {
        shortStrike: shortCall.strike,
        longStrike: longCall.strike,
        shortEntryPremium: shortCall.premium,
        longEntryPremium: longCall.premium,
      },
    };

    return createSignal({
      action: SignalAction.BUY,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
      reason: `Open iron condor: ${String(shortPut.strike)}P/${String(longPut.strike)}P ${String(shortCall.strike)}C/${String(longCall.strike)}C credit ${credit.toFixed(2)} maxLoss ${maxLoss.toFixed(2)}`,
      execution: {
        kind: 'OPEN_DEFINED_RISK',
        entryCredit: credit,
        maxLoss,
        markMetadata: {
          spreadKind: 'IRON_CONDOR',
          putSpread: {
            shortStrike: shortPut.strike,
            longStrike: longPut.strike,
          },
          callSpread: {
            shortStrike: shortCall.strike,
            longStrike: longCall.strike,
          },
        },
      } satisfies OpenDefinedRiskExecution,
    });
  }

  private evaluateOpenPosition(snapshot: MarketSnapshot): Signal {
    const position = this.position;
    const chain = snapshot.optionChain;

    if (!position || !chain) {
      return this.hold(snapshot, 'Missing open position or option chain');
    }

    const closeCost = calculateIronCondorCloseCost(
      position.putSpread,
      position.callSpread,
      chain.puts,
      chain.calls,
    );

    if (closeCost === null) {
      return this.hold(snapshot, 'Unable to mark iron condor to market');
    }

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
      `Managing condor: debit ${closeCost.toFixed(2)}, credit ${position.entryCredit.toFixed(2)}, maxLoss ${position.maxLoss.toFixed(2)}`,
    );
  }

  private close(snapshot: MarketSnapshot, reason: string, closeCost?: number): Signal {
    this.position = null;

    return createSignal({
      action: SignalAction.SELL,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
      reason,
      execution:
        closeCost !== undefined
          ? {
              kind: 'CLOSE_DEFINED_RISK',
              closeCost,
            }
          : undefined,
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
