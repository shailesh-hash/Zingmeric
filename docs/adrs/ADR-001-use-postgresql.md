# ADR-001: Use PostgreSQL as the Primary Database

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2025-06-14 |
| Deciders | Engineering |

## Context

AlgoTrader stores time-series market data (OHLCV candles), option chain snapshots, portfolio state, trade fills, and backtest run metadata. The platform requires:

- Relational integrity between instruments, prices, trades, and positions
- ACID transactions for trade and portfolio updates
- Efficient range queries over historical price data
- Schema evolution via versioned migrations

Alternatives considered: SQLite (insufficient for concurrent writes and production scale), MongoDB (weaker relational modeling for portfolio/trade joins), TimescaleDB (deferred until volume justifies a time-series extension).

## Decision

Use **PostgreSQL 16** as the sole application database.

- Connection via `DATABASE_URL` environment variable (required at startup)
- Local development via Docker Compose (`postgres:16-alpine`)
- All schema changes through Prisma migrations in `prisma/migrations/`
- No raw SQL unless justified and documented

## Consequences

### Positive

- Strong relational model for instruments → prices → trades → positions
- Mature ecosystem, well understood by the team
- Prisma ORM integrates cleanly with PostgreSQL types and enums
- CI runs `prisma migrate deploy` against Postgres service containers

### Negative

- Requires running Postgres locally (Docker Compose mitigates this)
- Option chain and candle volume may eventually need partitioning or TimescaleDB

### Constraints

- Every new entity must have a Prisma model and migration
- `DATABASE_URL` is mandatory; the app fails fast if missing (`src/config/index.ts`)
- Default dev credentials (`algotrader:algotrader`) are for local use only

## References

- `prisma/schema.prisma`
- `docker-compose.yml`
- `architecture.md` — Database Schema section
- `rules.md` — Database rules
