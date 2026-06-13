import { SpanStatusCode, trace, type Span, type Tracer } from '@opentelemetry/api';
import type { SpanAttributes } from '../types/observability.types.js';

export class TracingService {
  private readonly tracer: Tracer;

  constructor(serviceName: string) {
    this.tracer = trace.getTracer(`${serviceName}-tracer`);
  }

  withSpanSync<T>(name: string, attributes: SpanAttributes, fn: () => T): T {
    return this.tracer.startActiveSpan(name, (span) => this.runInSpan(span, attributes, fn));
  }

  async withSpan<T>(name: string, attributes: SpanAttributes, fn: () => Promise<T>): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span) => {
      span.setAttributes(attributes);

      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: unknown) {
        this.recordError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private runInSpan<T>(span: Span, attributes: SpanAttributes, fn: () => T): T {
    span.setAttributes(attributes);

    try {
      const result = fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: unknown) {
      this.recordError(span, error);
      throw error;
    } finally {
      span.end();
    }
  }

  private recordError(span: Span, error: unknown): void {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof Error) {
      span.recordException(error);
    }
  }
}
