---
name: antic
description: Local development skill for پرده آنتیک — self-hosted React/Vite + Express/Prisma curtain shop. Use for any change to this repo. Ignore all wix-* skills.
---

# Antic (local)

## When to use

Any task on the `antic` repository: UI, admin, catalog, cart, Zarinpal orders, Prisma models, Express routes.

## Hard rules

- **No Base44. No Wix.** Ignore `.agents/skills/wix-*` entirely.
- Full instructions: repository root `AGENTS.md` and `README.md`.
- Prefer imports:
  - `@/api/client` → `api`
  - `@/rest/store-cart`
  - `@/rest/store-catalog`
- Backend: `backend/` on port **3001**. Frontend: Vite on **5173** with `/api` proxy.

## Quick start

```bash
cd backend && cp .env.example .env && npm install && npm run db:setup && npm run dev
# other terminal
npm install && npm run dev
```

Admin: `admin@antic.local` / `admin123`

## Touch points

| Need | Where |
|------|--------|
| HTTP client | `src/api/client.js` |
| Cart / checkout | `src/rest/store-cart.js`, `backend/src/routes/orders.ts` |
| Shop catalog | `src/rest/store-catalog.js`, `backend/src/routes/catalog.ts` |
| Auth | `src/lib/AuthContext.jsx`, `backend/src/routes/auth.ts` |
| Schema | `backend/prisma/schema.prisma` |
| Entities CRUD | `backend/src/routes/entities.ts` |

## Do not

- Reintroduce Base44 SDK or Wix REST clients.
- Commit secrets, `dev.db`, or real upload binaries.
