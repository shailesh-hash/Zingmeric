import type { SpanAttributes } from '../types/observability.types.js';

export class NoOpTracingService {
  withSpanSync<T>(_name: string, _attributes: SpanAttributes, fn: () => T): T {
    return fn();
  }

  async withSpan<T>(_name: string, _attributes: SpanAttributes, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

export const noOpTracingService = new NoOpTracingService();
