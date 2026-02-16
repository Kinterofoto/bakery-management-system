# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bakery management system (Panadería Industrial) - a Next.js 14 monorepo with FastAPI backend for managing orders, inventory, CRM, production, and delivery routes.

## Commands

```bash
# Development
pnpm dev                    # Start Next.js dev server
pnpm build                  # Build for production
pnpm lint                   # Run ESLint
pnpm typecheck              # TypeScript check all workspaces

# FastAPI Backend (apps/api)
cd apps/api && python -m uvicorn app:app --reload

# Database Migrations — ALWAYS from /Users/nicolasquintero/bakery-management-system (main)
# NEVER create migrations in worktrees. Copy to main repo and push from there.
supabase db push            # Push migrations to remote database (run from main repo only)
```

## Architecture

### Monorepo Structure
```
apps/
├── web/                    # Next.js 14 (App Router) - Main ERP application
│   ├── app/               # Pages and API routes
│   ├── components/        # React components (shadcn/ui)
│   ├── hooks/             # Business logic hooks (use-*.ts)
│   └── lib/               # Utilities and Supabase client
└── api/                    # FastAPI backend (email processing, scheduled jobs)
packages/
└── database/               # Shared TypeScript types (@bakery/database)
```

### Database Layer
- **Supabase** PostgreSQL with multiple schemas: `public`, `produccion`, `compras`
- **Type Safety**: Generated types in `packages/database/src/database.types.ts`
- **Custom Functions**: `calculate_order_total()`, `calculate_theoretical_production()`, `calculate_theoretical_consumption()`
- **Migrations**: Create in `supabase/migrations/`, push with `supabase db push`

### Data Flow Pattern
Each entity has a dedicated hook in `apps/web/hooks/` for CRUD operations:
- `use-orders.ts`, `use-clients.ts`, `use-products.ts`, `use-routes.ts`
- `use-production-shifts.ts`, `use-work-centers.ts`, `use-materials.ts`
- Hooks use `useEffect` + manual refetch (not real-time subscriptions)
- Error handling with toast notifications

### User Roles
`admin`, `reviewer_area1`, `reviewer_area2`, `dispatcher`, `driver`, `commercial`

### Order Status Flow
`received` → `review_area1` → `review_area2` → `ready_dispatch` → `dispatched` → `in_delivery` → `delivered`

## UI/UX Guidelines

**Always implement client-side validation to prevent user errors:**

- Block actions until prerequisites are met (e.g., no finalizing shift with active productions)
- Validate state before transitions (e.g., verify all productions finalized before closing shift)
- Use descriptive error messages explaining what's missing
- Disable buttons with tooltips when actions aren't applicable

## Development Notes

- ESLint/TypeScript errors ignored during build (see `next.config.mjs`)
- Spanish language interface
- Some Supabase foreign key relationships require manual data fetching due to schema cache issues
- **User Tracking in FastAPI**: Pass `Authorization: Bearer {token}` header. Use `getAuthHeaders()` from cookies. See `apps/web/app/order-management/actions.ts`

### Production Module Setup
- Uses dedicated `produccion` schema
- Expose schema in Supabase Dashboard → Settings → API → "Exposed schemas"
- Run `scripts/25-configure-produccion-schema-permissions.sql` after table creation

## Environment Variables

### apps/web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### apps/api/.env
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
MS_GRAPH_CLIENT_ID=
MS_GRAPH_CLIENT_SECRET=
MS_GRAPH_TENANT_ID=
```
