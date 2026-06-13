import { DEFAULT_TRADING_COSTS, type TradingCostConfig } from '../types/backtest-config.type.js';
import { getMetricsService } from '../../observability/instrumentation.js';
import type { SimulatedTrade } from '../types/portfolio-state.type.js';
import {
  SimulatedPositionStatus,
  type SimulatedSpreadPosition,
} from '../types/simulated-position.type.js';
import { calculateOrderCosts } from '../simulation/trading-costs.js';
import { calculateSpreadCloseCost } from '../../strategies/spreads/option-chain.utils.js';
import type { OptionChainSnapshot } from '../../strategies/types/market-snapshot.type.js';

export interface PortfolioSimulatorConfig {
  initialCapital: number;
  lotSize: number;
  includeCosts?: boolean;
  costs?: TradingCostConfig;
}

export interface OpenCreditSpreadParams {
  strategyName: string;
  instrumentId: string;
  timestamp: Date;
  shortStrike: number;
  longStrike: number;
  entryCredit: number;
}

export interface CloseCreditSpreadParams {
  timestamp: Date;
  optionChain: OptionChainSnapshot;
}

export interface MarkToMarketParams {
  timestamp: Date;
  optionChain?: OptionChainSnapshot;
}

let positionCounter = 0;

export function resetPortfolioSimulatorCounter(): void {
  positionCounter = 0;
}

export class PortfolioSimulator {
  private cash: number;
  private openSpread: SimulatedSpreadPosition | null = null;
  private readonly closedPositions: SimulatedSpreadPosition[] = [];
  private readonly trades: SimulatedTrade[] = [];
  private openCredit = 0;
  private readonly includeCosts: boolean;
  private readonly costs: TradingCostConfig;

  constructor(private readonly config: PortfolioSimulatorConfig) {
    this.cash = config.initialCapital;
    this.includeCosts = config.includeCosts ?? true;
    this.costs = config.costs ?? DEFAULT_TRADING_COSTS;
  }

  get initialCapital(): number {
    return this.config.initialCapital;
  }

  get cashBalance(): number {
    return this.cash;
  }

  get openPosition(): SimulatedSpreadPosition | null {
    return this.openSpread;
  }

  get tradeHistory(): SimulatedTrade[] {
    return [...this.trades];
  }

  get positions(): SimulatedSpreadPosition[] {
    const positions = [...this.closedPositions];
    if (this.openSpread) {
      positions.push(this.openSpread);
    }
    return positions;
  }

  openCreditSpread(params: OpenCreditSpreadParams): SimulatedTrade {
    if (this.openSpread) {
      throw new Error('Cannot open a spread while another spread is open');
    }

    const quantity = this.config.lotSize;
    const fees = this.calculateFees('SELL', params.entryCredit, quantity);
    const creditReceived = params.entryCredit * quantity - fees.totalFees;

    positionCounter += 1;
    this.openSpread = {
      id: `spread-${String(positionCounter)}`,
      strategyName: params.strategyName,
      instrumentId: params.instrumentId,
      status: SimulatedPositionStatus.OPEN,
      shortStrike: params.shortStrike,
      longStrike: params.longStrike,
      quantity,
      entryCredit: params.entryCredit,
      openedAt: params.timestamp,
    };
    this.openCredit = creditReceived;
    this.cash += creditReceived;

    const trade: SimulatedTrade = {
      timestamp: params.timestamp,
      side: 'BUY',
      quantity,
      price: params.entryCredit,
      brokerage: fees.brokerage,
      stt: fees.stt,
      exchangeCharges: fees.exchangeCharges,
      slippage: fees.slippage,
      totalFees: fees.totalFees,
      realizedPnl: 0,
    };
    this.trades.push(trade);

    getMetricsService().recordPositionOpened({
      strategyName: params.strategyName,
      positionType: 'defined_risk',
    });
    getMetricsService().recordOrderExecuted({
      strategyName: params.strategyName,
      side: 'buy',
    });

    return trade;
  }

  closeCreditSpread(params: CloseCreditSpreadParams): SimulatedTrade {
    if (!this.openSpread) {
      throw new Error('No open spread to close');
    }

    const closeCost =
      calculateSpreadCloseCost(
        this.openSpread.shortStrike,
        this.openSpread.longStrike,
        params.optionChain.puts,
      ) ?? 0;
    const quantity = this.openSpread.quantity;
    const fees = this.calculateFees('BUY', closeCost, quantity);
    const totalCloseCost = closeCost * quantity + fees.totalFees;
    const realizedPnl = this.openCredit - totalCloseCost;

    this.cash -= totalCloseCost;

    const closedPosition: SimulatedSpreadPosition = {
      ...this.openSpread,
      status: SimulatedPositionStatus.CLOSED,
      closedAt: params.timestamp,
      exitDebit: closeCost,
      realizedPnl,
    };
    this.closedPositions.push(closedPosition);
    this.openSpread = null;
    this.openCredit = 0;

    const trade: SimulatedTrade = {
      timestamp: params.timestamp,
      side: 'SELL',
      quantity,
      price: closeCost,
      brokerage: fees.brokerage,
      stt: fees.stt,
      exchangeCharges: fees.exchangeCharges,
      slippage: fees.slippage,
      totalFees: fees.totalFees,
      realizedPnl,
    };
    this.trades.push(trade);

    getMetricsService().recordOrderExecuted({
      strategyName: closedPosition.strategyName,
      side: 'sell',
    });

    return trade;
  }

  getUnrealizedPnl(optionChain?: OptionChainSnapshot): number {
    if (!this.openSpread || !optionChain) {
      return 0;
    }

    const markDebit =
      calculateSpreadCloseCost(
        this.openSpread.shortStrike,
        this.openSpread.longStrike,
        optionChain.puts,
      ) ?? this.openSpread.entryCredit;

    return this.openCredit - markDebit * this.openSpread.quantity;
  }

  getEquity(optionChain?: OptionChainSnapshot): number {
    return this.cash + this.getUnrealizedPnl(optionChain);
  }

  private calculateFees(side: 'BUY' | 'SELL', price: number, quantity: number) {
    if (!this.includeCosts) {
      return {
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        slippage: 0,
        totalFees: 0,
        executionPrice: price,
      };
    }

    return calculateOrderCosts(side, price, quantity, this.costs);
  }
}

export function createPortfolioSimulator(config: PortfolioSimulatorConfig): PortfolioSimulator {
  return new PortfolioSimulator(config);
}
