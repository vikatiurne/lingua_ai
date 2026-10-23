#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "${SKIP_DB_BACKUP:-0}" == "1" ]]; then
  echo "Skipping database backup (SKIP_DB_BACKUP=1)"
  exit 0
fi

if [[ ! -f .env ]]; then
  echo "Root .env not found. Cannot read PostgreSQL credentials." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_USER:?POSTGRES_USER is not set in .env}"
: "${POSTGRES_DB:?POSTGRES_DB is not set in .env}"

backup_dir="backups"
mkdir -p "$backup_dir"

timestamp="$(date +%Y%m%d_%H%M%S)"
file="$backup_dir/${POSTGRES_DB}_${timestamp}.sql"

if ! docker compose ps postgres --status running --quiet | grep -q .; then
  echo "Postgres container is not running. Start it with: docker compose up -d postgres" >&2
  exit 1
fi

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$file"

if [[ ! -s "$file" ]]; then
  echo "Backup file is empty: $file" >&2
  rm -f "$file"
  exit 1
fi

find "$backup_dir" -maxdepth 1 -name '*.sql' -type f | sort -r | tail -n +11 | while IFS= read -r old; do
  rm -f "$old"
done

echo "Backup created: $file"
