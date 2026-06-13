# Zingmeric

Personal quantitative trading platform for research, backtesting, forward testing, and automated execution.

**Status:** Phase 1 (Foundation) complete.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+, TypeScript (strict) |
| API | Fastify |
| Database | PostgreSQL 16, Prisma ORM |
| Cache / Queue | Redis 7 (BullMQ in later phases) |
| Tooling | ESLint, Prettier, Jest |
| Infrastructure | Docker Compose |
| CI | GitHub Actions |

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (Docker Desktop or [Colima](https://github.com/abiosoft/colima) on macOS)

## Quick Start

```bash
# Start infrastructure
docker compose up -d

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Apply database migrations
npm run db:migrate

# Start development server
npm run dev
```

The API listens on `http://localhost:3000`.

Verify:

```bash
curl http://localhost:3000/
curl http://localhost:3000/health
```

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Run all tests with coverage report |
| `npm run lint` | Lint source code |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting (used in CI) |
| `npm run db:migrate` | Create/apply Prisma migrations (dev) |
| `npm run db:push` | Push schema changes without migration |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio |

## Testing

Unit tests run without external services:

```bash
npm test
```

Integration tests (Postgres + Redis) run when `CI=true` or explicitly:

```bash
RUN_INTEGRATION_TESTS=true npm test
```

CI runs lint, format check, build, migrations, and full test coverage on push/PR to `main` or `master`.

## Health Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Service info |
| `GET /health` | Full health check (database + redis) |
| `GET /health/live` | Liveness probe |
| `GET /health/ready` | Readiness probe |

## Project Structure

```
src/
├── api/           # Fastify server and routes
├── config/        # Environment configuration
├── lib/           # Prisma and Redis clients
├── market-data/   # Phase 2
├── strategies/    # Phase 3–4
├── backtest/      # Phase 3
├── portfolio/     # Phase 3–5
├── risk/          # Phase 5
├── broker/        # Phase 7–8
├── analytics/     # Phase 6
└── jobs/          # Phase 2+ background workers
```

## Database

PostgreSQL schema managed by Prisma. See the [ER overview in architecture.md](./architecture.md#database-schema) for entity relationships.

```
prisma/
├── schema.prisma   # Models and enums
└── migrations/     # Versioned schema changes
```

## Project Docs

- [vision.md](./vision.md) — Product vision
- [architecture.md](./architecture.md) — System design
- [rules.md](./rules.md) — Engineering rules
- [roadmap.md](./roadmap.md) — Implementation phases
