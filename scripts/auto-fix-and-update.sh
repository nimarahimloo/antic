#!/usr/bin/env bash
# Auto-fix and update script — runs when main branch is updated.
# Executes all project fix agents (lint, typecheck, tests) and updates
# AGENTS.md and README.md if anything changed.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=============================================="
echo "  Auto-fix & Update — main branch changed"
echo "=============================================="

# --- Helper: check if a command exists ---
have() { command -v "$1" >/dev/null 2>&1; }

# --- 1. Install dependencies ---
echo "[1/6] Installing dependencies (bun)..."
if have bun; then
  bun install --frozen-lockfile 2>/dev/null || bun install
  (cd backend && bun install --frozen-lockfile 2>/dev/null || bun install)
else
  echo "ERROR: bun is not installed. Install with: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

# --- 2. Run lint ---
echo "[2/6] Running ESLint..."
if bun run lint > /tmp/lint-output.txt 2>&1; then
  echo "   ✓ Lint passed"
else
  echo "   ✗ Lint failed — showing output:"
  cat /tmp/lint-output.txt
  exit 1
fi

# --- 3. Run typecheck (frontend + backend) ---
echo "[3/6] Running TypeScript typecheck..."
if bun run typecheck > /tmp/typecheck-frontend.txt 2>&1; then
  echo "   ✓ Frontend typecheck passed"
else
  echo "   ✗ Frontend typecheck failed:"
  cat /tmp/typecheck-frontend.txt
  exit 1
fi

if (cd backend && bun run typecheck > /tmp/typecheck-backend.txt 2>&1); then
  echo "   ✓ Backend typecheck passed"
else
  echo "   ✗ Backend typecheck failed:"
  cat /tmp/typecheck-backend.txt
  exit 1
fi

# --- 4. Run backend tests ---
echo "[4/6] Running backend tests..."
if (cd backend && bun run test > /tmp/backend-tests.txt 2>&1); then
  echo "   ✓ Backend tests passed"
else
  echo "   ✗ Backend tests failed:"
  cat /tmp/backend-tests.txt
  exit 1
fi

# --- 5. Run frontend functional tests ---
echo "[5/6] Running frontend functional tests..."
if node --test tests/functional/categoryTree.test.ts tests/functional/installCategories.test.ts tests/functional/curtainStyleResolve.test.ts > /tmp/frontend-tests.txt 2>&1; then
  echo "   ✓ Frontend functional tests passed"
else
  echo "   ✗ Frontend functional tests failed:"
  cat /tmp/frontend-tests.txt
  exit 1
fi

# --- 6. Run E2E tests (requires servers) ---
echo "[6/6] Running E2E tests (Playwright Chromium)..."
# Start backend if not running
if ! curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
  echo "   Starting backend server..."
  (cd backend && bun run dev > /tmp/backend-dev.log 2>&1 &)
  # Wait for backend to be ready
  for i in $(seq 1 30); do
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
      echo "   ✓ Backend is ready"
      break
    fi
    sleep 2
  done
fi

if npx playwright test --workers=1 --project=chromium > /tmp/e2e-tests.txt 2>&1; then
  echo "   ✓ E2E tests passed"
else
  echo "   ✗ E2E tests failed:"
  cat /tmp/e2e-tests.txt
  exit 1
fi

echo ""
echo "=============================================="
echo "  All fix agents passed successfully"
echo "=============================================="

# --- Update AGENTS.md ---
echo ""
echo "Updating AGENTS.md..."
if [ -f scripts/update-agents-md.js ]; then
  node scripts/update-agents-md.js || echo "   ⚠ AGENTS.md update script had non-fatal issues"
else
  echo "   ⚠ scripts/update-agents-md.js not found — skipping AGENTS.md update"
fi

# --- Update README.md ---
echo ""
echo "Updating README.md..."
if [ -f scripts/update-readme-md.js ]; then
  node scripts/update-readme-md.js || echo "   ⚠ README.md update script had non-fatal issues"
else
  echo "   ⚠ scripts/update-readme-md.js not found — skipping README.md update"
fi

echo ""
echo "=============================================="
echo "  Auto-fix & Update complete"
echo "=============================================="