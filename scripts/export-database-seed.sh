#!/bin/sh
# Refresh seed/database.sql from the running Postgres container.
set -e
cd "$(dirname "$0")/.."
docker compose exec -T db pg_dump -U casedesk --no-owner --no-acl casedesk -f /tmp/casedesk.sql
docker compose cp db:/tmp/casedesk.sql seed/database.sql
docker compose exec -T db rm -f /tmp/casedesk.sql
echo "Wrote seed/database.sql"
