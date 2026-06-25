# Expense Tracker Pro

A full-stack personal finance management app for tracking expenses, income, budgets, and financial goals — with analytics, monthly reports, and CSV export.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Recharts, next-themes, sonner
- API: Express 5 with JWT authentication (bcryptjs + jsonwebtoken)
- DB: PostgreSQL + Drizzle ORM (5 tables: users, expenses, income, budgets, goals)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for API shape)
- `lib/db/src/schema/` — Drizzle table definitions (users, expenses, income, budgets, goals)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod schemas for server-side validation
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware
- `artifacts/expense-tracker/src/pages/` — All frontend pages

## Architecture decisions

- JWT stored in localStorage; `setAuthTokenGetter` attaches Bearer token to all generated API fetch calls
- API routes all live under `/api` prefix; frontend dev server proxied via Replit shared proxy
- Budget spending is computed on-the-fly by aggregating expenses for the current month's date range
- Drizzle uses `numeric` for money columns (avoids float precision issues); parsed to JS `number` in route handlers
- After any DB schema change: run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs` to refresh composite lib declarations before building leaf packages

## Product

- **Dashboard** — Balance, income, expenses, savings summary; financial health score; recent transactions; budget alerts
- **Expenses** — Paginated list with search, category filter, date range; add/edit/delete; CSV export
- **Income** — Paginated income list; add/edit/delete; source tracking; CSV export
- **Budgets** — Monthly spending limits per category; live progress bars with over-budget alerts
- **Goals** — Savings milestones with progress tracking and deadline countdowns
- **Analytics** — Bar, line, and pie charts (Recharts); spending trends; category breakdown
- **Reports** — Month-by-month financial reports with MoM comparison and AI-style insights
- **Settings** — Profile update; dark/light/system theme switcher

## Gotchas

- After adding new tables to `lib/db/src/schema/`, always run `pnpm run typecheck:libs` before typechecking leaf packages — stale lib declarations cause false "module has no exported member" errors
- The `useGetMe` hook requires `queryKey` in its options object (quirk of the generated hook signature)
- Money amounts from DB come as strings; always `parseFloat()` before returning from route handlers
