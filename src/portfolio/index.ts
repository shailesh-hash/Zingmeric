import type { PrismaClient } from '@prisma/client';
import { PrismaEquitySnapshotRepository } from './repository/prisma-equity-snapshot.repository.js';
import { createEquityCurveService, EquityCurveService } from './service/equity-curve.service.js';

export { PortfolioEngine, createPortfolioEngine } from './engine/portfolio-engine.js';
export {
  InsufficientCashError,
  InsufficientMarginError,
  InvalidPortfolioOperationError,
  PositionNotFoundError,
} from './errors/portfolio.errors.js';
export {
  InvalidEquitySnapshotError,
  EquitySnapshotNotFoundError,
} from './errors/equity-curve.errors.js';
export type {
  RecordEquitySnapshotDto,
  EquitySnapshotQueryDto,
  EquitySnapshotDto,
  EquityCurvePointDto,
} from './dto/equity-snapshot.dto.js';
export type {
  EquitySnapshotRecord,
  EquitySnapshotRow,
  EquitySnapshotRepository,
} from './repository/equity-snapshot.repository.js';
export { EQUITY_SNAPSHOT_BATCH_SIZE } from './repository/equity-snapshot.repository.js';
export { PrismaEquitySnapshotRepository } from './repository/prisma-equity-snapshot.repository.js';
export {
  EquityCurveService,
  createEquityCurveService,
  type RecordEquitySnapshotResult,
  type EquityCurveMetrics,
} from './service/equity-curve.service.js';
export {
  calculateDefinedRiskMargin,
  calculateDefinedRiskUnrealizedPnl,
  calculateEquityMargin,
  calculateEquityUnrealizedPnl,
  calculatePositionMargin,
  calculatePositionUnrealizedPnl,
  calculateTotalMarginUsed,
} from './margin/margin-calculator.js';
export {
  PositionKind,
  PositionStatus,
  createPortfolioEngineConfig,
  createPositionId,
  type BasePosition,
  type CloseDefinedRiskPositionRequest,
  type CloseEquityPositionRequest,
  type DefinedRiskPosition,
  type EquityPosition,
  type MarkToMarketQuote,
  type MarginSummary,
  type OpenDefinedRiskPositionRequest,
  type OpenEquityPositionRequest,
  type PortfolioEngineConfig,
  type PortfolioLedgerEntry,
  type PortfolioPosition,
  type PortfolioSnapshot,
} from './types/portfolio.types.js';

export function createEquityCurveServiceFromPrisma(prisma: PrismaClient): EquityCurveService {
  return createEquityCurveService(new PrismaEquitySnapshotRepository(prisma));
}

export {
  InvalidValuationInputError,
  MissingMarketPriceError,
  ValuationInstrumentType,
  CashCalculatorService,
  createCashCalculatorService,
  PnlCalculatorService,
  createPnlCalculatorService,
  PortfolioValuationEngine,
  createPortfolioValuationEngine,
  InMemoryMarketPriceProvider,
  createInMemoryMarketPriceProvider,
} from './valuation/index.js';
export type {
  MarketPriceProvider,
  ValuationTrade,
  ValuationTradeSide,
  ValuationPosition,
  MarketPrice,
  PortfolioValuationInput,
  PortfolioValue,
  PositionValueBreakdown,
  GeneratedEquitySnapshot,
  PortfolioValuationEngineDependencies,
} from './valuation/index.js';
