#!/bin/bash
# Deploys the committed HEAD of this branch to multi-tenant.stepanok.com.
#
# Packs only what the image needs, uploads it to /opt/openedx-multitenant-demo and rebuilds the
# container. The server's data/ (database, uploads, the APK) and .env.multitenant stay as they
# are. Uncommitted changes are not deployed.
#
#   deploy/multi-tenant/deploy.sh
#   DEPLOY_KEY=/path/to/key deploy/multi-tenant/deploy.sh
set -euo pipefail
KEY=${DEPLOY_KEY:?Set DEPLOY_KEY}
HOST=${DEPLOY_HOST:?Set DEPLOY_HOST}
DIR=/opt/openedx-multitenant-demo
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

git -C "$ROOT" archive HEAD | tar -x -C "$WORK"
cp "$WORK/deploy/multi-tenant/docker-compose.yml" "$WORK/docker-compose.yml"
git -C "$ROOT" rev-parse --short HEAD > "$WORK/REVISION"
(cd "$WORK" && tar -czf bundle.tgz app landing deploy Dockerfile requirements.txt run.py docker-compose.yml .dockerignore REVISION)

scp -q -o BatchMode=yes -i "$KEY" "$WORK/bundle.tgz" "$HOST:$DIR/"
ssh -o BatchMode=yes -i "$KEY" "$HOST" "cd $DIR && tar -xzf bundle.tgz && rm bundle.tgz && docker compose up -d --build 2>&1 | tail -1 && echo \"deployed \$(cat REVISION)\""

for _ in $(seq 1 20); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' https://multi-tenant.stepanok.com/)" = 200 ] && { echo "site is up"; exit 0; }
  sleep 3
done
echo "site did not come back within a minute" >&2
exit 1
