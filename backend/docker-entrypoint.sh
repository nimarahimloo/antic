#!/bin/sh
set -eu

fail() {
  echo "Startup configuration error: $1" >&2
  exit 1
}

if [ "${NODE_ENV:-production}" = "production" ]; then
  [ -n "${JWT_SECRET:-}" ] || fail "JWT_SECRET is required in backend/.env"
  [ "${#JWT_SECRET}" -ge 32 ] || fail "JWT_SECRET must contain at least 32 characters"
  case "$JWT_SECRET" in
    change-me-to-a-long-random-string-in-production|replace-with-a-random-secret-at-least-32-characters)
      fail "Replace the JWT_SECRET placeholder with a randomly generated secret"
      ;;
  esac

  [ -n "${ADMIN_EMAIL:-}" ] || fail "ADMIN_EMAIL is required in backend/.env"
  [ -n "${ADMIN_PASSWORD:-}" ] || fail "ADMIN_PASSWORD is required in backend/.env"
  [ "${#ADMIN_PASSWORD}" -ge 12 ] || fail "ADMIN_PASSWORD must contain at least 12 characters"
  [ "$ADMIN_PASSWORD" != "admin123" ] || fail "Replace the default ADMIN_PASSWORD"
  case "$ADMIN_PASSWORD" in
    replace-with-a-unique-password-at-least-12-chars)
      fail "Replace the ADMIN_PASSWORD placeholder"
      ;;
  esac

  [ -n "${MCP_WORKER_TOKEN:-}" ] || fail "MCP_WORKER_TOKEN is required in backend/.env and must match the Cloudflare Worker secret"
  [ "${#MCP_WORKER_TOKEN}" -ge 32 ] || fail "MCP_WORKER_TOKEN must contain at least 32 characters"
  case "$MCP_WORKER_TOKEN" in
    replace-with-a-long-random-secret)
      fail "Replace the MCP_WORKER_TOKEN placeholder"
      ;;
  esac
fi

mkdir -p /app/data /app/uploads "${AI_PRIVATE_DIR:-/app/data/ai}"
npx prisma db push --schema=prisma/schema.prisma --skip-generate
npx tsx prisma/seed.ts
exec node dist/src/index.js
