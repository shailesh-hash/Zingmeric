import { InvalidOrderRequestError } from '../errors/broker.errors.js';
import type { ZerodhaInstrumentReference } from './types/zerodha.types.js';

export interface ZerodhaInstrumentResolver {
  resolve(instrumentId: string): ZerodhaInstrumentReference;
}

export class MapZerodhaInstrumentResolver implements ZerodhaInstrumentResolver {
  constructor(private readonly instruments: Map<string, ZerodhaInstrumentReference>) {}

  resolve(instrumentId: string): ZerodhaInstrumentReference {
    const instrument = this.instruments.get(instrumentId);

    if (!instrument) {
      throw new InvalidOrderRequestError(`Unknown instrument mapping for ${instrumentId}`);
    }

    return instrument;
  }
}

export function createMapZerodhaInstrumentResolver(
  instruments: Record<string, ZerodhaInstrumentReference>,
): MapZerodhaInstrumentResolver {
  return new MapZerodhaInstrumentResolver(new Map(Object.entries(instruments)));
}
