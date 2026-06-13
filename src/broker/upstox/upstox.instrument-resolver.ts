import { InstrumentNotFoundError } from '../errors/live-broker.errors.js';
import type { UpstoxInstrumentReference } from './types/upstox.types.js';

export interface UpstoxInstrumentResolver {
  resolve(instrumentId: string): UpstoxInstrumentReference;
}

export class MapUpstoxInstrumentResolver implements UpstoxInstrumentResolver {
  constructor(private readonly instruments: Map<string, UpstoxInstrumentReference>) {}

  resolve(instrumentId: string): UpstoxInstrumentReference {
    const instrument = this.instruments.get(instrumentId);

    if (!instrument) {
      throw new InstrumentNotFoundError(instrumentId, 'upstox');
    }

    return instrument;
  }
}

export function createMapUpstoxInstrumentResolver(
  instruments: Record<string, UpstoxInstrumentReference>,
): MapUpstoxInstrumentResolver {
  return new MapUpstoxInstrumentResolver(new Map(Object.entries(instruments)));
}
