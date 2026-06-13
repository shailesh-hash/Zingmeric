Prompt1:
Read vision.md, architecture.md, rules.md and roadmap.md.

Implement Phase 1.

Create:

- Node.js
- TypeScript
- Fastify
- Prisma
- PostgreSQL
- Redis

Setup:

- Docker Compose
- ESLint
- Prettier
- Jest

Generate folder structure and explain all decisions.

Prompt2:
Read architecture.md.

Generate Prisma schema for:

Instrument
HistoricalPrice
OptionChain
Trade
Position
Portfolio
BacktestRun

Include indexes and relationships.

Follow PostgreSQL best practices.

Prompt3:
Read architecture.md.

Implement MarketDataService.

Responsibilities:

- Import historical candles
- Store in PostgreSQL
- Validate duplicates
- Support bulk imports

Generate:

- Service
- Repository
- DTOs
- Unit Tests

Prompt4:
Read architecture.md.

Implement Strategy Engine.

Requirements:

- Strategy interface
- Signal generation
- BUY
- SELL
- HOLD

Use dependency injection.

Provide unit tests.

Prompt5:
Implement Backtest Engine.

Requirements:

- Replay candles
- Generate signals
- Simulate orders
- Track portfolio

Outputs:

- CAGR
- Sharpe Ratio
- Profit Factor
- Max Drawdown

Generate architecture diagram.

Prompt6:
Implement Bull Put Spread Strategy.

Rules:

Sell 15 delta put.

Buy 5 delta put.

Profit Target:

50% credit received.

Stop Loss:

200% premium collected.

Provide:

- Strategy implementation
- Unit tests
- Backtest example

Prompt7:
Implement Iron Condor Strategy.

Requirements:

- Delta based strike selection
- Defined risk
- Profit target
- Stop loss

Generate tests.

Generate backtest scenarios.

Prompt8:
Implement Portfolio Engine.

Responsibilities:

- Position tracking
- Margin tracking
- Cash management

Generate tests.

Support multiple strategies.

Prompt8:
Implement Portfolio Engine.

Responsibilities:

- Position tracking
- Margin tracking
- Cash management

Generate tests.

Support multiple strategies.

Prompt9:
Implement Risk Engine.

Rules:

Max risk per trade:

1%

Hard stop:

2%

Portfolio drawdown:

15%

Block trades if violated.

Generate tests.

Prompt10:
Implement Analytics Module.

Metrics:

CAGR
Win Rate
Sharpe Ratio
Sortino Ratio
Profit Factor
Drawdown

Generate API endpoints.

Generate tests.

Prompt11:
Implement PaperBroker.

Requirements:

- Simulated order fills
- Position tracking
- PnL tracking

Must implement Broker interface.

Generate integration tests.

Prompt12:
Implement Zerodha Broker Adapter.

Requirements:

- Place order
- Cancel order
- Get positions

Follow Broker abstraction.

Generate tests.

Do not couple strategy engine to Zerodha APIs.

prompt13:
Read vision.md
Read architecture.md
Read rules.md
Read roadmap.md

Implement next-milestone.md.

Requirements:

1. Build event replay engine
2. Build signal engine
3. Build portfolio simulator
4. Build equity curve generator
5. Build report generator

Generate tests.

prompt14:
Create docs/adrs/ 
for examples
ADR-001-use-postgresql.md
ADR-002-use-prisma.md
ADR-003-use-fastify.md
ADR-004-event-driven-backtest.md
to help maintain architectural consistency.

Review the entire codebase.

Act as a Staff Engineer.

Create:

PROJECT_REVIEW.md

Include:

- Architecture score
- Maintainability score
- Missing modules
- Technical debt
- Security issues
- Performance issues
- Test coverage gaps

Provide prioritized action items.

prompt15:
Read:

vision.md
architecture.md
rules.md
roadmap.md

Act as a Staff Engineer.

Implement an Event Replay Engine for historical backtesting.

Requirements:

Create module:

src/backtest/engine

Design:

Historical data should be replayed as events rather than direct loops.

Create:

MarketEvent
OptionChainEvent
SignalEvent
OrderFilledEvent
PositionOpenedEvent
PositionClosedEvent

Create:

EventBus interface

Create:

ReplayEngine

Responsibilities:

1. Load historical candles
2. Load historical option chains
3. Sort chronologically
4. Replay events in sequence
5. Publish events to subscribed strategies

Design goals:

- Event driven
- Testable
- Strategy agnostic
- Broker agnostic

Generate:

Interfaces
DTOs
Services
Unit Tests

Provide architecture diagram and sequence diagram.

Do not implement live trading.

Focus only on historical replay.

prompt16:
Read:

architecture.md
rules.md

Review existing models:

Trade
Position
Portfolio
BacktestRun

Problem:

The system stores trades and positions but does not store portfolio value over time.

Design and implement an Equity Curve model.

Requirements:

Create Prisma model:

EquitySnapshot

Fields:

id
portfolioId
backtestRunId
timestamp

cashBalance
portfolioValue

realizedPnl
unrealizedPnl

drawdown

createdAt

Indexes:

portfolioId + timestamp

backtestRunId + timestamp

Responsibilities:

1. Capture portfolio state after every event
2. Allow drawdown calculations
3. Allow Sharpe calculations
4. Allow equity curve visualization

Generate:

Prisma schema changes
Migration
Repository
Service
Unit Tests

Explain why this model is required for:

CAGR
Sharpe
Sortino
Max Drawdown

Follow PostgreSQL best practices.

prompt17:
Read:

architecture.md
rules.md

Implement Portfolio Valuation Engine.

Create:

src/portfolio/valuation

Responsibilities:

1. Calculate current cash
2. Calculate unrealized pnl
3. Calculate realized pnl
4. Calculate portfolio value
5. Generate EquitySnapshot

Inputs:

Trades
Positions
Latest Market Prices

Outputs:

PortfolioValue

Generate:

Interfaces
Services
Unit Tests

Requirements:

Support:

Cash
Equities
Options

Design for future support of futures.

Avoid database coupling.

Use dependency injection.

prompt18:
Read:

architecture.md

Implement OpenTelemetry.

Requirements:

Node.js
Fastify
TypeScript

Create:

src/observability

Add:

Tracing
Metrics

Track:

HTTP Requests
Backtest Runs
Strategy Execution Time
Database Queries

Export metrics using Prometheus format.

Generate:

OpenTelemetry setup
Metrics service
Tracing service

Provide Docker configuration.

Follow OpenTelemetry best practices.

prompt19:
Read:

architecture.md

Implement Prometheus metrics.

Create:

src/observability/metrics

Expose endpoint:

/metrics

Track:

backtest_duration_seconds

backtest_runs_total

strategy_signals_generated_total

strategy_errors_total

orders_executed_total

positions_opened_total

portfolio_value

drawdown_percentage

Metrics must support Grafana dashboards.

Generate:

Metrics definitions
Registration
Middleware
Tests

Follow Prometheus naming conventions.

prompt20:
Implement observability for Backtest Engine.

Requirements:

Track:

Backtest Duration
Trades Executed
Strategy Errors
Portfolio Value
Drawdown

Metrics should be emitted automatically during replay.

Create:

BacktestMetricsPublisher

Integrate with:

ReplayEngine
PortfolioEngine
StrategyEngine

Generate:

Metrics
Tracing
Tests

Provide Grafana dashboard recommendations.

prompt21:
Read:

vision.md
architecture.md
rules.md

Implement historical option chain ingestion.

Requirements:

Support:

NIFTY
BANKNIFTY
FINNIFTY

Store:

Snapshot Time
Expiry
Strike
Call/Put
Bid
Ask
Last Traded Price
Volume
Open Interest
Implied Volatility

Implement:

OptionChainRepository
OptionChainService
OptionChainImportJob

Requirements:

Deduplicate records.

Support bulk imports.

Support querying:

Nearest Expiry
Specific Expiry
ATM Strikes
Delta Based Selection

Generate:

Services
Repositories
Tests

Performance target:

Millions of option chain rows.

prompt22:
Read:

all project documents

Implement Backtest Engine.

Requirements:

Inputs:

Strategy
Historical Data
Option Chains
Portfolio

Outputs:

Trades
Positions
Equity Curve
Performance Metrics

Architecture:

ReplayEngine
StrategyEngine
PortfolioEngine
RiskEngine
MetricsEngine

Generate:

Interfaces
Services
Tests

The engine must support:

Bull Put Spread
Iron Condor
Covered Calls

Future strategies should require zero changes to the engine.

prompt23:
Implement BullPutSpreadStrategyV1.

Rules:

Entry:

Sell Put:

Delta between 0.15 and 0.20

Buy Put:

Delta between 0.05 and 0.10

Same expiry.

Exit:

50% profit target.

200% stop loss.

Expiry exit.

Position sizing:

Maximum risk:

1% account.

Generate:

Strategy
Tests
Backtest examples

Integrate with:

Strategy interface

Do not hardcode strikes.

prompt24:
Implement Backtest Report Generator.

Inputs:

Trades
Positions
Equity Curve

Outputs:

CAGR
Sharpe Ratio
Sortino Ratio
Max Drawdown
Profit Factor
Win Rate

Export:

JSON
CSV

Generate:

BacktestReportService

BacktestReport DTO

Tests

Follow institutional reporting standards.

prompt25:
Implement Analytics API.

Endpoints:

GET /analytics/backtests

GET /analytics/backtests/:id

GET /analytics/equity-curve/:id

GET /analytics/portfolio/:id

Return:

Performance Metrics
Trade Statistics
Equity Curve

Generate:

Controllers
Services
DTOs
Tests

Use Fastify best practices.

prompt26:
Implement PaperBroker.

Requirements:

Simulated fills.

Market orders.

Limit orders.

Position tracking.

PnL tracking.

Implement:

Broker interface

Methods:

placeOrder
cancelOrder
getPositions

Integrate with:

PortfolioEngine

Generate tests.

No external broker dependencies.

prompt27:
Implement Forward Testing Engine.

Purpose:

Run strategies daily using live market feeds.

Architecture:

Market Feed
Strategy
Paper Broker
Portfolio

Track:

Expected PnL
Actual PnL
Slippage

Generate:

Services
Tests
Metrics

No real money execution.

prompt28:
Design Live Broker Framework.

Requirements:

Broker abstraction already exists.

Create:

ZerodhaBroker
UpstoxBroker

Implement:

placeOrder
cancelOrder
getPositions

Requirements:

Strategy layer must not know broker implementation.

Generate:

Interfaces
Adapters
Error Handling
Retry Logic
Tests

Do not connect to APIs yet.

Focus on architecture only.

prompt29:
Read the entire codebase.

Act as a Principal Engineer and Quant Developer.

Review:

Architecture
Performance
Trading correctness
Risk controls
Observability
Testing

Create:

PROJECT_REVIEW.md

Include:

Critical Issues
High Priority Issues
Medium Priority Issues
Low Priority Issues

Provide exact code recommendations and refactoring suggestions.

Do not generate code until review is complete.

prompt30:
Create a quantitative research framework.

Goal:

Evaluate strategies scientifically.

Generate:

ResearchTemplate.md

Sections:

Hypothesis
Market Regime
Entry Criteria
Exit Criteria
Position Sizing
Expected Outcome
Backtest Results
Drawdown Analysis
Failure Analysis
Improvement Ideas

The framework should be reusable for:

Bull Put Spread
Iron Condor
Covered Call
Wheel Strategy