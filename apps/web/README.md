# CodeVault Web

Next.js 15 App Router frontend for CodeVault.

## Setup

```bash
# From monorepo root
pnpm install

# Configure environment
cp apps/web/.env.example apps/web/.env.local
# Fill in Firebase client keys and API base URL
```

## Development

```bash
# From monorepo root
pnpm dev:web

# Or from this package
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script       | Description        |
| ------------ | ------------------ |
| `pnpm dev`   | Start dev server   |
| `pnpm build` | Production build   |
| `pnpm start` | Start production   |
| `pnpm lint`  | ESLint             |
| `pnpm typecheck` | `tsc --noEmit` |
