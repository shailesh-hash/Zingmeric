import type { Strategy } from '../strategy.interface.js';
import type { MarketSnapshot, OptionPutQuote } from '../types/market-snapshot.type.js';
import { createSignal, SignalAction, type Signal } from '../types/signal.type.js';
import type { OpenDefinedRiskExecution } from '../types/signal-execution.type.js';
import {
  DEFAULT_BULL_PUT_SPREAD_CONFIG,
  type BullPutSpreadConfig,
  type BullPutSpreadPosition,
} from './bull-put-spread.types.js';
import {
  calculateSpreadCloseCost,
  calculateSpreadCredit,
  findPutByTargetDelta,
} from './option-chain.utils.js';

export class BullPutSpreadStrategy implements Strategy {
  readonly name = 'bull-put-spread';

  private position: BullPutSpreadPosition | null = null;

  constructor(private readonly config: BullPutSpreadConfig = DEFAULT_BULL_PUT_SPREAD_CONFIG) {}

  get openPosition(): BullPutSpreadPosition | null {
    return this.position;
  }

  evaluate(snapshot: MarketSnapshot): Signal {
    const chain = snapshot.optionChain;

    if (!chain || chain.puts.length === 0) {
      return this.hold(snapshot, 'Option chain unavailable');
    }

    if (this.position) {
      return this.evaluateOpenPosition(snapshot);
    }

    return this.evaluateEntry(snapshot, chain.puts, chain.expiryDate);
  }

  private evaluateEntry(
    snapshot: MarketSnapshot,
    puts: OptionPutQuote[],
    expiryDate: Date,
  ): Signal {
    const shortPut = findPutByTargetDelta(puts, this.config.shortPutDelta);
    const longPut = findPutByTargetDelta(puts, this.config.longPutDelta);

    if (!shortPut || !longPut) {
      return this.hold(snapshot, 'Unable to locate target delta puts');
    }

    if (shortPut.strike <= longPut.strike) {
      return this.hold(snapshot, 'Invalid bull put spread strikes');
    }

    const credit = calculateSpreadCredit(shortPut, longPut);

    if (credit <= 0) {
      return this.hold(snapshot, 'Spread credit must be positive');
    }

    this.position = {
      entryTimestamp: snapshot.timestamp,
      entryCredit: credit,
      shortStrike: shortPut.strike,
      longStrike: longPut.strike,
      shortEntryPremium: shortPut.premium,
      longEntryPremium: longPut.premium,
      expiryDate,
    };

    return createSignal({
      action: SignalAction.BUY,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
      reason: `Open bull put spread: sell ${String(shortPut.strike)}P / buy ${String(longPut.strike)}P for credit ${credit.toFixed(2)}`,
      execution: this.createOpenExecution(credit, shortPut.strike, longPut.strike),
    });
  }

  private evaluateOpenPosition(snapshot: MarketSnapshot): Signal {
    const position = this.position;
    const chain = snapshot.optionChain;

    if (!position || !chain) {
      return this.hold(snapshot, 'Missing open position or option chain');
    }

    const closeCost = calculateSpreadCloseCost(
      position.shortStrike,
      position.longStrike,
      chain.puts,
    );

    if (closeCost === null) {
      return this.hold(snapshot, 'Unable to mark spread to market');
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
      `Managing spread: debit ${closeCost.toFixed(2)}, credit ${position.entryCredit.toFixed(2)}`,
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

  private createOpenExecution(
    entryCredit: number,
    shortStrike: number,
    longStrike: number,
  ): OpenDefinedRiskExecution {
    const width = shortStrike - longStrike;

    return {
      kind: 'OPEN_DEFINED_RISK',
      entryCredit,
      maxLoss: Math.max(width - entryCredit, 0),
      markMetadata: {
        spreadKind: 'BULL_PUT',
        shortStrike,
        longStrike,
      },
    };
  }
}
