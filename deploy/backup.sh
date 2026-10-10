#!/usr/bin/env bash
# Nightly backup of the database and uploaded media. Run on the VPS from the repo directory:
#   0 3 * * * cd /opt/portfolio && ./deploy/backup.sh >> /var/log/portfolio-backup.log 2>&1
# Copy BACKUP_DIR off the server (rclone/restic to object storage); a backup on the same disk is not a backup.
set -euo pipefail
export COMPOSE_ENV_FILES=${COMPOSE_ENV_FILES:-.env.production}

BACKUP_DIR=${BACKUP_DIR:-/var/backups/portfolio}
KEEP_DAYS=${KEEP_DAYS:-14}
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Custom-format dump: compressed, restorable table by table.
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' \
  > "$BACKUP_DIR/db-$stamp.dump"

docker compose run --rm --no-deps --user root -v "$BACKUP_DIR":/backup --entrypoint sh app \
  -c "tar -czf /backup/uploads-$stamp.tar.gz -C /app/storage uploads"

find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete
echo "Backup complete: $stamp"
