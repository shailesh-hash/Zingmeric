# ADR-004: Event-Driven Backtest Architecture

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2025-06-14 |
| Deciders | Engineering |

## Context

Backtesting must replay historical market conditions, generate strategy signals, simulate fills with realistic costs, track multi-leg option positions, and produce performance metrics. Two execution models existed early in the project:

1. **Candle-based engine** — `BacktestEngine` replays OHLCV candles through `StrategyEngine` → `OrderSimulator` → `PortfolioTracker`
2. **Strategy-specific inline loops** — e.g. Iron Condor runner with manual cash/position tracking

Option spread strategies require option chain data at each timestep, multi-leg position state, and defined-risk PnL. A single candle-only path cannot express this without significant extension.

## Decision

Adopt an **event-driven backtest pipeline** as the canonical architecture for option spread strategies.

```text
MarketEvent[] (price + optional optionChain)
        │
        ▼
EventReplayEngine          ← sort/validate chronological events
        │
        ▼
BacktestSignalEngine       ← Strategy.evaluate(snapshot) → Signal
        │
        ▼
PortfolioSimulator         ← open/close credit spreads, costs, margin
        │
        ▼
EquityCurveGenerator       ← mark-to-market each event
        │
        ▼
BacktestReportGenerator    ← CAGR, Sharpe, PF, drawdown, trades
```

Key types:

- `MarketEvent` — timestamp, OHLCV, optional `optionChain`
- `SimulatedPosition` — multi-leg spread state
- `BacktestReport` — metrics + equity curve + trade log

Reference implementation: `BullPutSpreadBacktestPipeline` in `src/backtest/pipeline/`.

The legacy `BacktestEngine` (candle path) remains for equity-style strategies and existing tests but is not the target for new spread strategies.

## Consequences

### Positive

- Strategy-agnostic pipeline: swap strategy, keep replay/simulation/reporting
- Option chains are first-class inputs, not bolted onto candles
- `includeCosts` flag enforces brokerage, STT, slippage per `rules.md`
- Each stage is independently unit tested
- Aligns with architecture.md design principles: modular, event driven, testable

### Negative

- **Dual backtest paths** coexist until consolidation (candle engine + event pipeline + iron condor inline runner)
- **Three portfolio trackers** exist (`PortfolioTracker`, `PortfolioSimulator`, `PortfolioEngine`) with overlapping concerns
- Iron Condor not yet migrated to the event pipeline
- `RiskEngine` and production `PortfolioEngine` are not wired into the backtest pipeline yet

### Migration Path

1. Migrate Iron Condor to `*BacktestPipeline` using shared components
2. Deprecate inline runners after parity tests pass
3. Wire `RiskEngine.validateTrade()` into pipeline before `openCreditSpread`
4. Persist `BacktestReport` to `BacktestRun` via new repository
5. Retire or narrow `BacktestEngine` to non-option equity strategies only

## References

- `src/backtest/pipeline/bull-put-spread-backtest.pipeline.ts`
- `src/backtest/replay/event-replay-engine.ts`
- `src/backtest/signal/backtest-signal-engine.ts`
- `src/backtest/simulation/portfolio-simulator.ts`
- `src/backtest/report/`
- `architecture.md` — Backtest Engine, Design Principles
- `rules.md` — Backtesting Rules
