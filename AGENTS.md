# AGENTS.md

This is the primary operational guide for agents working in this repository.

## Project Overview

Bakery management system (Panaderia Industrial), a Next.js 14 monorepo with FastAPI backend for managing orders, inventory, CRM, production, and delivery routes.

## Commands

```bash
# Development
pnpm dev                    # Start Next.js dev server
pnpm build                  # Build for production
pnpm lint                   # Run ESLint
pnpm typecheck              # TypeScript check all workspaces

# FastAPI Backend (apps/api)
cd apps/api && python -m uvicorn app:app --reload

# Database
pnpm db:types               # Regenerate TS types from Supabase schemas
pnpm db:sync                # Sync parallel-worktree migrations + push + regenerate types
```

## Migration Policy (Mandatory)

- **All migrations MUST be created in `/Users/nicolasquintero/bakery-management-system` (rama `main`), never in worktrees de Conductor.** Esto evita conflictos de migraciones entre ramas/worktrees.
- For any migration workflow, always use `pnpm db:sync` (or `./scripts/db-sync-push.sh`).
- Do not run `supabase db push` directly for normal team workflows.
- The script exists to avoid conflicts between parallel worktrees and keep migrations consistent.
- After migration changes, ensure generated types are updated in `packages/database/src/database.types.ts`.

## Architecture

### Monorepo Structure
```
apps/
|-- web/                    # Next.js 14 (App Router) - Main ERP application
|   |-- app/                # Pages and API routes
|   |-- components/         # React components (shadcn/ui)
|   |-- hooks/              # Business logic hooks (use-*.ts)
|   `-- lib/                # Utilities and Supabase client
`-- api/                    # FastAPI backend (email processing, scheduled jobs)
packages/
`-- database/               # Shared TypeScript types (@bakery/database)
```

### Database Layer
- Supabase PostgreSQL with multiple schemas: `public`, `produccion`, `compras`, `inventario`, `visitas`, `workflows`.
- Generated types live in `packages/database/src/database.types.ts`.
- Custom functions include: `calculate_order_total()`, `calculate_theoretical_production()`, `calculate_theoretical_consumption()`.

### Data Flow Pattern
- Each entity has a dedicated hook in `apps/web/hooks/` for CRUD operations.
- Hooks use `useEffect` + manual refetch (not real-time subscriptions by default).
- Error handling is primarily done with toast notifications.

### User Roles
`admin`, `reviewer_area1`, `reviewer_area2`, `dispatcher`, `driver`, `commercial`

### Order Status Flow
`received` -> `review_area1` -> `review_area2` -> `ready_dispatch` -> `dispatched` -> `in_delivery` -> `delivered`

## Development Notes

- ESLint/TypeScript errors are currently ignored during Next.js build (see `apps/web/next.config.mjs`).
- Spanish language interface.
- Some Supabase foreign key relationships require manual data fetching due to schema cache issues.
- For FastAPI user tracking, pass `Authorization: Bearer {token}` and use `getAuthHeaders()` from cookies.

## Environment Variables

### `apps/web/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### `apps/api/.env`
```env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
MS_GRAPH_CLIENT_ID=
MS_GRAPH_CLIENT_SECRET=
MS_GRAPH_TENANT_ID=
```
