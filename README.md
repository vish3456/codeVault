# CodeVault

AI-powered second brain for competitive programmers. Track solved problems, notes, mistakes, spaced-repetition reviews, and AI-generated insights across platforms.

## Monorepo structure

| Package | Description |
|---------|-------------|
| `packages/db` | Prisma schema, migrations, and database client |
| `packages/shared` | Shared types, env validation, and utilities |
| `apps/web` | Next.js frontend *(coming soon)* |
| `apps/api` | Backend API *(coming soon)* |

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

## Quick start

```bash
# Install dependencies
pnpm install

# Copy environment template and set DATABASE_URL
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Push schema to database (dev) or run migrations (prod)
pnpm db:push
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm dev` | Start all dev servers |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Tech stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Database:** PostgreSQL + Prisma ORM
- **Language:** TypeScript (strict mode)
