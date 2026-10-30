#!/usr/bin/env bash
set -Eeuo pipefail

cd /opt/jp-portal
umask 077
image="${1:?pass the immutable GHCR image tag}"
[[ "$image" =~ ^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+:[0-9a-f]{40}$ ]] || { echo 'Invalid image tag' >&2; exit 1; }
test -f .env || { echo 'Missing /opt/jp-portal/.env' >&2; exit 1; }
test -f portal.env || { echo 'Missing /opt/jp-portal/portal.env' >&2; exit 1; }
export APP_IMAGE="$image"

previous="$(docker compose -f compose.yaml ps -q app | xargs -r docker inspect --format '{{.Config.Image}}' 2>/dev/null || true)"
rollback() {
  if [[ -n "$previous" ]]; then
    echo "Deployment failed; restoring app image $previous" >&2
    export APP_IMAGE="$previous"
    docker compose -f compose.yaml up -d --no-deps app || true
  fi
}
trap rollback ERR

docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml pull app db caddy
docker compose -f compose.yaml up -d --wait db

# A fresh dump is retained on the VM before every migration. Copy backups off the VM too.
mkdir -p backups
docker compose -f compose.yaml exec -T db pg_dump -U portal -d portal -Fc > "backups/predeploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose -f compose.yaml run --rm --no-deps app node backend/src/db/migrate.js
docker compose -f compose.yaml up -d --no-deps app

for attempt in {1..30}; do
  container="$(docker compose -f compose.yaml ps -q app)"
  if [[ -n "$container" && "$(docker inspect --format '{{.State.Health.Status}}' "$container")" == healthy ]]; then
    docker compose -f compose.yaml up -d --no-deps caddy
    docker compose -f compose.yaml exec -T caddy caddy reload --config /etc/caddy/Caddyfile
    printf '%s\n' "$image" > current-image
    trap - ERR
    echo "Deployed $image"
    exit 0
  fi
  sleep 3
done

docker compose -f compose.yaml logs --tail=100 app >&2
false
