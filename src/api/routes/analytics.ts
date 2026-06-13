import type { FastifyInstance } from 'fastify';
import type { AnalyticsInput, AnalyticsTrade } from '../../analytics/types/analytics.types.js';
import { InvalidAnalyticsRequestError } from '../../analytics/errors/analytics.errors.js';
import { createAnalyticsService } from '../../analytics/index.js';
import type {
  AnalyticsDrawdownPointDto,
  AnalyticsErrorResponse,
  AnalyticsEquityPointDto,
  AnalyticsMetricsRequest,
  AnalyticsMetricsResponse,
  AnalyticsReportResponse,
  AnalyticsTradeDto,
} from '../types/analytics.js';

function parseEquityCurve(points: AnalyticsEquityPointDto[]): AnalyticsInput['equityCurve'] {
  return points.map((point) => ({
    timestamp: new Date(point.timestamp),
    equity: point.equity,
    cash: point.cash,
    positionValue: point.positionValue,
  }));
}

function parseTrades(trades: AnalyticsTradeDto[]): AnalyticsTrade[] {
  return trades.map((trade) => ({
    timestamp: new Date(trade.timestamp),
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    brokerage: trade.brokerage,
    stt: trade.stt,
    exchangeCharges: trade.exchangeCharges,
    slippage: trade.slippage,
    totalFees: trade.totalFees,
    realizedPnl: trade.realizedPnl,
  }));
}

function toAnalyticsInput(body: AnalyticsMetricsRequest): AnalyticsInput {
  return {
    initialCapital: body.initialCapital,
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),
    riskFreeRate: body.riskFreeRate,
    equityCurve: parseEquityCurve(body.equityCurve),
    trades: parseTrades(body.trades),
  };
}

function serializeMetrics(metrics: {
  cagr: number;
  winRate: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  finalCapital: number;
  initialCapital: number;
}): AnalyticsMetricsResponse {
  return {
    cagr: metrics.cagr,
    winRate: metrics.winRate,
    sharpeRatio: metrics.sharpeRatio,
    sortinoRatio: metrics.sortinoRatio,
    profitFactor: Number.isFinite(metrics.profitFactor) ? metrics.profitFactor : null,
    maxDrawdown: metrics.maxDrawdown,
    totalTrades: metrics.totalTrades,
    finalCapital: metrics.finalCapital,
    initialCapital: metrics.initialCapital,
  };
}

function serializeDrawdownSeries(
  series: { timestamp: Date; equity: number; peakEquity: number; drawdown: number }[],
): AnalyticsDrawdownPointDto[] {
  return series.map((point) => ({
    timestamp: point.timestamp.toISOString(),
    equity: point.equity,
    peakEquity: point.peakEquity,
    drawdown: point.drawdown,
  }));
}

function isValidMetricsRequest(body: unknown): body is AnalyticsMetricsRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const request = body as Partial<AnalyticsMetricsRequest>;

  return (
    typeof request.initialCapital === 'number' &&
    typeof request.startDate === 'string' &&
    typeof request.endDate === 'string' &&
    Array.isArray(request.equityCurve) &&
    Array.isArray(request.trades)
  );
}

export function registerAnalyticsRoutes(app: FastifyInstance): void {
  const analyticsService = createAnalyticsService();

  app.post<{ Body: AnalyticsMetricsRequest }>('/analytics/metrics', async (request, reply) => {
    if (!isValidMetricsRequest(request.body)) {
      return await reply.status(400).send({
        error: 'InvalidAnalyticsRequestError',
        message: 'Request body must include initialCapital, dates, equityCurve, and trades',
      } satisfies AnalyticsErrorResponse);
    }

    try {
      const metrics = analyticsService.calculateMetrics(toAnalyticsInput(request.body));

      return await reply.status(200).send(serializeMetrics(metrics));
    } catch (error) {
      if (error instanceof InvalidAnalyticsRequestError) {
        return await reply.status(400).send({
          error: error.name,
          message: error.message,
        } satisfies AnalyticsErrorResponse);
      }

      throw error;
    }
  });

  app.post<{ Body: AnalyticsMetricsRequest }>('/analytics/report', async (request, reply) => {
    if (!isValidMetricsRequest(request.body)) {
      return await reply.status(400).send({
        error: 'InvalidAnalyticsRequestError',
        message: 'Request body must include initialCapital, dates, equityCurve, and trades',
      } satisfies AnalyticsErrorResponse);
    }

    try {
      const report = analyticsService.generateReport(toAnalyticsInput(request.body));

      return await reply.status(200).send({
        metrics: serializeMetrics(report.metrics),
        drawdownSeries: serializeDrawdownSeries(report.drawdownSeries),
      } satisfies AnalyticsReportResponse);
    } catch (error) {
      if (error instanceof InvalidAnalyticsRequestError) {
        return await reply.status(400).send({
          error: error.name,
          message: error.message,
        } satisfies AnalyticsErrorResponse);
      }

      throw error;
    }
  });
}
