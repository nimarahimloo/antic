#!/usr/bin/env bash
# One-command deploy for Pardehantic (antic) — run from repo root on the `dev` branch.
# Usage:
#   ./scripts/deploy.sh
#   DEPLOY_HOST=user@your-server.com DEPLOY_PATH=/var/www/pardehantic ./scripts/deploy.sh
#
# Required (set in environment or in a local .env.deploy file — never commit secrets):
#   DEPLOY_HOST   e.g. root@123.45.67.89  or  deploy@pardehantic.ir
#   DEPLOY_PATH   absolute path on the server where the app lives, e.g. /var/www/pardehantic
#
# Optional:
#   DEPLOY_SSH_KEY   path to private key (default: ssh agent / ~/.ssh/id_*)
#   DEPLOY_BRANCH    default: dev
#   SKIP_BUILD=1     skip local frontend build (use only if dist/ is already good)
#   RESTART_CMD      command run on server after sync (default: pm2 restart antic || systemctl restart antic)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Load local overrides (gitignored)
if [[ -f .env.deploy ]]; then
  # shellcheck disable=SC1091
  source .env.deploy
fi

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-dev}"
RESTART_CMD="${RESTART_CMD:-pm2 restart antic || systemctl restart antic || true}"

if [[ -z "$DEPLOY_HOST" || -z "$DEPLOY_PATH" ]]; then
  echo "ERROR: DEPLOY_HOST and DEPLOY_PATH must be set."
  echo "Example:"
  echo "  export DEPLOY_HOST=deploy@your-server.ir"
  echo "  export DEPLOY_PATH=/var/www/pardehantic"
  echo "  ./scripts/deploy.sh"
  echo ""
  echo "Or create a gitignored .env.deploy file with those variables."
  exit 1
fi

# Safety: only deploy from the allowed branch
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]]; then
  echo "ERROR: You are on branch '$CURRENT_BRANCH'. Deploy only from '$DEPLOY_BRANCH'."
  echo "  git checkout $DEPLOY_BRANCH && git pull origin $DEPLOY_BRANCH"
  exit 1
fi

echo "==> Branch: $CURRENT_BRANCH"
echo "==> Target: $DEPLOY_HOST:$DEPLOY_PATH"

# 1. Frontend build
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "==> Building frontend (vite)..."
  npm ci --prefer-offline --no-audit --no-fund
  npm run build
else
  echo "==> SKIP_BUILD=1 — using existing dist/"
  [[ -d dist ]] || { echo "ERROR: dist/ missing"; exit 1; }
fi

# 2. Backend deps check (local, just to fail early)
echo "==> Checking backend package files..."
[[ -f backend/package.json ]] || { echo "ERROR: backend/package.json missing"; exit 1; }

# 3. Rsync
RSYNC_SSH=(ssh -o StrictHostKeyChecking=accept-new)
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  RSYNC_SSH+=(-i "$DEPLOY_SSH_KEY")
fi

RSYNC_EXCLUDES=(
  --exclude node_modules
  --exclude .git
  --exclude .env
  --exclude .env.*
  --exclude backend/dev.db
  --exclude backend/dev.db-journal
  --exclude backend/uploads
  --exclude dist-ssr
  --exclude .vite
  --exclude coverage
  --exclude '*.log'
  --exclude .DS_Store
  --exclude .env.deploy
)

echo "==> Syncing files..."
rsync -avz --delete \
  "${RSYNC_EXCLUDES[@]}" \
  -e "${RSYNC_SSH[*]}" \
  ./ "$DEPLOY_HOST:$DEPLOY_PATH/"

# 4. Remote install + migrate + restart
echo "==> Remote install, prisma, restart..."
ssh "${RSYNC_SSH[@]:1}" "$DEPLOY_HOST" bash -s <<REMOTE
set -euo pipefail
cd "$DEPLOY_PATH"

# Frontend is already built (dist/)
# Backend
cd backend
npm ci --prefer-offline --no-audit --no-fund --omit=dev || npm install --omit=dev
npx prisma generate
npx prisma db push
# optional seed only on first deploy — leave commented
# npx tsx prisma/seed.ts

cd ..
# Restart process manager
$RESTART_CMD

# Optional post-deploy hook (chroma, caches, …)
if [[ -f backend/package.json ]] && grep -q '"postdeploy"' backend/package.json; then
  (cd backend && npm run postdeploy) || true
fi

echo "Remote steps finished."
REMOTE

echo ""
echo "==> Deploy complete → $DEPLOY_HOST:$DEPLOY_PATH"
echo "    Check health: curl -sS https://pardehantic.ir/api/health  (or your domain)"
