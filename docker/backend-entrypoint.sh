#!/bin/sh
# Brings the API container up: prepare the data volume, apply pending migrations,
# optionally seed, then hand over to the process in CMD.
set -e

log() { echo "[entrypoint] $*"; }

# ---------------------------------------------------------------- data volume
# STORAGE_ROOT lives on the bind-mounted HDD. Create the per-category folders on
# every boot so a fresh volume works with no manual setup.
STORAGE_ROOT="${STORAGE_ROOT:-/data/storage}"
for sub in cases tasks reports profiles board; do
  mkdir -p "$STORAGE_ROOT/$sub"
done
[ -n "$LOG_DIR" ] && mkdir -p "$LOG_DIR"
log "storage root: $STORAGE_ROOT"

# ----------------------------------------------------------------- migrations
# compose gates us behind the database healthcheck, but a healthy Postgres can
# still refuse the first connection or two while it finishes starting up.
log "applying database migrations"
attempt=1
until npx prisma migrate deploy; do
  if [ "$attempt" -ge 10 ]; then
    log "migrations failed after $attempt attempts, giving up"
    exit 1
  fi
  log "migration attempt $attempt failed, retrying in 3s"
  attempt=$((attempt + 1))
  sleep 3
done
log "migrations up to date"

# ----------------------------------------------------------------------- seed
# Off by default. Seeding is idempotent (upserts), but it creates well-known demo
# accounts, so it must never run unattended on a production database.
if [ "$SEED_ON_START" = "true" ]; then
  log "SEED_ON_START=true, seeding database"
  node dist/seed.js || log "seed failed, continuing anyway"
fi

log "starting: $*"
exec "$@"
