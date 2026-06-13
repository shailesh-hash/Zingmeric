# Engineering Rules

## General

Always prefer:

- Simplicity
- Readability
- Testability

Avoid:

- Premature optimization
- Unnecessary abstractions
- Framework complexity

---

## TypeScript

Use:

- Strict mode
- Interfaces
- Typed DTOs

Never use:

- any
- implicit types

---

## Database

Use PostgreSQL.

All schema changes must use migrations.

No raw SQL unless justified.

---

## Testing

Every module must have:

- Unit tests
- Edge case tests

Target:

- 80% coverage

---

## Trading Rules

Capital preservation is priority.

---

### Position Sizing

Maximum risk:

1% account risk per trade

Hard limit:

2% account risk per trade

Reject trade if exceeded.

---

### Drawdown Rules

Portfolio drawdown:

10%

Action:

Reduce size by 50%

Portfolio drawdown:

15%

Action:

Stop new trades

Manual review required

---

### Strategy Rules

Every strategy must define:

- Entry Rules
- Exit Rules
- Profit Target
- Stop Loss

No discretionary overrides.

---

### Backtesting Rules

Every backtest must include:

- Brokerage
- STT
- Slippage
- Exchange Charges

Results without costs are invalid.

---

### Production Rules

No live deployment unless:

- Minimum 6 months backtest
- Minimum 3 months paper trading
- Positive Profit Factor
- Maximum Drawdown < 15%

---

### Forbidden

Never implement:

- Martingale
- Averaging losers
- Unlimited risk trades
- Naked short calls

Reject PRs introducing these concepts.

---

## AI Coding Rules

When generating code:

1. Prefer maintainability over cleverness.
2. Write tests first.
3. Explain assumptions.
4. Do not introduce new dependencies unless necessary.
5. Follow existing project structure.