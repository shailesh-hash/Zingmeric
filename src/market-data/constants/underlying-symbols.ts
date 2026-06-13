export const SUPPORTED_OPTION_UNDERLYINGS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'] as const;

export type SupportedOptionUnderlying = (typeof SUPPORTED_OPTION_UNDERLYINGS)[number];

export function isSupportedOptionUnderlying(symbol: string): symbol is SupportedOptionUnderlying {
  return (SUPPORTED_OPTION_UNDERLYINGS as readonly string[]).includes(symbol);
}
