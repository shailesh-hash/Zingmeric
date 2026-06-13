import type { FastifyReply, FastifyRequest } from 'fastify';
import type { BacktestAnalyticsService } from '../../analytics/service/backtest-analytics.service.js';
import { BacktestNotFoundError } from '../../analytics/errors/backtest-analytics.errors.js';
import type { ApiErrorResponse } from '../types/backtest-analytics.js';
import type { BacktestIdParams, BacktestListQuerystring } from '../types/backtest-analytics.js';

export class BacktestAnalyticsController {
  constructor(private readonly service: BacktestAnalyticsService) {}

  async listBacktests(
    request: FastifyRequest<{ Querystring: BacktestListQuerystring }>,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.service.listBacktests({
      strategyName: request.query.strategyName,
      status: request.query.status,
      limit: request.query.limit,
      offset: request.query.offset,
    });

    await reply.status(200).send(result);
  }

  async getBacktest(
    request: FastifyRequest<{ Params: BacktestIdParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getBacktestById(request.params.id);
      await reply.status(200).send(result);
    } catch (error) {
      await this.handleError(error, reply);
    }
  }

  async getEquityCurve(
    request: FastifyRequest<{ Params: BacktestIdParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getEquityCurve(request.params.id);
      await reply.status(200).send(result);
    } catch (error) {
      await this.handleError(error, reply);
    }
  }

  async getPortfolioAnalytics(
    request: FastifyRequest<{ Params: BacktestIdParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getPortfolioAnalytics(request.params.id);
      await reply.status(200).send(result);
    } catch (error) {
      await this.handleError(error, reply);
    }
  }

  private async handleError(error: unknown, reply: FastifyReply): Promise<void> {
    if (error instanceof BacktestNotFoundError) {
      await reply.status(404).send({
        error: error.name,
        message: error.message,
      } satisfies ApiErrorResponse);
      return;
    }

    throw error;
  }
}

export function createBacktestAnalyticsController(
  service: BacktestAnalyticsService,
): BacktestAnalyticsController {
  return new BacktestAnalyticsController(service);
}
