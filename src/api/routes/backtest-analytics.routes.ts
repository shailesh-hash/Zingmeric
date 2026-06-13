import type { FastifyInstance } from 'fastify';
import { createBacktestAnalyticsService } from '../../analytics/service/backtest-analytics.service.js';
import type { BacktestAnalyticsService } from '../../analytics/service/backtest-analytics.service.js';
import { createPrismaBacktestAnalyticsRepository } from '../../analytics/repository/prisma-backtest-analytics.repository.js';
import { prisma } from '../../lib/prisma.js';
import {
  createBacktestAnalyticsController,
  type BacktestAnalyticsController,
} from '../controllers/backtest-analytics.controller.js';
import {
  apiErrorResponseSchema,
  backtestDetailResponseSchema,
  backtestIdParamsSchema,
  backtestListQuerySchema,
  backtestListResponseSchema,
  equityCurveResponseSchema,
  portfolioAnalyticsResponseSchema,
} from '../schemas/backtest-analytics.schema.js';

export interface BacktestAnalyticsRouteDeps {
  service: BacktestAnalyticsService;
  controller: BacktestAnalyticsController;
}

export function createDefaultBacktestAnalyticsRouteDeps(): BacktestAnalyticsRouteDeps {
  const service = createBacktestAnalyticsService(createPrismaBacktestAnalyticsRepository(prisma));

  return {
    service,
    controller: createBacktestAnalyticsController(service),
  };
}

export function registerBacktestAnalyticsRoutes(
  app: FastifyInstance,
  deps: BacktestAnalyticsRouteDeps = createDefaultBacktestAnalyticsRouteDeps(),
): void {
  const { controller } = deps;

  app.get(
    '/analytics/backtests',
    {
      schema: {
        querystring: backtestListQuerySchema,
        response: {
          200: backtestListResponseSchema,
        },
      },
    },
    controller.listBacktests.bind(controller),
  );

  app.get(
    '/analytics/backtests/:id',
    {
      schema: {
        params: backtestIdParamsSchema,
        response: {
          200: backtestDetailResponseSchema,
          404: apiErrorResponseSchema,
        },
      },
    },
    controller.getBacktest.bind(controller),
  );

  app.get(
    '/analytics/equity-curve/:id',
    {
      schema: {
        params: backtestIdParamsSchema,
        response: {
          200: equityCurveResponseSchema,
          404: apiErrorResponseSchema,
        },
      },
    },
    controller.getEquityCurve.bind(controller),
  );

  app.get(
    '/analytics/portfolio/:id',
    {
      schema: {
        params: backtestIdParamsSchema,
        response: {
          200: portfolioAnalyticsResponseSchema,
          404: apiErrorResponseSchema,
        },
      },
    },
    controller.getPortfolioAnalytics.bind(controller),
  );
}
