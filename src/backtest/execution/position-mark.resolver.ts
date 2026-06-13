import type { MarketSnapshot } from '../../strategies/types/market-snapshot.type.js';
import type { DefinedRiskMarkMetadata } from '../../strategies/types/signal-execution.type.js';
import {
  calculateIronCondorCloseCost,
  calculateSpreadCloseCost,
} from '../../strategies/spreads/option-chain.utils.js';
import type { DefinedRiskPosition } from '../../portfolio/types/portfolio.types.js';

export function resolveDefinedRiskMarkDebit(
  metadata: DefinedRiskMarkMetadata,
  snapshot: MarketSnapshot,
): number | null {
  const chain = snapshot.optionChain;

  if (!chain) {
    return null;
  }

  switch (metadata.spreadKind) {
    case 'BULL_PUT':
      return calculateSpreadCloseCost(metadata.shortStrike, metadata.longStrike, chain.puts);
    case 'IRON_CONDOR':
      return calculateIronCondorCloseCost(
        metadata.putSpread,
        metadata.callSpread,
        chain.puts,
        chain.calls,
      );
    case 'COVERED_CALL': {
      const shortCall = chain.calls.find((call) => call.strike === metadata.callStrike);
      return shortCall?.premium ?? null;
    }
    default:
      return null;
  }
}

export function estimateDefinedRiskUnrealizedPnl(
  position: DefinedRiskPosition,
  markDebit: number,
): number {
  const creditReceived = position.entryCredit * position.quantity;
  return creditReceived - markDebit * position.quantity;
}
