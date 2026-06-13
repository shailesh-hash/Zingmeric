import { TracingService } from '../../src/observability/tracing/tracing.service.js';
import { noOpTracingService } from '../../src/observability/tracing/noop-tracing.service.js';

describe('TracingService', () => {
  it('executes sync spans and returns values', () => {
    const tracing = new TracingService('algotrader-test');

    const value = tracing.withSpanSync('test.sync', { 'test.key': 'value' }, () => 42);

    expect(value).toBe(42);
  });

  it('executes async spans and returns values', async () => {
    const tracing = new TracingService('algotrader-test');

    const value = await tracing.withSpan('test.async', { 'test.key': 'value' }, () =>
      Promise.resolve('ok'),
    );

    expect(value).toBe('ok');
  });

  it('propagates errors from sync spans', () => {
    const tracing = new TracingService('algotrader-test');

    expect(() =>
      tracing.withSpanSync('test.error', {}, () => {
        throw new Error('span failed');
      }),
    ).toThrow('span failed');
  });
});

describe('NoOpTracingService', () => {
  it('runs callbacks without tracing overhead', async () => {
    const value = await noOpTracingService.withSpan('ignored', {}, () => Promise.resolve('done'));
    expect(value).toBe('done');
  });
});
