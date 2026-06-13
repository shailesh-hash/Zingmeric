# AlgoTrader Architecture

## Tech Stack

Frontend:
- React
- Vite
- TypeScript

Backend:
- Node.js
- TypeScript
- Fastify

Database:
- PostgreSQL

Queue:
- Redis
- BullMQ

Observability:
- Prometheus
- Grafana

Deployment:
- Docker
- Docker Compose

---

## High Level Architecture

Market Data
      |
      v
Market Data Service
      |
      v
PostgreSQL
      |
      v
Strategy Engine
      |
      v
Backtest Engine
      |
      v
Portfolio Engine
      |
      v
Risk Engine
      |
      v
Broker Adapter
      |
      v
Execution

---

## Modules

### Market Data

Responsibilities:

- Import historical data
- Import option chains
- Normalize data
- Store market snapshots

---

### Strategy Engine

Responsibilities:

- Evaluate market conditions
- Generate signals

Outputs:

- BUY
- SELL
- HOLD

Strategy interface:

interface Strategy {
  evaluate(snapshot): Signal
}

---

### Backtest Engine

Responsibilities:

- Replay historical data
- Simulate trades
- Calculate metrics

Outputs:

- CAGR
- Win Rate
- Drawdown
- Sharpe Ratio

---

### Portfolio Engine

Responsibilities:

- Position tracking
- Margin tracking
- Capital allocation

---

### Risk Engine

Responsibilities:

- Validate trades
- Enforce position limits
- Calculate portfolio risk

---

### Broker Adapter

Interface:

interface Broker {
  placeOrder()
  cancelOrder()
  getPositions()
}

Implementations:

- PaperBroker
- ZerodhaBroker
- UpstoxBroker

---

## Folder Structure

src/

market-data/
strategies/
backtest/
portfolio/
risk/
broker/
analytics/
jobs/
api/

---

## Design Principles

- Modular
- Event Driven
- Testable
- Strategy Agnostic
- Broker Agnostic

No microservices until absolutely required.