#!/usr/bin/env bash
# ---------------------------------------------------------------
# دیپلوی از راه دور روی سرور پرده آنتیک
#
#   ./scripts/deploy-remote.sh                      # سرور پیش‌فرض، شاخه dev
#   ./scripts/deploy-remote.sh 62.60.166.93 prod
#
# سرور: cd /var/www/antic && git pull origin dev && ./scripts/deploy.sh
# ---------------------------------------------------------------
set -euo pipefail

HOST="${1:-${ANTIC_DEPLOY_HOST:-62.60.166.93}}"
BRANCH="${2:-${ANTIC_DEPLOY_BRANCH:-dev}}"
USER="${ANTIC_DEPLOY_USER:-root}"
ROOT="${ANTIC_ROOT:-/var/www/antic}"
SSH_OPTS="-o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=15"

echo "==> دیپلوی $BRANCH روی $USER@$HOST:$ROOT"

ssh $SSH_OPTS "$USER@$HOST" \
  "cd '$ROOT' && git checkout '$BRANCH' && git pull --ff-only origin '$BRANCH' && bash ./scripts/deploy.sh '$BRANCH'"

echo "==> تمام. بررسی:"
echo "    curl -sI https://pardehantic.ir/ | head -1"
echo "    curl -s  https://pardehantic.ir/api/health"
