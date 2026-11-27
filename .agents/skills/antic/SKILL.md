---
name: antic
description: Local development skill for پرده آنتیک — self-hosted Next.js + Express/Prisma curtain shop. Use for any change to this repo.
---

# Antic (local)

## When to use

Any task on the `antic` repository: UI, admin, catalog, shop orders, Prisma models, Express routes.

## Hard rules

- Full instructions: repository root `AGENTS.md` and `README.md`.
- Prefer imports:
  - `@/api` → `api`
  - `@/rest/store-cart`
  - `@/rest/store-catalog`
- Backend: `backend/` on port **3001**. Frontend: Next.js on **3000**.
- Payment/checkout is removed; orders are placed by contacting the admin (`/contact`).

## Quick start

```bash
cd backend && cp .env.example .env && bun install && bun run db:setup && bun run dev
# other terminal
bun install && bun run dev
```

Admin: `admin@antic.local` / `admin123`

## Touch points

| Need | Where |
|------|--------|
| HTTP client | `src/api/index.ts` |
| Cart (localStorage only) | `src/rest/store-cart.ts`, `src/context/CartContext.tsx` |
| Shop catalog | `src/rest/store-catalog.ts`, `backend/src/routes/catalog.ts` |
| Orders (no payment) | `backend/src/routes/orders.ts` |
| Auth | `src/lib/AuthContext.tsx`, `backend/src/routes/auth.ts` |
| Schema | `backend/prisma/schema.prisma` |
| Entities CRUD | `backend/src/routes/entities.ts` |

## Do not

- Reintroduce Base44 SDK or Wix REST clients.
- Reintroduce ZarinPal/payment/checkout code.
- Commit secrets, `dev.db`, or real upload binaries.
