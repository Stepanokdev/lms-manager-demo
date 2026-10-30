#!/bin/bash
# Deploys the committed HEAD of this branch to multi-tenant.stepanok.com.
#
# Packs only what the image needs, uploads it to /opt/openedx-multitenant-demo and rebuilds the
# container. The server's data/ (database, uploads, the APK) and .env.multitenant stay as they
# are. Uncommitted changes are not deployed.
#
#   DEPLOY_HOST=deploy@example.com DEPLOY_KEY=/path/to/key \
#     deploy/multi-tenant/deploy.sh
set -euo pipefail
: "${DEPLOY_HOST:?Set DEPLOY_HOST to the SSH user@host for this deployment}"
: "${DEPLOY_KEY:?Set DEPLOY_KEY to the path of your SSH private key}"
KEY=$DEPLOY_KEY
HOST=$DEPLOY_HOST
HEALTH_URL=${DEPLOY_HEALTH_URL:-https://multi-tenant.stepanok.com/}
DIR=/opt/openedx-multitenant-demo
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

git -C "$ROOT" archive HEAD | tar -x -C "$WORK"
cp "$WORK/deploy/multi-tenant/docker-compose.yml" "$WORK/docker-compose.yml"
git -C "$ROOT" rev-parse --short HEAD > "$WORK/REVISION"
(cd "$WORK" && tar -czf bundle.tgz app landing deploy licenses LICENSE THIRD_PARTY_NOTICES.md Dockerfile requirements.txt run.py docker-compose.yml .dockerignore REVISION)

scp -q -o BatchMode=yes -i "$KEY" "$WORK/bundle.tgz" "$HOST:$DIR/"
ssh -o BatchMode=yes -i "$KEY" "$HOST" "cd $DIR && tar -xzf bundle.tgz && rm bundle.tgz && docker compose up -d --build 2>&1 | tail -1 && echo \"deployed \$(cat REVISION)\""

for _ in $(seq 1 20); do
  [ "$(curl --max-time 10 -s -o /dev/null -w '%{http_code}' "$HEALTH_URL")" = 200 ] && { echo "site is up"; exit 0; }
  sleep 3
done
echo "site did not come back within a minute" >&2
exit 1
