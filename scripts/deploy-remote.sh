#!/usr/bin/env bash
# ---------------------------------------------------------------
# دیپلوی از راه دور روی سرور پرده آنتیک
#
#   ./scripts/deploy-remote.sh                      # سرور پیش‌فرض، شاخه dev
#   ./scripts/deploy-remote.sh 62.60.166.93 prod
#
# اگر سرور با پسورد (نه کلید) دسترسی دارد:
#   ANTIC_DEPLOY_PASSWORD='...' ./scripts/deploy-remote.sh 62.60.166.93 main
#
# نکته: اگر SSH روی پورت 22 به GitHub گیر می‌کند، روی سرور این را بزنید:
#   git config --global url."ssh://git@ssh.github.com:443/".insteadOf "git@github.com:"
# ---------------------------------------------------------------
set -euo pipefail

HOST="${1:-${ANTIC_DEPLOY_HOST:-62.60.166.93}}"
BRANCH="${2:-${ANTIC_DEPLOY_BRANCH:-dev}}"
USER="${ANTIC_DEPLOY_USER:-root}"
ROOT="${ANTIC_ROOT:-/var/www/antic}"
PASSWORD="${ANTIC_DEPLOY_PASSWORD:-}"
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/root/.ssh/known_hosts -o ConnectTimeout=20 -o ServerAliveInterval=15"

echo "==> دیپلوی $BRANCH روی $USER@$HOST:$ROOT"

REMOTE_CMD="cd '$ROOT' && git checkout '$BRANCH' && git pull --ff-only origin '$BRANCH' && bash ./scripts/deploy.sh '$BRANCH'"

if [[ -n "$PASSWORD" ]]; then
  command -v sshpass >/dev/null 2>&1 || { echo "!! sshpass نصب نیست"; exit 1; }
  # BatchMode=yes با پسورد سازگار نیست
  SSH_OPTS="${SSH_OPTS/-o BatchMode=yes/}"
  sshpass -p "$PASSWORD" ssh $SSH_OPTS "$USER@$HOST" "$REMOTE_CMD"
else
  ssh -o BatchMode=yes $SSH_OPTS "$USER@$HOST" "$REMOTE_CMD"
fi

echo "==> تمام. بررسی:"
echo "    curl -sI https://pardehantic.ir/ | head -1"
echo "    curl -s  https://pardehantic.ir/api/health"
