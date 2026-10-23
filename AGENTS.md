# AGENTS.md

## Project Context

**پرده آنتیک (Antic Curtain)** — self-hosted React + Vite frontend and Express/Prisma backend.

There is **no Base44, no Wix, and no external commerce platform**. All data and payments go through the local API (`/api`).

Start with `README.md` for local setup, environment variables, and payment configuration.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind, React Router, TanStack Query |
| Backend | Express, Prisma, SQLite (dev), JWT auth |
| Payments | Zarinpal (sandbox/demo when merchant id is empty) |
| Admin | `/admin` — products, orders, models, projects, settings |

## Key paths

- `src/` — frontend application
- `src/api/client.js` — HTTP client for `/api` (auth, entities, agents, upload)
- `src/rest/store-cart.js` — localStorage cart + checkout → `/api/orders`
- `src/rest/store-catalog.js` — product/category queries → `/api/catalog`
- `backend/` — Express API, Prisma schema, seed
- `backend/prisma/schema.prisma` — data models

## Local development

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run db:setup
npm run dev          # :3001

# Frontend (separate terminal)
cd ..
npm install
npm run dev          # :5173 — proxies /api and /uploads to backend
```

Admin: `admin@antic.local` / `admin123` → `/login` → `/admin`

## Working notes

- Prefer the existing `/api` client and REST helpers; do not reintroduce Base44/Wix SDKs.
- Shop amounts are in **تومان**; Zarinpal receives rials (`× ۱۰`).
- Run `npm run lint` (and backend smoke tests when relevant) before finishing changes.
- Keep Persian UI copy consistent; code identifiers stay English.
