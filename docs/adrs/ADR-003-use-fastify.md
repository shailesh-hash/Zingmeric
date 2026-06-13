# ADR-003: Use Fastify for the HTTP API Layer

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2025-06-14 |
| Deciders | Engineering |

## Context

Phase 1 requires a lightweight HTTP server for health checks, analytics endpoints, and future strategy/backtest APIs. The backend is TypeScript ESM (`"type": "module"`), runs on Node 20+, and must stay modular — no full-stack framework lock-in.

Alternatives considered: Express (larger ecosystem but slower, less structured plugin model), Hono (lighter but less mature Fastify plugin ecosystem), NestJS (excessive ceremony for a personal quant platform at this stage).

## Decision

Use **Fastify 5** as the HTTP framework.

Structure:

```text
src/index.ts          → loadConfig, connect Redis, listen
src/api/server.ts     → buildServer(config) — plugin registration
src/api/routes/       → route modules (health, analytics)
src/api/types/        → request/response DTOs
```

Conventions:

- `buildServer()` is async and returns a configured Fastify instance (testable without listening)
- Routes register via dedicated `register*Routes(app)` functions
- Structured logging via Fastify logger (`info` in dev, `warn` in production)
- CORS via `@fastify/cors` (currently `origin: true` — tighten before production exposure)
- No business logic in route handlers; delegate to services

## Consequences

### Positive

- High throughput and low overhead relative to Express
- Plugin architecture aligns with modular domain services
- Route modules are unit/integration tested (`tests/api/`)
- DI-friendly: services injected at registration time, not via globals

### Negative

- Smaller middleware ecosystem than Express (acceptable — minimal middleware needed)
- CORS currently permissive; must be restricted when API is publicly reachable
- No authentication layer yet (expected Phase 2+)

### Constraints

- New endpoints go in `src/api/routes/` with typed DTOs in `src/api/types/`
- Server bootstrap must remain separate from domain modules (strategies, backtest, broker)
- API must not import strategy internals directly except through service facades

## References

- `src/api/server.ts`
- `src/api/routes/health.ts`
- `src/api/routes/analytics.ts`
- `src/index.ts`
- `architecture.md` — Tech Stack
