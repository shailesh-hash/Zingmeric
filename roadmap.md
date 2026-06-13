# AlgoTrader Roadmap

Current Goal:
Build a production-grade personal algo trading platform for
research, backtesting, forward testing and automated execution.

----------------------------------------------------
PHASE 1
FOUNDATION
Weeks 1-2
----------------------------------------------------

Objectives:

- Setup project
- Setup database
- Setup observability
- Setup CI/CD
- Setup code quality

Deliverables:

[ ] Node.js + TypeScript project
[ ] Fastify API
[ ] PostgreSQL
[ ] Prisma ORM
[ ] Redis
[ ] Docker Compose
[ ] ESLint
[ ] Prettier
[ ] Jest
[ ] GitHub Actions

Success Criteria:

Application boots locally.

----------------------------------------------------
PHASE 2
MARKET DATA
Weeks 2-3
----------------------------------------------------

Objectives:

Store historical market data.

Deliverables:

[ ] Instrument table
[ ] Historical candles
[ ] Option chain storage
[ ] Data import jobs

Success Criteria:

Historical data available for:

- NIFTY
- BANKNIFTY

----------------------------------------------------
PHASE 3
BACKTEST ENGINE
Weeks 3-4
----------------------------------------------------

Objectives:

Replay historical data.

Deliverables:

[ ] Strategy interface
[ ] Event engine
[ ] Order simulator
[ ] Portfolio simulator

Metrics:

[ ] CAGR
[ ] Drawdown
[ ] Sharpe
[ ] Profit Factor

Success Criteria:

Bull Put Spread can be backtested.

----------------------------------------------------
PHASE 4
STRATEGIES
Weeks 4-5
----------------------------------------------------

Implement:

[ ] Bull Put Spread
[ ] Iron Condor
[ ] Covered Call
[ ] Wheel Strategy

Success Criteria:

Each strategy produces trades.

----------------------------------------------------
PHASE 5
RISK ENGINE
Week 6
----------------------------------------------------

Implement:

[ ] Position sizing
[ ] Margin validation
[ ] Drawdown control

Rules:

1% account risk

2% hard limit

Success Criteria:

Invalid trades rejected.

----------------------------------------------------
PHASE 6
ANALYTICS
Week 7
----------------------------------------------------

Implement:

[ ] Trade analytics
[ ] Equity curve
[ ] Drawdown chart

Success Criteria:

Backtest results visible.

----------------------------------------------------
PHASE 7
PAPER TRADING
Weeks 8-9
----------------------------------------------------

Implement:

[ ] Broker abstraction
[ ] Paper broker
[ ] Market feed

Success Criteria:

Live paper trades execute.

----------------------------------------------------
PHASE 8
LIVE EXECUTION
Weeks 10-12
----------------------------------------------------

Implement:

[ ] Zerodha adapter
[ ] Upstox adapter

Success Criteria:

Real trades supported.

----------------------------------------------------
PHASE 9
FORWARD TESTING
Months 4-6
----------------------------------------------------

Objectives:

Run strategies daily.

Monitor:

- PnL
- Drawdown
- Slippage

No capital deployment yet.

----------------------------------------------------
PHASE 10
LIVE CAPITAL
Month 6+

Capital:

₹50k to ₹1 lakh

Scale only if:

Profit Factor > 1.5

Drawdown < 15%

100+ trades completed