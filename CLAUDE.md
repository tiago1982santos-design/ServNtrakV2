# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (port 5000, serves API + client via Vite proxy)
npm run build        # build client (Vite → dist/public) + server (esbuild → dist/index.cjs)
npm start            # run production build
npm run check        # TypeScript type-check (tsc --noEmit)
npm run db:push      # push Drizzle schema changes to the database
```

No test runner is configured. Unit-level tests are plain `.test.ts` files run manually with `tsx`:
```bash
npx tsx client/src/lib/suggestSlots.test.ts
npx tsx server/pushService.endpointAllowlist.test.ts
```

## Architecture

### Monorepo layout

```
client/src/   React 18 SPA (Vite)
server/       Express API + background services
shared/       Schema (Drizzle), route types, scheduling logic — imported by both sides
```

**Path aliases** (configured in `tsconfig.json` and `vite.config.ts`):
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### Server

`server/index.ts` bootstraps Express, runs inline `ALTER TABLE` / `CREATE TABLE IF NOT EXISTS` migrations on startup (not Drizzle migrations), then registers all routes via `server/routes.ts`.

Each domain has its own route file under `server/routes/` with a `register*Routes(app)` export. Authentication and object storage live in `server/replit_integrations/`.

`server/storage.ts` is the data-access layer — all DB queries go here (no ORM queries in route files).

Background services started at boot:
- `server/visitChecker.ts` — geofencing check, auto-logs service visits when user is within 75 m of a client.
- `server/pushService.ts` — Web Push delivery with VAPID, health monitoring, failure rate alerting.

### Client

`client/src/App.tsx` owns routing (Wouter) and auth-gate. All pages are in `client/src/pages/`. Shared components in `client/src/components/`; UI primitives (shadcn/ui) in `client/src/components/ui/`.

Each domain has a hook in `client/src/hooks/` wrapping React Query calls (e.g., `use-clients.ts`, `use-appointments.ts`). Prefer those hooks over calling `fetch` directly in pages.

`client/src/lib/queryClient.ts` — single TanStack Query client. `client/src/lib/themes.ts` — theme switching (`applyTheme()`).

### Shared

`shared/schema.ts` — single source of truth for all Drizzle table definitions and Zod schemas (via `drizzle-zod`).

`shared/routes.ts` — typed API route definitions shared between client hooks and server route files.

`shared/scheduling.ts` — business-rules logic for seasonal visit frequencies and automatic appointment generation.

## Design System

See `DESIGN_SYSTEM.md` for the full spec. Key rules:

- **Never hard-code colours** (`bg-orange-50`, `text-amber-500`, `#hex`). Always use CSS variable tokens (`bg-primary`, `text-muted-foreground`, etc.) so all three themes (Verde / Azul / Laranja) work.
- Themes are CSS variables declared in `client/src/index.css`, applied at startup from `localStorage` key `servntrak-theme`.
- All UI text, `aria-label`s, toasts, and form validations must be in **Português Europeu (PT-PT)**.
- `data-testid` pattern: `{action}-{target}`, e.g. `button-add-client`, `nav-clientes`.

## Environment Variables

Copy `.env.example` to `.env`. Required variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `ANTHROPIC_API_KEY` | AI / OCR features |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL` | Web Push |
| `RESEND_API_KEY` | Transactional email |

## TypeScript

The project uses **TypeScript 6.x** with `"ignoreDeprecations": "6.0"` to keep `baseUrl`-based path aliases working. Do not remove this flag until upgrading to TS 7 and migrating path aliases.

## Database Migrations

Schema lives in `shared/schema.ts`. Use `npm run db:push` for development. Some ad-hoc columns are also added via raw `pool.query` calls in `server/index.ts` on startup.
