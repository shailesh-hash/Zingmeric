# ADR-002: Use Prisma as the ORM and Migration Tool

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2025-06-14 |
| Deciders | Engineering |

## Context

The platform needs type-safe database access, schema versioning, and repository-style data access without introducing heavy ORM ceremony. TypeScript strict mode is mandatory; implicit `any` and untyped queries are forbidden.

Alternatives considered: Drizzle (lighter, less mature migration story at project start), Knex + raw SQL (more boilerplate, weaker type inference), TypeORM (heavier, decorator-based patterns diverge from project style).

## Decision

Use **Prisma** for:

- Schema definition in `prisma/schema.prisma`
- Migration generation and deployment (`prisma migrate dev` / `prisma migrate deploy`)
- Generated `@prisma/client` types consumed by repository implementations
- Singleton client in `src/lib/prisma.ts` with graceful disconnect on shutdown

Repository pattern:

```text
Interface (e.g. HistoricalPriceRepository)
    └── Prisma implementation (e.g. PrismaHistoricalPriceRepository)
            └── Injected PrismaClient
```

Services receive repositories via constructor injection, not direct Prisma calls from route handlers.

## Consequences

### Positive

- End-to-end type safety from schema to TypeScript
- Migrations are reviewable SQL artifacts in version control
- `postinstall` runs `prisma generate` — CI and local builds stay in sync
- Enums (`Exchange`, `InstrumentType`, `PortfolioMode`, etc.) are shared across layers

### Negative

- Prisma Client bundle size and cold-start cost (acceptable for Node backend)
- Complex analytics queries may eventually need `$queryRaw` or a read replica
- Not all Prisma models are wired to application services yet (`BacktestRun`, `Trade`, `Position` exist in schema but lack repositories)

### Constraints

- No schema changes via `db push` in production; use migrations only
- Repository interfaces live beside Prisma implementations under `src/*/repository/`
- `globalForPrisma` singleton prevents connection exhaustion in dev hot-reload

## References

- `prisma/schema.prisma`
- `src/lib/prisma.ts`
- `src/market-data/repository/`
- `rules.md` — Database rules
