#!/usr/bin/env bash
# Restores a database dump (and optionally media) produced by backup.sh. DESTRUCTIVE: replaces current data.
#   ./deploy/restore.sh /var/backups/portfolio/db-20261008T030000Z.dump [/var/backups/portfolio/uploads-....tar.gz]
# Practise this on a staging copy first. See docs/DEPLOYMENT.md#restore.
set -euo pipefail
export COMPOSE_ENV_FILES=${COMPOSE_ENV_FILES:-.env.production}

dump=${1:?usage: restore.sh <db.dump> [uploads.tar.gz]}
uploads=${2:-}
[[ -f "$dump" ]] || { echo "No such file: $dump" >&2; exit 1; }

read -r -p "This replaces the production database with $dump. Type RESTORE to continue: " answer
[[ "$answer" == "RESTORE" ]] || { echo "Aborted."; exit 1; }

docker compose stop app
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < "$dump"

if [[ -n "$uploads" ]]; then
  docker compose run --rm --no-deps --user root -v "$(dirname "$uploads")":/backup --entrypoint sh app \
    -c "rm -rf /app/storage/uploads/* && tar -xzf /backup/$(basename "$uploads") -C /app/storage"
fi

docker compose run --rm migrate
docker compose start app
echo "Restore complete. Check https://<domain>/api/health and the admin dashboard."
