# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.


## This app — a Wix-managed headless frontend (built with the Wix skills)

This project is the **frontend for a Wix-managed business** — a REST client that talks
directly to a live Wix site. The **Wix site is the source of truth** for all content and
commerce; build and seed it only through the Wix connector and the skills below. **Do NOT
use the Base44 commerce kit (or any Base44 solution kit).**

The Wix skills live under `.agents/skills/` — on ANY turn, read them from that exact path.

- `wix-vibe-headless` — how the client is built and how the site is seeded. This app's REST
  transport, scaffolds and UI are already deployed into `src/` from it.
- `wix-base44-connector` — how this app calls its Wix site from here: gathering the site's
  context, finding an API and its contract, and which calls belong in the browser vs a
  backend function.
- `wix-manage` — REST recipes for configuring and managing the underlying Wix business
  solutions (products, orders, inventory, and more). Check here before writing management code.
