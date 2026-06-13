import type { Strategy } from '../strategy.interface.js';
import type { MarketSnapshot, OptionPutQuote } from '../types/market-snapshot.type.js';
import { createSignal, SignalAction, type Signal } from '../types/signal.type.js';
import type { OpenDefinedRiskExecution } from '../types/signal-execution.type.js';
import {
  DEFAULT_BULL_PUT_SPREAD_V1_CONFIG,
  type BullPutSpreadV1Config,
  type BullPutSpreadV1Position,
} from './bull-put-spread-v1.types.js';
import {
  calculateDefinedRiskQuantity,
  calculateSpreadCloseCost,
  calculateSpreadCredit,
  findPutInDeltaRange,
} from './option-chain.utils.js';

export class BullPutSpreadStrategyV1 implements Strategy {
  readonly name = 'bull-put-spread-v1';

  private position: BullPutSpreadV1Position | null = null;

  constructor(config: Partial<BullPutSpreadV1Config> = {}) {
    this.config = { ...DEFAULT_BULL_PUT_SPREAD_V1_CONFIG, ...config };
  }

  private readonly config: BullPutSpreadV1Config;

  get openPosition(): BullPutSpreadV1Position | null {
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
    const shortPut = findPutInDeltaRange(
      puts,
      this.config.shortPutDeltaMin,
      this.config.shortPutDeltaMax,
    );
    const longPut = findPutInDeltaRange(
      puts,
      this.config.longPutDeltaMin,
      this.config.longPutDeltaMax,
    );

    if (!shortPut || !longPut) {
      return this.hold(snapshot, 'Unable to locate puts within target delta ranges');
    }

    if (shortPut.strike <= longPut.strike) {
      return this.hold(snapshot, 'Invalid bull put spread strikes');
    }

    const credit = calculateSpreadCredit(shortPut, longPut);

    if (credit <= 0) {
      return this.hold(snapshot, 'Spread credit must be positive');
    }

    const maxLossPerUnit = Math.max(shortPut.strike - longPut.strike - credit, 0);
    const accountEquity = snapshot.accountEquity;

    if (accountEquity === undefined || accountEquity <= 0) {
      return this.hold(snapshot, 'Account equity unavailable for position sizing');
    }

    const quantity = calculateDefinedRiskQuantity(
      accountEquity,
      maxLossPerUnit,
      this.config.lotSize,
      this.config.maxRiskPct,
    );

    if (quantity <= 0) {
      return this.hold(snapshot, 'Position size below minimum lot for 1% risk budget');
    }

    this.position = {
      entryTimestamp: snapshot.timestamp,
      entryCredit: credit,
      shortStrike: shortPut.strike,
      longStrike: longPut.strike,
      shortEntryPremium: shortPut.premium,
      longEntryPremium: longPut.premium,
      expiryDate,
      quantity,
    };

    return createSignal({
      action: SignalAction.BUY,
      strategyName: this.name,
      timestamp: snapshot.timestamp,
      instrumentId: snapshot.instrumentId,
      reason: `Open bull put spread v1: sell ${String(shortPut.strike)}P / buy ${String(longPut.strike)}P for credit ${credit.toFixed(2)} x ${String(quantity)}`,
      execution: this.createOpenExecution(credit, shortPut.strike, longPut.strike, quantity),
    });
  }

  private evaluateOpenPosition(snapshot: MarketSnapshot): Signal {
    const position = this.position;
    const chain = snapshot.optionChain;

    if (!position || !chain) {
      return this.hold(snapshot, 'Missing open position or option chain');
    }

    if (this.hasReachedExpiry(snapshot.timestamp, position.expiryDate)) {
      const closeCost = calculateSpreadCloseCost(
        position.shortStrike,
        position.longStrike,
        chain.puts,
      );

      return this.close(snapshot, 'Expiry exit', closeCost ?? 0);
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

  private hasReachedExpiry(timestamp: Date, expiryDate: Date): boolean {
    const barDay = Date.UTC(
      timestamp.getUTCFullYear(),
      timestamp.getUTCMonth(),
      timestamp.getUTCDate(),
    );
    const expiryDay = Date.UTC(
      expiryDate.getUTCFullYear(),
      expiryDate.getUTCMonth(),
      expiryDate.getUTCDate(),
    );

    return barDay >= expiryDay;
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
    quantity: number,
  ): OpenDefinedRiskExecution {
    const width = shortStrike - longStrike;

    return {
      kind: 'OPEN_DEFINED_RISK',
      entryCredit,
      maxLoss: Math.max(width - entryCredit, 0),
      quantity,
      markMetadata: {
        spreadKind: 'BULL_PUT',
        shortStrike,
        longStrike,
      },
    };
  }
}

export function createBullPutSpreadStrategyV1(
  config?: Partial<BullPutSpreadV1Config>,
): BullPutSpreadStrategyV1 {
  return new BullPutSpreadStrategyV1({
    ...DEFAULT_BULL_PUT_SPREAD_V1_CONFIG,
    ...config,
  });
}
