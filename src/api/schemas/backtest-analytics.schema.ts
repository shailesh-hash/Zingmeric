export const performanceMetricsSchema = {
  type: 'object',
  properties: {
    cagr: { type: 'number' },
    sharpeRatio: { type: 'number' },
    sortinoRatio: { type: 'number' },
    maxDrawdown: { type: 'number' },
    profitFactor: { type: ['number', 'null'] },
    winRate: { type: 'number' },
    totalTrades: { type: 'number' },
    initialCapital: { type: 'number' },
    finalCapital: { type: 'number' },
  },
  required: [
    'cagr',
    'sharpeRatio',
    'sortinoRatio',
    'maxDrawdown',
    'profitFactor',
    'winRate',
    'totalTrades',
    'initialCapital',
    'finalCapital',
  ],
} as const;

export const tradeStatisticsSchema = {
  type: 'object',
  properties: {
    totalTrades: { type: 'number' },
    winningTrades: { type: 'number' },
    losingTrades: { type: 'number' },
    breakEvenTrades: { type: 'number' },
    winRate: { type: 'number' },
    grossProfit: { type: 'number' },
    grossLoss: { type: 'number' },
    netRealizedPnl: { type: 'number' },
    averageWin: { type: ['number', 'null'] },
    averageLoss: { type: ['number', 'null'] },
    profitFactor: { type: ['number', 'null'] },
    totalFees: { type: 'number' },
    averageTradeFees: { type: 'number' },
  },
  required: [
    'totalTrades',
    'winningTrades',
    'losingTrades',
    'breakEvenTrades',
    'winRate',
    'grossProfit',
    'grossLoss',
    'netRealizedPnl',
    'averageWin',
    'averageLoss',
    'profitFactor',
    'totalFees',
    'averageTradeFees',
  ],
} as const;

export const backtestSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    strategyName: { type: 'string' },
    status: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    initialCapital: { type: 'number' },
    finalCapital: { type: ['number', 'null'] },
    performanceMetrics: {
      oneOf: [performanceMetricsSchema, { type: 'null' }],
    },
    createdAt: { type: 'string' },
    completedAt: { type: ['string', 'null'] },
  },
  required: [
    'id',
    'name',
    'strategyName',
    'status',
    'startDate',
    'endDate',
    'initialCapital',
    'finalCapital',
    'performanceMetrics',
    'createdAt',
    'completedAt',
  ],
} as const;

export const backtestListResponseSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: backtestSummarySchema,
    },
    total: { type: 'number' },
  },
  required: ['items', 'total'],
} as const;

export const backtestDetailResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    strategyName: { type: 'string' },
    status: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    initialCapital: { type: 'number' },
    finalCapital: { type: ['number', 'null'] },
    createdAt: { type: 'string' },
    completedAt: { type: ['string', 'null'] },
    portfolioId: { type: ['string', 'null'] },
    includeCosts: { type: 'boolean' },
    performanceMetrics: performanceMetricsSchema,
    tradeStatistics: tradeStatisticsSchema,
  },
  required: [
    'id',
    'name',
    'strategyName',
    'status',
    'startDate',
    'endDate',
    'initialCapital',
    'finalCapital',
    'createdAt',
    'completedAt',
    'portfolioId',
    'includeCosts',
    'performanceMetrics',
    'tradeStatistics',
  ],
} as const;

export const equityCurveResponseSchema = {
  type: 'object',
  properties: {
    backtestRunId: { type: 'string' },
    points: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'string' },
          equity: { type: 'number' },
          cash: { type: 'number' },
          positionValue: { type: 'number' },
          drawdown: { type: 'number' },
        },
        required: ['timestamp', 'equity', 'cash', 'positionValue', 'drawdown'],
      },
    },
    drawdownSeries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'string' },
          equity: { type: 'number' },
          peakEquity: { type: 'number' },
          drawdown: { type: 'number' },
        },
        required: ['timestamp', 'equity', 'peakEquity', 'drawdown'],
      },
    },
  },
  required: ['backtestRunId', 'points', 'drawdownSeries'],
} as const;

export const portfolioAnalyticsResponseSchema = {
  type: 'object',
  properties: {
    backtestRunId: { type: 'string' },
    portfolio: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        mode: { type: 'string' },
        initialCapital: { type: 'number' },
        cashBalance: { type: 'number' },
        currency: { type: 'string' },
      },
      required: ['id', 'name', 'mode', 'initialCapital', 'cashBalance', 'currency'],
    },
    performanceMetrics: performanceMetricsSchema,
    tradeStatistics: tradeStatisticsSchema,
    equityCurve: equityCurveResponseSchema.properties.points,
    openPositions: { type: 'array' },
    closedPositions: { type: 'array' },
  },
  required: [
    'backtestRunId',
    'portfolio',
    'performanceMetrics',
    'tradeStatistics',
    'equityCurve',
    'openPositions',
    'closedPositions',
  ],
} as const;

export const apiErrorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['error', 'message'],
} as const;

export const backtestListQuerySchema = {
  type: 'object',
  properties: {
    strategyName: { type: 'string' },
    status: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    offset: { type: 'integer', minimum: 0 },
  },
} as const;

export const backtestIdParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
  },
  required: ['id'],
} as const;
